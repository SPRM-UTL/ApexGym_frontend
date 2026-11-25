import axios from 'axios';
import { apiLoadingStore } from '../apiLoading.js';
import {
  guardarApiCache,
  normalizarSucursalIdCache,
  obtenerApiCache,
} from '../../utils/offline/offlineDb.js';

export const httpClient = axios.create({ withCredentials: true });

// Cliente sin interceptores para sondeos de conectividad: no toca caché ni el loader global
const pingClient = axios.create({ withCredentials: true });

// Origen real de la API, aprendido de la última petición (permite sondear sin importar el entorno)
let origenApiDetectado = null;

// Detecta si el servidor de la API es inalcanzable aunque navigator.onLine siga en true
// (Wi-Fi sin internet, servidor caído, PWA apuntando a un backend no disponible, etc.)
let apiMarcadaSinConexion = false;

export function estaApiSinConexion() {
  return apiMarcadaSinConexion;
}

/**
 * El backend envuelve sus respuestas en { data, responseFlag, message, statusCode },
 * incluso en errores de negocio (y a veces con HTTP 500). Si llega ese sobre, la API sí
 * respondió: el fallo es del servidor y no debe tratarse como "API sin conexión".
 */
function esRespuestaEstructuradaApi(response) {
  const datos = response?.data;
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return false;
  return datos.responseFlag !== undefined;
}

/**
 * Comprueba si la API responde con una petición ligera. Evita que el POS intente cobrar
 * en línea cuando el Wi-Fi existe pero el servidor es inalcanzable.
 */
export async function verificarAlcanzabilidadApi({ timeoutMs = 3500 } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    notificarApiSinConexion();
    return false;
  }
  // Con appUrl = '' las peticiones van relativas (/api/...), así que nunca se aprende un
  // origen absoluto: en navegador se sondea contra el mismo origen (proxy de Vite).
  const baseUrl = origenApiDetectado ?? (typeof window !== 'undefined' ? '' : null);
  if (baseUrl === null) return true;

  try {
    await pingClient.get(`${baseUrl}/api/metodos-pago/activos`, { timeout: timeoutMs });
    notificarApiDisponible();
    return true;
  } catch (error) {
    const status = Number(error?.response?.status) || 0;
    if (status > 0 && (status < 500 || esRespuestaEstructuradaApi(error?.response))) {
      // El servidor respondió (error de permisos o error de negocio en JSON): la API es alcanzable
      notificarApiDisponible();
      return true;
    }
    if (error?.code !== 'ERR_CANCELED') {
      notificarApiSinConexion();
    }
    return false;
  }
}

function notificarApiSinConexion() {
  if (apiMarcadaSinConexion) return;
  apiMarcadaSinConexion = true;
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('apexgym:api-sin-conexion'));
  } catch {
    // Ignorar entornos sin eventos DOM
  }
}

function notificarApiDisponible() {
  if (!apiMarcadaSinConexion) return;
  apiMarcadaSinConexion = false;
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('apexgym:api-reconectada'));
  } catch {
    // Ignorar entornos sin eventos DOM
  }
}

function leerHeader(headers, nombre) {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get(nombre) ?? headers.get(nombre.toLowerCase()) ?? null;
  }
  const clave = Object.keys(headers).find((k) => k.toLowerCase() === nombre.toLowerCase());
  return clave ? headers[clave] : null;
}

function asignarHeader(headers, nombre, valor) {
  if (headers && typeof headers.set === 'function') {
    headers.set(nombre, valor);
    return headers;
  }
  const next = headers || {};
  next[nombre] = valor;
  return next;
}

function resolverSucursalIdRequest(config) {
  const explicito = leerHeader(config?.headers, 'x-sucursal-id');
  if (explicito) {
    return normalizarSucursalIdCache(explicito);
  }
  try {
    const guardado = typeof localStorage !== 'undefined'
      ? localStorage.getItem('apexgym_sucursal_activa_id')
      : null;
    if (guardado) {
      return normalizarSucursalIdCache(guardado);
    }
  } catch {
    // Ignorar si localStorage no está disponible
  }
  return '1';
}

export function normalizarUrlCache(config) {
  try {
    const uri = httpClient.getUri(config);
    const parsed = new URL(uri, 'http://localhost');
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const params = Array.from(parsed.searchParams.entries())
      .filter(([, val]) => val !== 'undefined' && val !== 'null' && val !== '')
      .sort(([aKey, aVal], [bKey, bVal]) => (
        aKey === bKey ? aVal.localeCompare(bVal) : aKey.localeCompare(bKey)
      ));

    const search = new URLSearchParams(params).toString();
    return search ? `${pathname}?${search}` : pathname;
  } catch {
    return String(config?.url || '');
  }
}

function esGetApiCacheable(config, urlCanon) {
  const metodo = String(config?.method || 'get').toUpperCase();
  if (metodo !== 'GET') return false;
  if (leerHeader(config?.headers, 'x-skip-offline-cache')) return false;
  return urlCanon.startsWith('/api/') && !urlCanon.includes('/stream');
}

function normalizarTextoOffline(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

async function buscarEnCacheOffline(sucursalId, urlCanon) {
  const exacto = await obtenerApiCache(sucursalId, urlCanon);
  if (exacto) return exacto;

  // Fallback inteligente para búsqueda de clientes offline a partir del catálogo completo cacheado
  if (urlCanon.startsWith('/api/clientes/buscar')) {
    const catalogoClientes = await obtenerApiCache(sucursalId, '/api/clientes');
    if (catalogoClientes?.data) {
      const lista = Array.isArray(catalogoClientes.data?.data)
        ? catalogoClientes.data.data
        : Array.isArray(catalogoClientes.data?.registros)
          ? catalogoClientes.data.registros
          : Array.isArray(catalogoClientes.data)
            ? catalogoClientes.data
            : null;

      if (lista) {
        const parsed = new URL(urlCanon, 'http://localhost');
        const q = normalizarTextoOffline(parsed.searchParams.get('q'));
        const pagina = Math.max(1, Number(parsed.searchParams.get('pagina') || 1));
        const limite = Math.max(1, Number(parsed.searchParams.get('limite') || 20));
        const filtrados = !q
          ? lista
          : lista.filter((c) => {
              const nombreCompleto = normalizarTextoOffline(
                [c.nombre, c.apellidoPaterno, c.apellidoMaterno, c.email, c.telefono].filter(Boolean).join(' ')
              );
              return String(c.id) === q || nombreCompleto.includes(q);
            });
        const inicio = (pagina - 1) * limite;
        const registros = filtrados.slice(inicio, inicio + limite);

        return {
          ...catalogoClientes,
          data: {
            data: {
              registros,
              total: filtrados.length,
            },
            responseFlag: 0,
            message: 'Clientes cargados desde caché local',
            statusCode: 200,
          },
        };
      }
    }
  }

  return null;
}

function construirRespuestaDesdeCache(entradaCache, config) {
  const payload = entradaCache?.data;
  const data = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? { ...payload, fromOfflineCache: true, cachedAt: entradaCache.updatedAt }
    : payload;

  return {
    data,
    status: 200,
    statusText: 'OK (Offline Cache)',
    headers: { 'x-apexgym-offline-cache': 'true' },
    config,
    fromOfflineCache: true,
  };
}

httpClient.interceptors.request.use(async (config) => {
  apiLoadingStore.iniciar();

  const sucursalId = resolverSucursalIdRequest(config);
  try {
    const explicito = leerHeader(config.headers, 'x-sucursal-id');
    if (!explicito) {
      const guardado = typeof localStorage !== 'undefined'
        ? localStorage.getItem('apexgym_sucursal_activa_id')
        : null;
      if (guardado) {
        config.headers = asignarHeader(config.headers, 'x-sucursal-id', guardado);
      }
    }
  } catch {
    // Ignorar si el almacenamiento local está restringido
  }

  const urlCanon = normalizarUrlCache(config);
  const cacheable = esGetApiCacheable(config, urlCanon);
  config._offlineMeta = { sucursalId, urlCanon, cacheable };

  try {
    const uriAbsoluta = httpClient.getUri(config);
    if (/^https?:\/\//i.test(uriAbsoluta)) {
      origenApiDetectado = new URL(uriAbsoluta).origin;
    }
  } catch {
    // Ignorar solicitudes sin URL absoluta
  }

  if (cacheable && typeof navigator !== 'undefined' && navigator.onLine === false) {
    const cached = await buscarEnCacheOffline(sucursalId, urlCanon);
    if (cached) {
      config.adapter = async () => construirRespuestaDesdeCache(cached, config);
    }
  }

  return config;
}, (error) => {
  apiLoadingStore.finalizar();
  return Promise.reject(error);
});

httpClient.interceptors.response.use(
  async (response) => {
    apiLoadingStore.finalizar();

    if (!response?.fromOfflineCache) {
      notificarApiDisponible();
    }

    const meta = response?.config?._offlineMeta;
    if (
      meta?.cacheable
      && !response.fromOfflineCache
      && response.status >= 200
      && response.status < 300
      && response.data !== undefined
      && response.data !== null
      && (response.data?.responseFlag === undefined || response.data?.responseFlag === 0)
    ) {
      await guardarApiCache(meta.sucursalId, meta.urlCanon, response.data).catch(() => {});
    }

    return response;
  },
  async (error) => {
    apiLoadingStore.finalizar();

    const config = error?.config;
    const meta = config?._offlineMeta;
    const statusRespuesta = Number(error?.response?.status) || 0;
    // Un 5xx significa que la API no puede atender: se opera con caché local igual que sin red.
    // Excepción: si el backend devolvió su sobre JSON (responseFlag presente), respondió de
    // verdad y el error debe propagarse tal cual, sin marcar la API como caída ni servir caché.
    const servidorNoDisponible = statusRespuesta >= 500 && !esRespuestaEstructuradaApi(error?.response);
    const sinRed = !error?.response
      || servidorNoDisponible
      || (typeof navigator !== 'undefined' && navigator.onLine === false);

    if ((!error?.response || servidorNoDisponible) && error?.code !== 'ERR_CANCELED') {
      notificarApiSinConexion();
    }

    if (meta?.cacheable && sinRed) {
      const cached = await buscarEnCacheOffline(meta.sucursalId, meta.urlCanon);
      if (cached) {
        return construirRespuestaDesdeCache(cached, config);
      }
    }

    return Promise.reject(error);
  }
);
