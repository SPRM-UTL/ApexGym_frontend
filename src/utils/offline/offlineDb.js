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

// Estado real del almacenamiento: lo que se guarda en memoria se pierde al recargar
let modoAlmacenamiento = 'desconocido';
let motivoFallbackMemoria = null;

function pasarAMemoria(motivo) {
  forceMemoryFallback = true;
  modoAlmacenamiento = 'memoria';
  motivoFallbackMemoria = motivo;
}

// La caché local se separa por usuario para que un empleado no vea catálogos de otro
const CLAVE_USUARIO_STORAGE = 'usuario_actual';
const ALCANCE_USUARIO_ANONIMO = 'anon';
let alcanceUsuarioOffline = ALCANCE_USUARIO_ANONIMO;
let ultimoUsuarioCrudo = null;

function leerUsuarioCrudo() {
  try {
    if (typeof localStorage !== 'undefined') {
      const local = localStorage.getItem(CLAVE_USUARIO_STORAGE);
      if (local) return local;
    }
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(CLAVE_USUARIO_STORAGE);
    }
  } catch {
    // Almacenamiento restringido: se opera con el alcance anónimo
  }
  return null;
}

function decodificarUsuarioCrudo(crudo) {
  try {
    return JSON.parse(decodeURIComponent(atob(crudo)));
  } catch {
    try {
      return JSON.parse(crudo);
    } catch {
      return null;
    }
  }
}

function calcularAlcanceUsuario(usuario) {
  if (!usuario || typeof usuario !== 'object') return ALCANCE_USUARIO_ANONIMO;
  const candidatos = [
    usuario.id,
    usuario.usuarioId,
    usuario.idUsuario,
    usuario.correo,
    usuario.email,
    usuario.nombreUsuario,
  ];
  const valor = candidatos.find((c) => c !== undefined && c !== null && String(c).trim() !== '');
  return valor === undefined ? ALCANCE_USUARIO_ANONIMO : String(valor).trim().toLowerCase();
}

/**
 * Recalcula (si cambió) el alcance del usuario autenticado y devuelve su identificador de caché.
 */
export function sincronizarAlcanceUsuarioOffline() {
  const crudo = leerUsuarioCrudo();
  if (crudo === ultimoUsuarioCrudo) return alcanceUsuarioOffline;

  ultimoUsuarioCrudo = crudo;
  alcanceUsuarioOffline = crudo
    ? calcularAlcanceUsuario(decodificarUsuarioCrudo(crudo))
    : ALCANCE_USUARIO_ANONIMO;
  return alcanceUsuarioOffline;
}

export function obtenerAlcanceUsuarioOffline() {
  return alcanceUsuarioOffline;
}

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
    if (modoAlmacenamiento !== 'memoria') {
      pasarAMemoria('IndexedDB no está disponible en este navegador o contexto.');
    }
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
        modoAlmacenamiento = 'indexeddb';
        motivoFallbackMemoria = null;
        resolve(db);
      };

      request.onerror = () => {
        pasarAMemoria(request.error?.message || 'No se pudo abrir la base local.');
        dbPromise = null;
        resolve(null);
      };

      // Otra pestaña bloquea la base: se reintenta en la siguiente operación
      request.onblocked = () => {
        motivoFallbackMemoria = 'La base local está bloqueada por otra pestaña.';
        dbPromise = null;
        resolve(null);
      };
    } catch (error) {
      pasarAMemoria(error?.message || 'Error al abrir la base local.');
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

export function construirClaveApiCache(sucursalId, url, alcanceUsuario = alcanceUsuarioOffline) {
  return `${normalizarSucursalIdCache(sucursalId)}:${alcanceUsuario || ALCANCE_USUARIO_ANONIMO}:${String(url || '').trim()}`;
}

export function extraerNombreColeccionApi(url) {
  const limpio = String(url || '').split('?')[0];
  const sinPrefijo = limpio.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/?/, '');
  const primerSegmento = sinPrefijo.split('/').filter(Boolean)[0];
  return primerSegmento || 'general';
}

export async function guardarApiCache(sucursalId, url, data) {
  const sucursalNorm = normalizarSucursalIdCache(sucursalId);
  const alcanceUsuario = sincronizarAlcanceUsuarioOffline();
  const key = construirClaveApiCache(sucursalNorm, url, alcanceUsuario);
  const registro = {
    key,
    sucursalId: sucursalNorm,
    url: String(url || '').trim(),
    coleccion: extraerNombreColeccionApi(url),
    alcance: alcanceUsuario,
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
  const key = construirClaveApiCache(sucursalId, url, sincronizarAlcanceUsuarioOffline());
  return dbGet(OFFLINE_STORES.API_CACHE, key);
}

export async function listarApiCachePorSucursal(sucursalId) {
  const sucursalNorm = normalizarSucursalIdCache(sucursalId);
  const todos = await dbGetAll(OFFLINE_STORES.API_CACHE);
  const alcanceActual = sincronizarAlcanceUsuarioOffline();
  return todos.filter((entrada) => (
    String(entrada.sucursalId) === sucursalNorm
    && (entrada.alcance || ALCANCE_USUARIO_ANONIMO) === alcanceActual
  ));
}

/**
 * Elimina entradas de caché obsoletas: formato anterior sin alcance de usuario y datos vencidos.
 */
export async function purgarApiCacheAntigua({ diasMaximos = 7 } = {}) {
  const limite = Date.now() - Math.max(1, Number(diasMaximos) || 7) * 24 * 60 * 60 * 1000;
  const entradas = await dbGetAll(OFFLINE_STORES.API_CACHE);
  let eliminadas = 0;

  for (const entrada of entradas) {
    const fecha = Date.parse(entrada?.updatedAt || '');
    const vencida = Number.isFinite(fecha) && fecha < limite;
    const formatoAnterior = !entrada?.alcance;

    if (vencida || formatoAnterior) {
      await dbDelete(OFFLINE_STORES.API_CACHE, entrada.key);
      eliminadas += 1;
    }
  }

  return eliminadas;
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

/**
 * Indica si los datos se están guardando en IndexedDB (persistente) o solo en memoria
 * (se pierde al recargar la página).
 */
export function describirAlmacenamientoOffline() {
  return {
    modo: modoAlmacenamiento,
    memoria: modoAlmacenamiento === 'memoria' || forceMemoryFallback,
    motivo: motivoFallbackMemoria,
  };
}

async function describirPermisoAlmacenamiento() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      return (await navigator.storage.persisted()) ? 'persistente' : 'temporal';
    }
  } catch {
    // Ignorar si el navegador no expone StorageManager
  }
  return 'desconocido';
}

/**
 * Prueba real de escritura/lectura en el almacén local para saber si una venta offline
 * se conservará al recargar o solo vivirá en memoria.
 */
export async function probarAlmacenamientoOffline() {
  const clave = `prueba_almacenamiento_${Date.now()}`;

  try {
    await guardarMeta(clave, { prueba: true, fecha: new Date().toISOString() });
    const leido = await obtenerMeta(clave);
    await dbDelete(OFFLINE_STORES.META, clave);

    const estado = describirAlmacenamientoOffline();
    return {
      correcto: Boolean(leido?.prueba),
      modo: estado.modo,
      memoria: estado.memoria,
      motivo: estado.motivo,
      permiso: await describirPermisoAlmacenamiento(),
    };
  } catch (error) {
    const estado = describirAlmacenamientoOffline();
    return {
      correcto: false,
      modo: estado.modo,
      memoria: estado.memoria,
      motivo: error?.message || estado.motivo || 'No se pudo escribir en el almacenamiento local.',
      permiso: await describirPermisoAlmacenamiento(),
    };
  }
}

// Catálogos mínimos que debe tener la copia local para cobrar sin conexión
export const CATALOGOS_VENTA_OFFLINE = [
  { url: '/api/metodos-pago/activos', etiqueta: 'Métodos de pago' },
  { url: '/api/empleados', etiqueta: 'Empleados' },
  { url: '/api/aperturas-caja/abierta', etiqueta: 'Caja abierta' },
  { url: '/api/cajas', etiqueta: 'Cajas' },
  { url: '/api/productos/venta/disponibles', etiqueta: 'Productos' },
  { url: '/api/servicios/venta/disponibles', etiqueta: 'Servicios' },
  { url: '/api/tipos-membresia/venta/disponibles', etiqueta: 'Membresías' },
  { url: '/api/categorias-productos/filtro-venta', etiqueta: 'Categorías' },
  { url: '/api/clientes', etiqueta: 'Clientes' },
];

/**
 * Revisa qué catálogos necesita una venta offline ya están guardados para la sucursal.
 */
export async function inventariarCatalogosVenta(sucursalId) {
  return Promise.all(
    CATALOGOS_VENTA_OFFLINE.map(async (catalogo) => {
      const entrada = await obtenerApiCache(sucursalId, catalogo.url);
      return {
        ...catalogo,
        disponible: Boolean(entrada),
        actualizadoEn: entrada?.updatedAt || null,
      };
    })
  );
}

export function limpiarMemoriaOfflineParaPruebas() {
  for (const map of Object.values(memoryStores)) {
    map.clear();
  }
}
