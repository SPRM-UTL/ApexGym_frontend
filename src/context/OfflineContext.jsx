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
import { httpClient } from '../scripts/services/httpClient.js';
import { useSucursal } from './SucursalContext.jsx';
import {
  emitirEventoOffline,
  guardarMeta,
  guardarVentaOfflineDb,
  obtenerResumenDatosLocales,
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

const OfflineContext = createContext({
  isOnline: true,
  sincronizando: false,
  datosLocales: RESUMEN_INICIAL,
  ventasOffline: [],
  ventasPendientes: [],
  ventasPendientesTotales: 0,
  ultimoErrorSync: null,
  refrescarEstadoLocal: async () => {},
  sincronizarAhora: async () => ({ ok: false }),
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
  const [sincronizando, setSincronizando] = useState(false);
  const [datosLocales, setDatosLocales] = useState({
    ...RESUMEN_INICIAL,
    sucursalId,
  });
  const [ventasOffline, setVentasOffline] = useState([]);
  const [ultimoErrorSync, setUltimoErrorSync] = useState(null);

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
          api.metodosPago.obtenerActivos(),
          api.categoriaProducto.obtenerParaVenta(),
          api.producto.obtenerDisponiblesParaVenta(idSucursal),
          api.servicio.obtenerDisponiblesParaVenta(idSucursal),
          api.tipoMembresia.obtenerDisponiblesParaVenta(idSucursal),
          api.cliente.buscarPorNombreOId('Público General', 1, 5),
          api.cliente.obtenerTodos(),
          api.empleado.obtenerTodos(),
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

  const exportarVentasOffline = useCallback(() => {
    const pendientes = ventasOffline.filter((v) => v.estadoSync !== 'SINCRONIZADA');
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

    window.addEventListener('online', manejarOnline);
    window.addEventListener('offline', manejarOffline);
    window.addEventListener('apexgym:offline-cache-updated', manejarActualizacionLocal);
    window.addEventListener('apexgym:offline-ventas-updated', manejarActualizacionLocal);

    return () => {
      window.removeEventListener('online', manejarOnline);
      window.removeEventListener('offline', manejarOffline);
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

    refrescarEstadoLocal(sucursalId).then(({ resumen, todasVentas }) => {
      if (!activo) return;
      const hayPendientes = todasVentas.some((v) => v.estadoSync !== 'SINCRONIZADA');
      if (isOnline && (!resumen.hayDatosLocales || hayPendientes)) {
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

  const ventasPendientes = useMemo(
    () => ventasOffline.filter(
      (v) => v.estadoSync !== 'SINCRONIZADA' && Number(v.sucursalId || 1) === sucursalId
    ),
    [ventasOffline, sucursalId]
  );

  const ventasPendientesTotales = useMemo(
    () => ventasOffline.filter((v) => v.estadoSync !== 'SINCRONIZADA').length,
    [ventasOffline]
  );

  const valor = useMemo(() => ({
    isOnline,
    sincronizando,
    datosLocales,
    ventasOffline,
    ventasPendientes,
    ventasPendientesTotales,
    ultimoErrorSync,
    refrescarEstadoLocal,
    sincronizarAhora,
    exportarVentasOffline,
    importarVentasOffline,
  }), [
    isOnline,
    sincronizando,
    datosLocales,
    ventasOffline,
    ventasPendientes,
    ventasPendientesTotales,
    ultimoErrorSync,
    refrescarEstadoLocal,
    sincronizarAhora,
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
