import axios from 'axios';
import { apiLoadingStore } from '../apiLoading.js';
import {
  guardarApiCache,
  normalizarSucursalIdCache,
  obtenerApiCache,
} from '../../utils/offline/offlineDb.js';

export const httpClient = axios.create({ withCredentials: true });

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
    const sinRed = !error?.response || (typeof navigator !== 'undefined' && navigator.onLine === false);

    if (meta?.cacheable && sinRed) {
      const cached = await buscarEnCacheOffline(meta.sucursalId, meta.urlCanon);
      if (cached) {
        return construirRespuestaDesdeCache(cached, config);
      }
    }

    return Promise.reject(error);
  }
);
