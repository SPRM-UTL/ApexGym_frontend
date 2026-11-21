const DB_NAME = 'apexgym_offline_db';
const DB_VERSION = 1;

export const OFFLINE_STORES = {
  API_CACHE: 'api_cache',
  VENTAS_OFFLINE: 'ventas_offline',
  META: 'meta',
};

const STORE_KEYS = {
  [OFFLINE_STORES.API_CACHE]: 'key',
  [OFFLINE_STORES.VENTAS_OFFLINE]: 'uuidIdempotencia',
  [OFFLINE_STORES.META]: 'key',
};

const memoryStores = {
  [OFFLINE_STORES.API_CACHE]: new Map(),
  [OFFLINE_STORES.VENTAS_OFFLINE]: new Map(),
  [OFFLINE_STORES.META]: new Map(),
};

let dbPromise = null;
let forceMemoryFallback = false;

function clonarValor(valor) {
  if (valor === undefined || valor === null) return valor;
  try {
    return structuredClone(valor);
  } catch {
    return JSON.parse(JSON.stringify(valor));
  }
}

export function emitirEventoOffline(nombreEvento, detail = {}) {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(nombreEvento, { detail }));
  } catch {
    // Ignorar en entornos sin soporte de eventos DOM
  }
}

function soporteIndexedDbDisponible() {
  return !forceMemoryFallback && typeof indexedDB !== 'undefined' && indexedDB !== null;
}

async function abrirBaseDatos() {
  if (!soporteIndexedDbDisponible()) {
    return null;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(OFFLINE_STORES.API_CACHE)) {
          const apiStore = db.createObjectStore(OFFLINE_STORES.API_CACHE, { keyPath: 'key' });
          apiStore.createIndex('sucursalId', 'sucursalId', { unique: false });
          apiStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.VENTAS_OFFLINE)) {
          const ventasStore = db.createObjectStore(OFFLINE_STORES.VENTAS_OFFLINE, {
            keyPath: 'uuidIdempotencia',
          });
          ventasStore.createIndex('estadoSync', 'estadoSync', { unique: false });
          ventasStore.createIndex('sucursalId', 'sucursalId', { unique: false });
          ventasStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.META)) {
          db.createObjectStore(OFFLINE_STORES.META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        forceMemoryFallback = true;
        dbPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      forceMemoryFallback = true;
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function getMemoryStore(storeName) {
  if (!memoryStores[storeName]) {
    memoryStores[storeName] = new Map();
  }
  return memoryStores[storeName];
}

export async function dbPut(storeName, value) {
  const keyPath = STORE_KEYS[storeName];
  if (!keyPath || !value || value[keyPath] === undefined) {
    throw new Error(`Registro inválido para el almacén ${storeName}`);
  }

  const copia = clonarValor(value);
  const db = await abrirBaseDatos();

  if (!db) {
    getMemoryStore(storeName).set(String(copia[keyPath]), copia);
    return copia;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(copia);
      req.onsuccess = () => resolve(copia);
      req.onerror = () => reject(req.error || new Error(`Error al guardar en ${storeName}`));
    } catch (error) {
      getMemoryStore(storeName).set(String(copia[keyPath]), copia);
      resolve(copia);
      void error;
    }
  });
}

export async function dbGet(storeName, key) {
  if (key === undefined || key === null) return null;
  const db = await abrirBaseDatos();

  if (!db) {
    return clonarValor(getMemoryStore(storeName).get(String(key)) ?? null);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? clonarValor(req.result) : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(clonarValor(getMemoryStore(storeName).get(String(key)) ?? null));
    }
  });
}

export async function dbGetAll(storeName) {
  const db = await abrirBaseDatos();

  if (!db) {
    return Array.from(getMemoryStore(storeName).values()).map((item) => clonarValor(item));
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result.map(clonarValor) : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve(Array.from(getMemoryStore(storeName).values()).map((item) => clonarValor(item)));
    }
  });
}

export async function dbDelete(storeName, key) {
  if (key === undefined || key === null) return false;
  const db = await abrirBaseDatos();

  if (!db) {
    return getMemoryStore(storeName).delete(String(key));
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(getMemoryStore(storeName).delete(String(key)));
    }
  });
}

export async function dbClear(storeName) {
  const db = await abrirBaseDatos();

  if (!db) {
    getMemoryStore(storeName).clear();
    return true;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      getMemoryStore(storeName).clear();
      resolve(true);
    }
  });
}

export function normalizarSucursalIdCache(sucursalId) {
  const num = Number(sucursalId);
  return Number.isInteger(num) && num > 0 ? String(num) : '1';
}

export function construirClaveApiCache(sucursalId, url) {
  return `${normalizarSucursalIdCache(sucursalId)}:${String(url || '').trim()}`;
}

export function extraerNombreColeccionApi(url) {
  const limpio = String(url || '').split('?')[0];
  const sinPrefijo = limpio.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/?/, '');
  const primerSegmento = sinPrefijo.split('/').filter(Boolean)[0];
  return primerSegmento || 'general';
}

export async function guardarApiCache(sucursalId, url, data) {
  const sucursalNorm = normalizarSucursalIdCache(sucursalId);
  const key = construirClaveApiCache(sucursalNorm, url);
  const registro = {
    key,
    sucursalId: sucursalNorm,
    url: String(url || '').trim(),
    coleccion: extraerNombreColeccionApi(url),
    data: clonarValor(data),
    updatedAt: new Date().toISOString(),
  };
  await dbPut(OFFLINE_STORES.API_CACHE, registro);
  emitirEventoOffline('apexgym:offline-cache-updated', {
    sucursalId: sucursalNorm,
    coleccion: registro.coleccion,
  });
  return registro;
}

export async function obtenerApiCache(sucursalId, url) {
  const key = construirClaveApiCache(sucursalId, url);
  return dbGet(OFFLINE_STORES.API_CACHE, key);
}

export async function listarApiCachePorSucursal(sucursalId) {
  const sucursalNorm = normalizarSucursalIdCache(sucursalId);
  const todos = await dbGetAll(OFFLINE_STORES.API_CACHE);
  return todos.filter((entrada) => String(entrada.sucursalId) === sucursalNorm);
}

export async function guardarMeta(key, value) {
  return dbPut(OFFLINE_STORES.META, {
    key: String(key),
    value: clonarValor(value),
    updatedAt: new Date().toISOString(),
  });
}

export async function obtenerMeta(key) {
  const registro = await dbGet(OFFLINE_STORES.META, String(key));
  return registro ? registro.value : null;
}

export async function obtenerResumenDatosLocales(sucursalId) {
  const sucursalNorm = normalizarSucursalIdCache(sucursalId);
  const [entradas, ultimaSyncMeta] = await Promise.all([
    listarApiCachePorSucursal(sucursalNorm),
    obtenerMeta(`ultima_sync_sucursal_${sucursalNorm}`),
  ]);

  const coleccionesSet = new Set(
    entradas
      .map((entrada) => entrada.coleccion || extraerNombreColeccionApi(entrada.url))
      .filter(Boolean)
  );

  let ultimaActualizacion = ultimaSyncMeta?.fecha || null;
  if (!ultimaActualizacion && entradas.length > 0) {
    ultimaActualizacion = entradas.reduce((max, item) => {
      if (!item?.updatedAt) return max;
      return !max || item.updatedAt > max ? item.updatedAt : max;
    }, null);
  }

  return {
    sucursalId: Number(sucursalNorm),
    hayDatosLocales: entradas.length > 0,
    totalEntradas: entradas.length,
    colecciones: coleccionesSet.size,
    nombresColecciones: Array.from(coleccionesSet),
    ultimaActualizacion,
  };
}

export async function guardarVentaOfflineDb(venta) {
  const guardado = await dbPut(OFFLINE_STORES.VENTAS_OFFLINE, venta);
  emitirEventoOffline('apexgym:offline-ventas-updated', {
    uuidIdempotencia: guardado.uuidIdempotencia,
  });
  return guardado;
}

export async function obtenerVentasOfflineDb() {
  const ventas = await dbGetAll(OFFLINE_STORES.VENTAS_OFFLINE);
  return ventas.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function eliminarVentaOfflineDb(uuidIdempotencia) {
  const ok = await dbDelete(OFFLINE_STORES.VENTAS_OFFLINE, uuidIdempotencia);
  emitirEventoOffline('apexgym:offline-ventas-updated', { uuidIdempotencia });
  return ok;
}

export function limpiarMemoriaOfflineParaPruebas() {
  for (const map of Object.values(memoryStores)) {
    map.clear();
  }
}
