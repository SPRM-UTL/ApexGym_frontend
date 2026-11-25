import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { notifications } from '@mantine/notifications';
import { appUrl, esUsuarioCliente } from '../scripts/constantes.js';
import { api } from '../scripts/services/api.js';
import { httpClient, verificarAlcanzabilidadApi } from '../scripts/services/httpClient.js';
import { useSucursal } from './SucursalContext.jsx';
import {
  CATALOGOS_VENTA_OFFLINE,
  describirAlmacenamientoOffline,
  emitirEventoOffline,
  guardarMeta,
  guardarVentaOfflineDb,
  inventariarCatalogosVenta,
  obtenerApiCache,
  obtenerMeta,
  obtenerResumenDatosLocales,
  probarAlmacenamientoOffline,
  purgarApiCacheAntigua,
  sincronizarAlcanceUsuarioOffline,
} from '../utils/offline/offlineDb.js';
import {
  construirPayloadSincronizacionOffline,
  exportarPaqueteVentasOffline,
  importarPaqueteVentasEnDb,
  listarVentasOffline,
  marcarVentasSincronizadas,
} from '../utils/offline/offlineSales.js';

const RESUMEN_INICIAL = {
  sucursalId: 1,
  hayDatosLocales: false,
  totalEntradas: 0,
  colecciones: 0,
  nombresColecciones: [],
  ultimaActualizacion: null,
};

// Catálogos mínimos para poder cobrar sin conexión: sin ellos la venta offline no se puede iniciar
const CLAVES_CRITICAS_CACHE = [
  ...CATALOGOS_VENTA_OFFLINE.map((catalogo) => catalogo.url),
];

// Cada cuánto se refresca la copia local de catálogos mientras hay conexión
const INTERVALO_REFRESCO_CACHE_MS = 10 * 60 * 1000;

// Estados que ya no se reintentan ni cuentan como pendientes
const ESTADOS_FINALES_OFFLINE = ['SINCRONIZADA', 'DESCARTADA'];

async function necesitaActualizarCache(sucursalId, resumen) {
  if (!resumen.hayDatosLocales) return true;

  const criticos = await Promise.all(
    CLAVES_CRITICAS_CACHE.map((url) => obtenerApiCache(sucursalId, url))
  );
  if (criticos.some((entrada) => !entrada)) return true;

  const meta = await obtenerMeta(`ultima_sync_sucursal_${sucursalId}`);
  const fecha = meta?.fecha ? Date.parse(meta.fecha) : NaN;
  if (!Number.isFinite(fecha)) return true;

  return Date.now() - fecha > INTERVALO_REFRESCO_CACHE_MS;
}

// Estado del service worker: es quien sirve la app y los catálogos sin conexión
const SW_INICIAL = { estado: 'sin-revisar', detalle: null, alcance: null };

async function consultarEstadoServiceWorker() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return {
      estado: 'no-soportado',
      detalle: 'Este navegador o contexto (por ejemplo incógnito) no permite service workers.',
      alcance: null,
    };
  }

  try {
    const registro = await navigator.serviceWorker.getRegistration();
    if (!registro) {
      return {
        estado: 'no-registrado',
        detalle: 'El service worker aún no se registró. Recarga la página; el registro ocurre al cargar la app.',
        alcance: null,
      };
    }
    if (registro.active?.state === 'activated') {
      return { estado: 'activo', detalle: `Alcance: ${registro.scope}`, alcance: registro.scope };
    }
    if (registro.installing) {
      return { estado: 'instalando', detalle: 'Instalando el service worker por primera vez.', alcance: registro.scope };
    }
    if (registro.waiting) {
      return {
        estado: 'esperando-actualizacion',
        detalle: 'Hay una versión nueva esperando; recarga para activarla.',
        alcance: registro.scope,
      };
    }
    return { estado: 'registrado', detalle: 'Registrado, sin controlar la página todavía.', alcance: registro.scope };
  } catch (error) {
    return {
      estado: 'error',
      detalle: error?.message || 'No se pudo consultar el service worker.',
      alcance: null,
    };
  }
}

const OfflineContext = createContext({
  isOnline: true,
  apiAlcanzable: true,
  sincronizando: false,
  almacenamiento: { modo: 'desconocido', memoria: false, motivo: null },
  estadoServiceWorker: SW_INICIAL,
  diagnosticoOffline: null,
  ejecutarDiagnostico: async () => null,
  datosLocales: RESUMEN_INICIAL,
  ventasOffline: [],
  ventasPendientes: [],
  ventasPendientesTotales: 0,
  ultimoErrorSync: null,
  refrescarEstadoLocal: async () => {},
  sincronizarAhora: async () => ({ ok: false }),
  verificarConexionApi: async () => false,
  descartarVentaOffline: async () => false,
  reintentarVentaOffline: async () => false,
  exportarVentasOffline: () => false,
  importarVentasOffline: async () => null,
});

function extraerUuidsResultado(lista = []) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => (typeof item === 'string' ? item : item?.uuidIdempotencia))
    .filter(Boolean)
    .map(String);
}

export function OfflineProvider({ estaLogeadoEn, children }) {
  const { sucursalActiva } = useSucursal();
  const sucursalId = Number(sucursalActiva?.id || 1);

  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  ));
  const [apiAlcanzable, setApiAlcanzable] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [datosLocales, setDatosLocales] = useState({
    ...RESUMEN_INICIAL,
    sucursalId,
  });
  const [ventasOffline, setVentasOffline] = useState([]);
  const [ultimoErrorSync, setUltimoErrorSync] = useState(null);
  const [almacenamiento, setAlmacenamiento] = useState(() => describirAlmacenamientoOffline());
  const [estadoServiceWorker, setEstadoServiceWorker] = useState(SW_INICIAL);
  const [diagnosticoOffline, setDiagnosticoOffline] = useState(null);

  // Derivados de las ventas: deben declararse antes de los efectos que los usan como dependencia
  const ventasPendientes = useMemo(
    () => ventasOffline.filter(
      (v) => !ESTADOS_FINALES_OFFLINE.includes(v.estadoSync) && Number(v.sucursalId || 1) === sucursalId
    ),
    [ventasOffline, sucursalId]
  );

  const ventasPendientesTotales = useMemo(
    () => ventasOffline.filter((v) => !ESTADOS_FINALES_OFFLINE.includes(v.estadoSync)).length,
    [ventasOffline]
  );

  const sincronizandoRef = useRef(false);
  const sucursalIdRef = useRef(sucursalId);
  sucursalIdRef.current = sucursalId;

  const refrescarEstadoLocal = useCallback(async (idObjetivo = sucursalIdRef.current) => {
    const [resumen, todasVentas] = await Promise.all([
      obtenerResumenDatosLocales(idObjetivo),
      listarVentasOffline({ soloPendientes: false }),
    ]);
    setDatosLocales(resumen);
    setVentasOffline(todasVentas);
    setAlmacenamiento(describirAlmacenamientoOffline());
    return { resumen, todasVentas };
  }, []);

  const sincronizarVentasPendientes = useCallback(async () => {
    const pendientes = await listarVentasOffline({ soloPendientes: true });
    if (pendientes.length === 0) {
      return { sincronizadas: 0, duplicadas: 0, errores: [] };
    }

    const porSucursal = new Map();
    for (const venta of pendientes) {
      const sucKey = Number(venta.sucursalId || 1);
      if (!porSucursal.has(sucKey)) porSucursal.set(sucKey, []);
      porSucursal.get(sucKey).push(venta);
    }

    let totalSincronizadas = 0;
    let totalDuplicadas = 0;
    const todosErrores = [];

    for (const [sucId, loteCompleto] of porSucursal.entries()) {
      for (let i = 0; i < loteCompleto.length; i += 100) {
        const lote = loteCompleto.slice(i, i + 100);
        const payload = construirPayloadSincronizacionOffline(lote);

        let body = {};
        let responseFlagOk = false;
        try {
          const respuesta = await httpClient.post(
            `${appUrl}/api/ventas/sincronizar-offline`,
            payload,
            { headers: { 'x-sucursal-id': String(sucId) } }
          );
          body = respuesta?.data?.data ?? respuesta?.data ?? {};
          responseFlagOk = respuesta?.data?.responseFlag === 0;
        } catch (errPost) {
          const dataError = errPost?.response?.data;
          if (!dataError || typeof dataError !== 'object') {
            throw errPost;
          }
          body = dataError?.data ?? dataError;
          if (!Array.isArray(body?.sincronizadas) && !Array.isArray(body?.duplicadas) && !Array.isArray(body?.errores)) {
            throw new Error(dataError?.message || errPost.message || 'Error al sincronizar ventas offline');
          }
        }

        const uuidsSinc = extraerUuidsResultado(body.sincronizadas);
        const uuidsDup = extraerUuidsResultado(body.duplicadas);
        const erroresLote = Array.isArray(body.errores) ? body.errores : [];

        const uuidsCompletados = new Set([...uuidsSinc, ...uuidsDup]);
        if (uuidsCompletados.size === 0 && erroresLote.length === 0 && responseFlagOk) {
          for (const v of lote) uuidsCompletados.add(v.uuidIdempotencia);
        }

        if (uuidsCompletados.size > 0) {
          await marcarVentasSincronizadas(Array.from(uuidsCompletados));
        }

        for (const errItem of erroresLote) {
          const uuid = String(errItem?.uuidIdempotencia ?? '');
          const ventaOriginal = lote.find((v) => v.uuidIdempotencia === uuid);
          if (ventaOriginal) {
            await guardarVentaOfflineDb({
              ...ventaOriginal,
              estadoSync: 'ERROR',
              ultimoError: errItem?.error || errItem?.message || 'Error al sincronizar venta',
            });
          }
          todosErrores.push(errItem);
        }

        totalSincronizadas += uuidsSinc.length || (erroresLote.length === 0 ? uuidsCompletados.size - uuidsDup.length : 0);
        totalDuplicadas += uuidsDup.length;
      }
    }

    if (totalSincronizadas > 0 || totalDuplicadas > 0) {
      emitirEventoOffline('apexgym:ventas-sincronizadas', {
        sincronizadas: totalSincronizadas,
        duplicadas: totalDuplicadas,
      });
    }

    return {
      sincronizadas: totalSincronizadas,
      duplicadas: totalDuplicadas,
      errores: todosErrores,
    };
  }, []);

  const precachearCatalogosSucursal = useCallback(async (idSucursal) => {
    const peticiones = esUsuarioCliente()
      ? [
          api.cliente.obtenerMiPerfil(),
          api.clienteMembresia.obtenerMiMembresia(),
          api.asistencia.obtenerMiQr(),
          api.notificacion.obtenerTodas(),
          api.venta.obtenerTodos({ pagina: 1, limite: 10 }),
          api.metodosPago.obtenerActivos(),
        ]
      : [
          api.seccion.obtenerMisSecciones(),
          api.sucursal.obtenerTodos(),
          api.empresa.obtenerActual(),
          api.aperturaCaja.obtenerAbiertas(),
          api.caja.obtenerTodos(),
          api.metodosPago.obtenerActivos(),
          api.categoriaProducto.obtenerParaVenta(),
          api.categoriaProducto.obtenerTodas(),
          api.producto.obtenerDisponiblesParaVenta(idSucursal),
          api.producto.obtenerTodos(),
          api.servicio.obtenerDisponiblesParaVenta(idSucursal),
          api.servicio.obtenerTodos(),
          api.tipoMembresia.obtenerDisponiblesParaVenta(idSucursal),
          api.tipoMembresia.obtenerTodos(),
          api.pedidoCompra.obtenerTodos('PENDIENTE'),
          api.cliente.buscarPorNombreOId('Público General', 1, 5),
          api.cliente.obtenerTodos(),
          api.empleado.obtenerTodos(),
          // Catálogos auxiliares que consultan los formularios de Empleados y Clientes
          api.areaTrabajo.obtenerTodos(),
          api.puesto.obtenerTodos(),
          api.estadoEmpleado.obtenerTodos(),
          api.estadoCliente.obtenerTodos(),
          api.user.obtenerTodos(),
          api.aperturaCaja.obtenerTodos(),
          api.almacen.obtenerTodos(),
          api.venta.obtenerTodos({ pagina: 1, limite: 10 }),
          api.venta.obtenerResumen({}),
        ];

    const resultados = await Promise.allSettled(peticiones);
    const exitosas = resultados.filter((r) => r.status === 'fulfilled').length;

    if (exitosas > 0) {
      await guardarMeta(`ultima_sync_sucursal_${idSucursal}`, {
        fecha: new Date().toISOString(),
        coleccionesPrecacheadas: exitosas,
      });
    }

    return exitosas;
  }, []);

  const sincronizarAhora = useCallback(async ({ silencioso = false } = {}) => {
    if (!estaLogeadoEn) {
      return { ok: false, motivo: 'no-autenticado' };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (!silencioso) {
        notifications.show({
          color: 'yellow',
          title: 'Sin conexión a internet',
          message: 'Conéctate a la red para sincronizar catálogos y ventas pendientes.',
        });
      }
      return { ok: false, motivo: 'offline' };
    }
    if (sincronizandoRef.current) {
      return { ok: false, motivo: 'en-progreso' };
    }

    sincronizandoRef.current = true;
    setSincronizando(true);
    setUltimoErrorSync(null);

    try {
      const resultadoVentas = await sincronizarVentasPendientes();
      const coleccionesOk = await precachearCatalogosSucursal(sucursalIdRef.current);
      const estadoActualizado = await refrescarEstadoLocal(sucursalIdRef.current);

      if (!silencioso) {
        const msgVentas = resultadoVentas.sincronizadas > 0 || resultadoVentas.duplicadas > 0
          ? ` Ventas sincronizadas: ${resultadoVentas.sincronizadas}${resultadoVentas.duplicadas ? ` (${resultadoVentas.duplicadas} duplicadas omitidas)` : ''}.`
          : '';
        notifications.show({
          color: resultadoVentas.errores.length > 0 ? 'yellow' : 'green',
          title: 'Sincronización completada',
          message: `Datos locales actualizados (${estadoActualizado.resumen.colecciones} colecciones, ${coleccionesOk} consultas).${msgVentas}`,
        });
      } else if (resultadoVentas.sincronizadas > 0) {
        notifications.show({
          color: 'green',
          title: 'Ventas offline sincronizadas',
          message: `Se sincronizaron ${resultadoVentas.sincronizadas} venta(s) en efectivo al recuperar la conexión.`,
        });
      }

      if (resultadoVentas.errores.length > 0) {
        setUltimoErrorSync(`${resultadoVentas.errores.length} venta(s) offline presentaron error al sincronizar.`);
      }

      return {
        ok: true,
        resultadoVentas,
        coleccionesOk,
      };
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Error al sincronizar datos offline.';
      setUltimoErrorSync(msg);
      if (!silencioso) {
        notifications.show({
          color: 'red',
          title: 'No se pudo completar la sincronización',
          message: msg,
        });
      }
      return { ok: false, error: msg };
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }, [estaLogeadoEn, precachearCatalogosSucursal, refrescarEstadoLocal, sincronizarVentasPendientes]);

  const ejecutarDiagnostico = useCallback(async () => {
    const [sw, pruebaAlmacenamiento, catalogos] = await Promise.all([
      consultarEstadoServiceWorker(),
      probarAlmacenamientoOffline(),
      inventariarCatalogosVenta(sucursalIdRef.current),
    ]);

    const resultado = {
      serviceWorker: sw,
      almacenamiento: pruebaAlmacenamiento,
      catalogos,
      faltantes: catalogos.filter((catalogo) => !catalogo.disponible).length,
      revisadoEn: new Date().toISOString(),
    };

    setEstadoServiceWorker(sw);
    setAlmacenamiento(describirAlmacenamientoOffline());
    setDiagnosticoOffline(resultado);
    return resultado;
  }, []);

  const verificarConexionApi = useCallback(async () => {
    const alcanzable = await verificarAlcanzabilidadApi();
    setIsOnline(alcanzable);
    setApiAlcanzable(alcanzable);
    return alcanzable;
  }, []);

  const descartarVentaOffline = useCallback(async (venta, motivo) => {
    if (!venta?.uuidIdempotencia) return false;

    try {
      await guardarVentaOfflineDb({
        ...venta,
        estadoSync: 'DESCARTADA',
        ultimoError: motivo || 'Descartada manualmente',
        descartadaEn: new Date().toISOString(),
      });
      await refrescarEstadoLocal(sucursalIdRef.current);
      notifications.show({
        color: 'orange',
        title: 'Venta offline descartada',
        message: `El folio ${venta.folioLocal} quedó archivado localmente y no se enviará al servidor.`,
      });
      return true;
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo descartar la venta',
        message: error?.message || 'Intenta nuevamente.',
      });
      return false;
    }
  }, [refrescarEstadoLocal]);

  const reintentarVentaOffline = useCallback(async (venta) => {
    if (!venta?.uuidIdempotencia) return false;

    try {
      await guardarVentaOfflineDb({ ...venta, estadoSync: 'PENDIENTE', ultimoError: null });
      await refrescarEstadoLocal(sucursalIdRef.current);
      if (isOnline) await sincronizarAhora({ silencioso: true });
      return true;
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo reintentar la venta',
        message: error?.message || 'Intenta nuevamente.',
      });
      return false;
    }
  }, [isOnline, refrescarEstadoLocal, sincronizarAhora]);

  const exportarVentasOffline = useCallback(() => {
    const pendientes = ventasOffline.filter((v) => !ESTADOS_FINALES_OFFLINE.includes(v.estadoSync));
    if (pendientes.length === 0) {
      notifications.show({
        color: 'yellow',
        message: 'No hay ventas offline pendientes para exportar.',
      });
      return false;
    }

    try {
      const json = exportarPaqueteVentasOffline(pendientes, { sucursalId });
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `apexgym-ventas-offline-s${sucursalId}-${fecha}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notifications.show({
        color: 'green',
        title: 'Paquete exportado',
        message: `Se exportaron ${pendientes.length} venta(s) offline en efectivo con checksum verificable.`,
      });
      return true;
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo exportar',
        message: error?.message || 'Error al generar el archivo JSON.',
      });
      return false;
    }
  }, [sucursalId, ventasOffline]);

  const importarVentasOffline = useCallback(async (archivoOContenido) => {
    if (!archivoOContenido) return null;

    try {
      const texto = typeof archivoOContenido === 'string'
        ? archivoOContenido
        : await archivoOContenido.text();

      const resultado = await importarPaqueteVentasEnDb(texto);
      await refrescarEstadoLocal(sucursalIdRef.current);

      notifications.show({
        color: resultado.nuevas.length > 0 ? 'green' : 'blue',
        title: 'Paquete importado',
        message: `Nuevas: ${resultado.nuevas.length} · Duplicadas omitidas: ${resultado.duplicadas.length}.`,
      });
      return resultado;
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Archivo de ventas no válido',
        message: error?.message || 'No se pudo validar o importar el paquete JSON.',
      });
      return null;
    }
  }, [refrescarEstadoLocal]);

  useEffect(() => {
    const manejarOnline = () => {
      setIsOnline(true);
      if (estaLogeadoEn) {
        sincronizarAhora({ silencioso: true });
      }
    };
    const manejarOffline = () => {
      setIsOnline(false);
    };
    const manejarActualizacionLocal = () => {
      refrescarEstadoLocal(sucursalIdRef.current);
    };
    const manejarApiSinConexion = () => {
      setApiAlcanzable(false);
      setIsOnline(false);
    };
    const manejarApiReconectada = () => {
      setApiAlcanzable(true);
      setIsOnline(true);
    };

    window.addEventListener('online', manejarOnline);
    window.addEventListener('offline', manejarOffline);
    window.addEventListener('apexgym:api-sin-conexion', manejarApiSinConexion);
    window.addEventListener('apexgym:api-reconectada', manejarApiReconectada);
    window.addEventListener('apexgym:offline-cache-updated', manejarActualizacionLocal);
    window.addEventListener('apexgym:offline-ventas-updated', manejarActualizacionLocal);

    return () => {
      window.removeEventListener('online', manejarOnline);
      window.removeEventListener('offline', manejarOffline);
      window.removeEventListener('apexgym:api-sin-conexion', manejarApiSinConexion);
      window.removeEventListener('apexgym:api-reconectada', manejarApiReconectada);
      window.removeEventListener('apexgym:offline-cache-updated', manejarActualizacionLocal);
      window.removeEventListener('apexgym:offline-ventas-updated', manejarActualizacionLocal);
    };
  }, [estaLogeadoEn, refrescarEstadoLocal, sincronizarAhora]);

  useEffect(() => {
    if (!estaLogeadoEn) {
      setDatosLocales({ ...RESUMEN_INICIAL, sucursalId });
      return undefined;
    }

    let activo = true;
    let timer = null;

    sincronizarAlcanceUsuarioOffline();
    purgarApiCacheAntigua({ diasMaximos: 7 }).catch(() => {});
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    refrescarEstadoLocal(sucursalId).then(async ({ resumen, todasVentas }) => {
      if (!activo) return;
      const hayPendientes = todasVentas.some((v) => !ESTADOS_FINALES_OFFLINE.includes(v.estadoSync));
      const desactualizado = isOnline
        ? await necesitaActualizarCache(sucursalId, resumen)
        : false;
      if (activo && isOnline && (hayPendientes || desactualizado)) {
        timer = setTimeout(() => {
          if (activo) sincronizarAhora({ silencioso: true });
        }, 650);
      }
    });

    return () => {
      activo = false;
      if (timer) clearTimeout(timer);
    };
  }, [estaLogeadoEn, sucursalId, isOnline, refrescarEstadoLocal, sincronizarAhora]);

  // Estado visible del service worker: se consulta al cargar y cuando toma el control de la página
  useEffect(() => {
    let activo = true;
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : null;

    const revisar = async () => {
      const estado = await consultarEstadoServiceWorker();
      if (activo) setEstadoServiceWorker(estado);
    };

    revisar();
    const reintento = setTimeout(revisar, 2500);
    sw?.addEventListener?.('controllerchange', revisar);

    return () => {
      activo = false;
      clearTimeout(reintento);
      sw?.removeEventListener?.('controllerchange', revisar);
    };
  }, []);

  // Sondeo de recuperación: hay red pero la API no responde, revisar cada 30 s
  useEffect(() => {
    if (!estaLogeadoEn || isOnline) return undefined;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return undefined;

    const intervalo = setInterval(() => {
      verificarConexionApi();
    }, 30000);

    return () => clearInterval(intervalo);
  }, [estaLogeadoEn, isOnline, verificarConexionApi]);

  // Reintento periódico de ventas pendientes mientras haya conexión con la API
  useEffect(() => {
    if (!estaLogeadoEn || !isOnline || ventasPendientesTotales === 0) return undefined;

    const intervalo = setInterval(() => {
      if (sincronizandoRef.current) return;
      sincronizandoRef.current = true;
      sincronizarVentasPendientes()
        .catch(() => {})
        .finally(() => {
          sincronizandoRef.current = false;
          refrescarEstadoLocal(sucursalIdRef.current);
        });
    }, 60000);

    return () => clearInterval(intervalo);
  }, [
    estaLogeadoEn,
    isOnline,
    ventasPendientesTotales,
    refrescarEstadoLocal,
    sincronizarVentasPendientes,
  ]);

  const valor = useMemo(() => ({
    isOnline,
    apiAlcanzable,
    sincronizando,
    almacenamiento,
    estadoServiceWorker,
    diagnosticoOffline,
    ejecutarDiagnostico,
    datosLocales,
    ventasOffline,
    ventasPendientes,
    ventasPendientesTotales,
    ultimoErrorSync,
    refrescarEstadoLocal,
    sincronizarAhora,
    verificarConexionApi,
    descartarVentaOffline,
    reintentarVentaOffline,
    exportarVentasOffline,
    importarVentasOffline,
  }), [
    isOnline,
    apiAlcanzable,
    sincronizando,
    almacenamiento,
    estadoServiceWorker,
    diagnosticoOffline,
    ejecutarDiagnostico,
    datosLocales,
    ventasOffline,
    ventasPendientes,
    ventasPendientesTotales,
    ultimoErrorSync,
    refrescarEstadoLocal,
    sincronizarAhora,
    verificarConexionApi,
    descartarVentaOffline,
    reintentarVentaOffline,
    exportarVentasOffline,
    importarVentasOffline,
  ]);

  return (
    <OfflineContext.Provider value={valor}>
      {children}
    </OfflineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOffline() {
  return useContext(OfflineContext);
}

export default OfflineContext;
