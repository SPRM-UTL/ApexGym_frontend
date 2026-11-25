import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularCambioEfectivo,
  calcularDescuentoUnitario,
  calcularMontos,
  calcularPrecioUnitarioNeto,
  calcularSubtotalLinea,
  redondearMonto,
  validarCobroWeb,
} from '../../src/utils/offline/pagosValidacion.js';
import {
  construirPayloadSincronizacionOffline,
  exportarPaqueteVentasOffline,
  formatearFolioOffline,
  importarPaqueteVentasEnDb,
  listarVentasOffline,
  parsearEImportarPaqueteVentas,
  registrarVentaOffline,
} from '../../src/utils/offline/offlineSales.js';
import { httpClient, normalizarUrlCache } from '../../src/scripts/services/httpClient.js';
import {
  guardarApiCache,
  limpiarMemoriaOfflineParaPruebas,
  obtenerApiCache,
  obtenerResumenDatosLocales,
} from '../../src/utils/offline/offlineDb.js';

describe('Cálculos de ventas web y descuentos', () => {
  it('calcula subtotal, IVA (16%) y total con precisión decimal y descuentos solo en productos', () => {
    const items = [
      { tipoItem: 'PRODUCTO', precio: 100, descuentoPorcentaje: 10, cantidad: 2 }, // neto 90 * 2 = 180
      { tipoItem: 'SERVICIO', precio: 250, cantidad: 1 }, // 250
      { tipoItem: 'MEMBRESIA', precio: 500, descuentoPorcentaje: 50, cantidad: 1 }, // descuento no aplica a membresía -> 500
    ];

    const res = calcularMontos(items);

    assert.deepEqual(res, { subtotal: 930, iva: 148.8, total: 1078.8 });
    assert.equal(calcularDescuentoUnitario(items[0]), 10);
    assert.equal(calcularPrecioUnitarioNeto(items[0]), 90);
    assert.equal(calcularDescuentoUnitario(items[2]), 0);
    assert.equal(calcularSubtotalLinea(items[0]), 180);
    assert.equal(redondearMonto(10.005), 10.01);
    assert.equal(calcularCambioEfectivo(1078.8, 1200), 121.2);
  });
});

describe('validarCobroWeb (online y rechazo estricto de no-efectivo en offline)', () => {
  it('valida cobro en efectivo en línea y sin conexión', () => {
    const okOnline = validarCobroWeb({
      metodoCodigo: 'EFECTIVO',
      isOnline: true,
      total: 348,
      montoRecibido: 500,
    });
    assert.equal(okOnline.valido, true);
    assert.equal(okOnline.cambio, 152);

    const okOffline = validarCobroWeb({
      metodoCodigo: 'EFECTIVO',
      isOnline: false,
      total: 348,
      montoRecibido: 348,
    });
    assert.equal(okOffline.valido, true);
    assert.equal(okOffline.cambio, 0);

    const insuficiente = validarCobroWeb({
      metodoCodigo: 'EFECTIVO',
      isOnline: false,
      total: 348,
      montoRecibido: 300,
    });
    assert.equal(insuficiente.valido, false);
    assert.equal(insuficiente.codigoError, 'MONTO_INSUFICIENTE');
  });

  it('valida tarjeta, transferencia y Mercado Pago en línea', () => {
    const tarjetaOk = validarCobroWeb({
      metodoCodigo: 'TARJETA',
      isOnline: true,
      total: 580,
      datosTarjeta: {
        folioVoucher: 'AUTH-9981',
        tipoTarjeta: 'CREDITO',
        marcaTarjeta: 'VISA',
        ultimosDigitos: '4321',
      },
    });
    assert.equal(tarjetaOk.valido, true);
    assert.equal(tarjetaOk.payloadPago.ultimosDigitos, '4321');

    const tarjetaMalDigitos = validarCobroWeb({
      metodoCodigo: 'TARJETA',
      isOnline: true,
      total: 580,
      datosTarjeta: { ultimosDigitos: '12a' },
    });
    assert.equal(tarjetaMalDigitos.valido, false);
    assert.equal(tarjetaMalDigitos.codigoError, 'DIGITOS_TARJETA_INVALIDOS');

    const transferenciaOk = validarCobroWeb({
      metodoCodigo: 'TRANSFERENCIA',
      isOnline: true,
      total: 580,
      datosTransferencia: { referencia: 'SPEI-20261120-001' },
    });
    assert.equal(transferenciaOk.valido, true);
    assert.equal(transferenciaOk.payloadPago.referenciaTransferencia, 'SPEI-20261120-001');

    const transferenciaXss = validarCobroWeb({
      metodoCodigo: 'TRANSFERENCIA',
      isOnline: true,
      total: 580,
      datosTransferencia: { referencia: '<script>alert(1)</script>' },
    });
    assert.equal(transferenciaXss.valido, false);

    const mpOk = validarCobroWeb({
      metodoCodigo: 'MERCADO_PAGO',
      isOnline: true,
      total: 580,
    });
    assert.equal(mpOk.valido, true);
    assert.equal(mpOk.requiereRedireccion, true);
  });

  it('rechaza estrictamente tarjeta, transferencia y Mercado Pago cuando isOnline = false', () => {
    for (const metodoCodigo of ['TARJETA', 'TRANSFERENCIA', 'MERCADO_PAGO']) {
      const res = validarCobroWeb({
        metodoCodigo,
        isOnline: false,
        total: 200,
        montoRecibido: 200,
        datosTarjeta: { folioVoucher: '123', ultimosDigitos: '1234' },
        datosTransferencia: { referencia: 'REF123' },
      });
      assert.equal(res.valido, false, `${metodoCodigo} debe ser rechazado offline`);
      assert.equal(res.codigoError, 'SOLO_EFECTIVO_OFFLINE');
    }
  });
});

describe('Paquete JSON de ventas offline (roundtrip, checksum, solo efectivo, deduplicación UUID) y motor local', () => {
  beforeEach(() => {
    limpiarMemoriaOfflineParaPruebas();
  });

  const crearVentaMuestra = (overrides = {}) => ({
    uuidIdempotencia: '11111111-1111-4111-8111-111111111111',
    folioLocal: 'OFF-20261120-0001',
    sucursalId: 1,
    empleadoId: 2,
    aperturaCajaId: 5,
    clienteId: 1,
    metodoPagoId: 1,
    metodoPagoCodigo: 'EFECTIVO',
    subtotal: 100,
    iva: 16,
    total: 116,
    montoRecibido: 150,
    cambio: 34,
    detalleVenta: [
      { tipoItem: 'PRODUCTO', productoId: 3, cantidad: 1, precioUnitario: 100, descuentoUnitario: 0, subtotal: 100 },
    ],
    createdAt: '2026-11-20T18:00:00.000Z',
    ...overrides,
  });

  it('exporta e importa en roundtrip verificando checksum determinista', () => {
    const ventas = [
      crearVentaMuestra(),
      crearVentaMuestra({
        uuidIdempotencia: '22222222-2222-4222-8222-222222222222',
        folioLocal: 'OFF-20261120-0002',
        total: 232,
        subtotal: 200,
        iva: 32,
        montoRecibido: 250,
        cambio: 18,
      }),
    ];

    const json = exportarPaqueteVentasOffline(ventas, { sucursalId: 1 });
    const resultado = parsearEImportarPaqueteVentas(json, []);

    assert.equal(resultado.version, 1);
    assert.equal(resultado.totalEnPaquete, 2);
    assert.equal(resultado.nuevas.length, 2);
    assert.equal(resultado.duplicadas.length, 0);
    assert.equal(resultado.nuevas[0].folioLocal, 'OFF-20261120-0001');
  });

  it('rechaza paquete si el checksum fue alterado', () => {
    const json = exportarPaqueteVentasOffline([crearVentaMuestra()], { sucursalId: 1 });
    const alterado = JSON.parse(json);
    alterado.ventas[0].total = 9999;

    assert.throws(
      () => parsearEImportarPaqueteVentas(JSON.stringify(alterado), []),
      /checksum/i
    );
  });

  it('rechaza exportar o importar ventas offline que no sean en EFECTIVO', () => {
    assert.throws(
      () => exportarPaqueteVentasOffline([crearVentaMuestra({ metodoPagoCodigo: 'TARJETA' })]),
      /efectivo/i
    );

    const jsonValido = exportarPaqueteVentasOffline([crearVentaMuestra()]);
    const alterado = JSON.parse(jsonValido);
    alterado.ventas[0].metodoPagoCodigo = 'MERCADO_PAGO';
    alterado.ventas[0].metodoPago = { id: 2, nombre: 'Mercado Pago', codigo: 'MERCADO_PAGO' };

    assert.throws(
      () => parsearEImportarPaqueteVentas(alterado, []),
      /efectivo/i
    );
  });

  it('deduplica ventas por uuidIdempotencia contra existentes y dentro del mismo paquete', async () => {
    const v1 = crearVentaMuestra({ uuidIdempotencia: 'uuid-dup-1', folioLocal: 'OFF-20261120-0001' });
    const v2 = crearVentaMuestra({ uuidIdempotencia: 'uuid-new-2', folioLocal: 'OFF-20261120-0002' });

    const json = exportarPaqueteVentasOffline([v1, v1, v2], { sucursalId: 1 });
    const parsed = parsearEImportarPaqueteVentas(json, [v1]);

    assert.equal(parsed.nuevas.length, 1);
    assert.equal(parsed.nuevas[0].uuidIdempotencia, 'uuid-new-2');
    assert.equal(parsed.duplicadas.length, 2);

    const dbImport = await importarPaqueteVentasEnDb(json);
    assert.equal(dbImport.nuevas.length, 2);
    assert.equal(dbImport.duplicadas.length, 1);

    const dbImportRepetido = await importarPaqueteVentasEnDb(json);
    assert.equal(dbImportRepetido.nuevas.length, 0);
    assert.equal(dbImportRepetido.duplicadas.length, 3);
  });

  it('opera almacenamiento local en fallback Node sin indexedDB y genera folios OFF-YYYYMMDD-XXXX', async () => {
    await guardarApiCache(1, '/api/productos/venta/disponibles', { responseFlag: 0, data: [{ id: 1 }] });
    await guardarApiCache(1, '/api/metodos-pago/activos', { responseFlag: 0, data: [{ id: 1, codigo: 'EFECTIVO' }] });

    const cached = await obtenerApiCache(1, '/api/productos/venta/disponibles');
    assert.equal(cached.data.data[0].id, 1);

    const resumen = await obtenerResumenDatosLocales(1);
    assert.equal(resumen.hayDatosLocales, true);
    assert.equal(resumen.colecciones, 2);

    const ventaGuardada = await registrarVentaOffline({
      sucursalId: 1,
      empleadoId: 2,
      aperturaCajaId: 5,
      clienteId: 1,
      metodoPagoId: 1,
      metodoPago: { id: 1, nombre: 'Efectivo', codigo: 'EFECTIVO' },
      subtotal: 100,
      iva: 16,
      total: 116,
      montoRecibido: 200,
      detalleVenta: [
        { tipoItem: 'PRODUCTO', productoId: 1, cantidad: 1, precioUnitario: 100, subtotal: 100 },
      ],
    });

    assert.match(ventaGuardada.folioLocal, /^OFF-\d{8}-\d{4}$/);
    assert.equal(ventaGuardada.cambio, 84);
    assert.equal(formatearFolioOffline(new Date('2026-11-20T12:00:00Z'), 7), 'OFF-20261120-0007');

    const pendientes = await listarVentasOffline({ sucursalId: 1, soloPendientes: true });
    assert.equal(pendientes.length, 1);

    const payloadSync = construirPayloadSincronizacionOffline(pendientes);
    assert.equal(payloadSync.ventas.length, 1);
    assert.equal(payloadSync.ventas[0].metodoPagoCodigo, 'EFECTIVO');
    assert.equal(payloadSync.ventas[0].uuidIdempotencia, ventaGuardada.uuidIdempotencia);
  });

  it('cachea GET /api/* por sucursal en httpClient, excluye /stream y devuelve fromOfflineCache: true sin red', async () => {
    const originalAdapter = httpClient.defaults.adapter;
    try {
      assert.equal(
        normalizarUrlCache({ url: 'http://localhost:3000/api/ventas/', params: { pagina: 1, limite: 10, q: undefined } }),
        '/api/ventas?limite=10&pagina=1'
      );

      let llamadasRed = 0;
      httpClient.defaults.adapter = async (config) => {
        llamadasRed += 1;
        if (config.url.includes('stream')) {
          return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
        }
        return {
          data: { responseFlag: 0, data: [{ id: 99, nombre: 'Proteína Sucursal 2' }] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      };

      const resOnline = await httpClient.get('http://localhost:3000/api/productos/venta/disponibles', {
        headers: { 'x-sucursal-id': '2' },
      });
      assert.equal(resOnline.status, 200);
      assert.equal(resOnline.fromOfflineCache, undefined);
      assert.equal(llamadasRed, 1);

      await httpClient.get('http://localhost:3000/api/notificaciones/stream', {
        headers: { 'x-sucursal-id': '2' },
      });
      assert.equal(await obtenerApiCache(2, '/api/notificaciones/stream'), null);

      // Simular falla de red (como AxiosError real con error.config): debe devolver caché de sucursal 2 con fromOfflineCache: true
      httpClient.defaults.adapter = async (config) => {
        const err = new Error('Network Error');
        err.config = config;
        throw err;
      };

      const resOffline = await httpClient.get('http://localhost:3000/api/productos/venta/disponibles', {
        headers: { 'x-sucursal-id': '2' },
      });
      assert.equal(resOffline.fromOfflineCache, true);
      assert.equal(resOffline.data.fromOfflineCache, true);
      assert.equal(resOffline.data.data[0].nombre, 'Proteína Sucursal 2');

      // Sucursal 1 no debe recibir el caché de sucursal 2
      await assert.rejects(
        () => httpClient.get('http://localhost:3000/api/productos/venta/disponibles', {
          headers: { 'x-sucursal-id': '1' },
        }),
        /Network Error/
      );

      // Simular navigator.onLine === false: devuelve caché inmediato sin tocar la red
      const descriptorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { onLine: false },
      });
      try {
        const resNavigatorOffline = await httpClient.get('http://localhost:3000/api/productos/venta/disponibles', {
          headers: { 'x-sucursal-id': '2' },
        });
        assert.equal(resNavigatorOffline.fromOfflineCache, true);
        assert.equal(resNavigatorOffline.data.data[0].id, 99);
      } finally {
        if (descriptorNavigator) {
          Object.defineProperty(globalThis, 'navigator', descriptorNavigator);
        } else {
          delete globalThis.navigator;
        }
      }
    } finally {
      httpClient.defaults.adapter = originalAdapter;
    }
  });
});
