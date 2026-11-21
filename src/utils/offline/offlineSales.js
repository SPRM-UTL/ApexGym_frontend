import {
  eliminarVentaOfflineDb,
  guardarMeta,
  guardarVentaOfflineDb,
  obtenerMeta,
  obtenerVentasOfflineDb,
} from './offlineDb.js';
import {
  METODOS_PAGO_CODIGO,
  normalizarCodigoMetodoPago,
  redondearMonto,
  validarCobroWeb,
} from './pagosValidacion.js';

export const PAQUETE_VENTAS_VERSION = 1;
export const PAQUETE_VENTAS_TIPO = 'APEXGYM_VENTAS_OFFLINE';

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotarDerecha(valor, bits) {
  return (valor >>> bits) | (valor << (32 - bits));
}

/**
 * SHA-256 síncrono en JS puro para checksum determinista entre navegador y Node.js.
 */
export function sha256Hex(texto) {
  const bytes = new TextEncoder().encode(String(texto ?? ''));
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotarDerecha(w[i - 15], 7) ^ rotarDerecha(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotarDerecha(w[i - 2], 17) ^ rotarDerecha(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotarDerecha(e, 6) ^ rotarDerecha(e, 11) ^ rotarDerecha(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotarDerecha(a, 2) ^ rotarDerecha(a, 13) ^ rotarDerecha(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return Array.from(hash)
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

export function serializarDeterminista(valor) {
  if (valor === null || typeof valor !== 'object') {
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) {
    return `[${valor.map((item) => (item === undefined ? 'null' : serializarDeterminista(item))).join(',')}]`;
  }
  const claves = Object.keys(valor)
    .filter((k) => valor[k] !== undefined)
    .sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${serializarDeterminista(valor[k])}`).join(',')}}`;
}

export function generarUuidIdempotencia() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatearFechaFolio(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function formatearFolioOffline(fecha = new Date(), secuencia = 1) {
  const yyyymmdd = formatearFechaFolio(fecha);
  const seqStr = String(Math.max(1, Number(secuencia) || 1)).padStart(4, '0');
  return `OFF-${yyyymmdd}-${seqStr}`;
}

export async function generarSiguienteFolioOffline(fecha = new Date()) {
  const fechaTag = formatearFechaFolio(fecha);
  const metaKey = `offline_folio_seq_${fechaTag}`;
  const actual = Number(await obtenerMeta(metaKey)) || 0;
  const siguiente = actual + 1;
  await guardarMeta(metaKey, siguiente);
  return formatearFolioOffline(fecha, siguiente);
}

function normalizarVentaParaPaquete(venta) {
  if (!venta || typeof venta !== 'object') {
    throw new Error('Registro de venta offline no válido.');
  }

  const codigoMetodo = normalizarCodigoMetodoPago(venta.metodoPagoCodigo ?? venta.metodoPago);
  if (codigoMetodo !== METODOS_PAGO_CODIGO.EFECTIVO) {
    throw new Error('Las ventas sin conexión solo están permitidas en efectivo.');
  }

  const uuidIdempotencia = String(venta.uuidIdempotencia ?? '').trim();
  if (!uuidIdempotencia) {
    throw new Error('Cada venta offline debe incluir un uuidIdempotencia válido.');
  }

  const detalleVenta = Array.isArray(venta.detalleVenta) ? venta.detalleVenta : [];
  if (detalleVenta.length === 0) {
    throw new Error(`La venta ${venta.folioLocal || uuidIdempotencia} no tiene artículos.`);
  }

  const subtotal = redondearMonto(venta.subtotal);
  const total = redondearMonto(venta.total);
  const montoRecibido = redondearMonto(venta.montoRecibido ?? total);
  const cambio = redondearMonto(venta.cambio ?? Math.max(0, montoRecibido - total));

  return {
    uuidIdempotencia,
    folioLocal: String(venta.folioLocal || formatearFolioOffline(venta.createdAt || new Date(), 1)),
    sucursalId: Number(venta.sucursalId || 1),
    empleadoId: Number(venta.empleadoId),
    aperturaCajaId: Number(venta.aperturaCajaId),
    clienteId: Number(venta.clienteId),
    metodoPagoId: Number(venta.metodoPagoId),
    metodoPagoCodigo: METODOS_PAGO_CODIGO.EFECTIVO,
    metodoPago: venta.metodoPago ?? {
      id: Number(venta.metodoPagoId),
      nombre: 'Efectivo',
      codigo: METODOS_PAGO_CODIGO.EFECTIVO,
    },
    subtotal,
    iva: redondearMonto(venta.iva ?? Math.max(0, total - subtotal)),
    total,
    montoRecibido,
    cambio,
    detalleVenta,
    cliente: venta.cliente ?? null,
    empleado: venta.empleado ?? null,
    aperturaCaja: venta.aperturaCaja ?? null,
    createdAt: venta.createdAt || new Date().toISOString(),
    estadoSync: venta.estadoSync || 'PENDIENTE',
    origen: venta.origen || 'WEB_PWA',
  };
}

export function calcularChecksumPaquete(paqueteBase) {
  const canonico = serializarDeterminista({
    version: paqueteBase.version,
    tipo: paqueteBase.tipo,
    ventas: paqueteBase.ventas,
  });
  return sha256Hex(canonico);
}

export function exportarPaqueteVentasOffline(ventas = [], opciones = {}) {
  if (!Array.isArray(ventas)) {
    throw new Error('La lista de ventas a exportar debe ser un arreglo.');
  }

  const ventasNormalizadas = ventas.map(normalizarVentaParaPaquete);
  const base = {
    version: PAQUETE_VENTAS_VERSION,
    tipo: PAQUETE_VENTAS_TIPO,
    sucursalId: opciones.sucursalId != null ? Number(opciones.sucursalId) : null,
    exportadoEn: opciones.exportadoEn || new Date().toISOString(),
    totalVentas: ventasNormalizadas.length,
    ventas: ventasNormalizadas,
  };

  const checksum = calcularChecksumPaquete(base);
  return JSON.stringify({ ...base, checksum }, null, 2);
}

export function parsearEImportarPaqueteVentas(entrada, ventasExistentes = []) {
  let paquete;
  if (typeof entrada === 'string') {
    try {
      paquete = JSON.parse(entrada);
    } catch {
      throw new Error('El archivo de ventas offline no contiene un JSON válido.');
    }
  } else if (entrada && typeof entrada === 'object') {
    paquete = entrada;
  } else {
    throw new Error('El paquete de ventas offline no es válido.');
  }

  if (paquete.version !== PAQUETE_VENTAS_VERSION || paquete.tipo !== PAQUETE_VENTAS_TIPO) {
    throw new Error('La versión o el formato del paquete de ventas offline no es compatible.');
  }

  if (!Array.isArray(paquete.ventas)) {
    throw new Error('El paquete no contiene una lista de ventas válida.');
  }

  const checksumRecibido = String(paquete.checksum ?? '').trim().toLowerCase();
  const ventasNormalizadas = paquete.ventas.map(normalizarVentaParaPaquete);
  const checksumEsperado = calcularChecksumPaquete({
    version: paquete.version,
    tipo: paquete.tipo,
    ventas: ventasNormalizadas,
  });

  if (!checksumRecibido || checksumRecibido !== checksumEsperado) {
    throw new Error('El checksum del paquete no coincide; el archivo fue alterado o está corrupto.');
  }

  const uuidsExistentes = new Set(
    (Array.isArray(ventasExistentes) ? ventasExistentes : [])
      .map((v) => String(v?.uuidIdempotencia ?? '').trim())
      .filter(Boolean)
  );

  const nuevas = [];
  const duplicadas = [];

  for (const venta of ventasNormalizadas) {
    if (uuidsExistentes.has(venta.uuidIdempotencia)) {
      duplicadas.push(venta);
    } else {
      uuidsExistentes.add(venta.uuidIdempotencia);
      nuevas.push({ ...venta, estadoSync: 'PENDIENTE' });
    }
  }

  return {
    version: paquete.version,
    tipo: paquete.tipo,
    checksum: checksumEsperado,
    totalEnPaquete: ventasNormalizadas.length,
    nuevas,
    duplicadas,
  };
}

export async function registrarVentaOffline({
  sucursalId,
  empleadoId,
  aperturaCajaId,
  clienteId,
  metodoPagoId,
  metodoPago,
  subtotal,
  iva,
  total,
  montoRecibido,
  detalleVenta,
  cliente = null,
  empleado = null,
  aperturaCaja = null,
}) {
  const validacion = validarCobroWeb({
    metodoCodigo: normalizarCodigoMetodoPago(metodoPago ?? METODOS_PAGO_CODIGO.EFECTIVO),
    isOnline: false,
    total,
    montoRecibido,
  });

  if (!validacion.valido) {
    throw new Error(validacion.mensaje);
  }

  const ahora = new Date();
  const uuidIdempotencia = generarUuidIdempotencia();
  const folioLocal = await generarSiguienteFolioOffline(ahora);

  const registro = normalizarVentaParaPaquete({
    uuidIdempotencia,
    folioLocal,
    sucursalId: Number(sucursalId || 1),
    empleadoId: Number(empleadoId),
    aperturaCajaId: Number(aperturaCajaId),
    clienteId: Number(clienteId),
    metodoPagoId: Number(metodoPagoId),
    metodoPagoCodigo: METODOS_PAGO_CODIGO.EFECTIVO,
    metodoPago: {
      id: Number(metodoPagoId),
      nombre: metodoPago?.nombre || 'Efectivo',
      codigo: METODOS_PAGO_CODIGO.EFECTIVO,
    },
    subtotal,
    iva,
    total: validacion.total,
    montoRecibido: validacion.montoRecibido,
    cambio: validacion.cambio,
    detalleVenta,
    cliente,
    empleado,
    aperturaCaja,
    createdAt: ahora.toISOString(),
    estadoSync: 'PENDIENTE',
    origen: 'WEB_PWA',
  });

  return guardarVentaOfflineDb(registro);
}

export async function listarVentasOffline({ sucursalId = null, soloPendientes = false } = {}) {
  const todas = await obtenerVentasOfflineDb();
  return todas.filter((venta) => {
    if (sucursalId != null && Number(venta.sucursalId) !== Number(sucursalId)) {
      return false;
    }
    if (soloPendientes && venta.estadoSync === 'SINCRONIZADA') {
      return false;
    }
    return true;
  });
}

export async function importarPaqueteVentasEnDb(contenidoJson) {
  const existentes = await obtenerVentasOfflineDb();
  const resultado = parsearEImportarPaqueteVentas(contenidoJson, existentes);
  for (const venta of resultado.nuevas) {
    await guardarVentaOfflineDb(venta);
  }
  return resultado;
}

export async function marcarVentasSincronizadas(uuids = []) {
  const set = new Set((uuids || []).map(String));
  for (const uuid of set) {
    await eliminarVentaOfflineDb(uuid);
  }
}

export function construirPayloadSincronizacionOffline(ventas = []) {
  return {
    ventas: ventas.map((venta) => ({
      uuidIdempotencia: venta.uuidIdempotencia,
      folioLocal: venta.folioLocal,
      sucursalId: Number(venta.sucursalId || 1),
      empleadoId: Number(venta.empleadoId),
      aperturaCajaId: Number(venta.aperturaCajaId),
      clienteId: Number(venta.clienteId),
      metodoPagoId: Number(venta.metodoPagoId),
      metodoPagoCodigo: METODOS_PAGO_CODIGO.EFECTIVO,
      subtotal: redondearMonto(venta.subtotal),
      total: redondearMonto(venta.total),
      montoRecibido: redondearMonto(venta.montoRecibido),
      detalleVenta: Array.isArray(venta.detalleVenta)
        ? venta.detalleVenta.map((linea) => ({
            tipoItem: linea.tipoItem,
            ...(linea.productoId ? { productoId: Number(linea.productoId) } : {}),
            ...(linea.servicioId ? { servicioId: Number(linea.servicioId) } : {}),
            ...(linea.tipoMembresiaId ? { tipoMembresiaId: Number(linea.tipoMembresiaId) } : {}),
            cantidad: Number(linea.cantidad),
            precioUnitario: redondearMonto(linea.precioUnitario),
            descuentoUnitario: redondearMonto(linea.descuentoUnitario ?? 0),
            subtotal: redondearMonto(linea.subtotal),
          }))
        : [],
      createdAt: venta.createdAt,
    })),
  };
}
