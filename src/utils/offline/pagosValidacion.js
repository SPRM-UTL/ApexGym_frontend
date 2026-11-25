export const METODOS_PAGO_CODIGO = Object.freeze({
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA',
  MERCADO_PAGO: 'MERCADO_PAGO',
});

const METODOS_VALIDOS = new Set(Object.values(METODOS_PAGO_CODIGO));
const TIPOS_TARJETA_VALIDOS = new Set(['DEBITO', 'CREDITO']);
const MARCAS_TARJETA_VALIDAS = new Set(['VISA', 'MASTERCARD', 'AMEX', 'CARNET', 'OTRA']);

export function redondearMonto(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calcularDescuentoUnitarioItem(item) {
  if (!item || String(item.tipoItem ?? '').toUpperCase() !== 'PRODUCTO') return 0;
  return redondearMonto((Number(item.precio ?? 0) * Number(item.descuentoPorcentaje ?? 0)) / 100);
}

export function calcularPrecioUnitarioNeto(item) {
  if (!item) return 0;
  return redondearMonto(Number(item.precio ?? 0) - calcularDescuentoUnitarioItem(item));
}

export function calcularSubtotalLineaItem(item) {
  if (!item) return 0;
  return redondearMonto(calcularPrecioUnitarioNeto(item) * Number(item.cantidad ?? 0));
}

export const calcularDescuentoUnitario = calcularDescuentoUnitarioItem;
export const calcularSubtotalLinea = calcularSubtotalLineaItem;

export function calcularMontos(items = []) {
  const lista = Array.isArray(items) ? items : [];
  const subtotal = redondearMonto(
    lista.reduce((acumulado, item) => acumulado + calcularSubtotalLineaItem(item), 0)
  );
  const iva = redondearMonto(subtotal * 0.16);
  return {
    subtotal,
    iva,
    total: redondearMonto(subtotal + iva),
  };
}

export function calcularCambioEfectivo(total, montoRecibido) {
  const totalNum = Number(total);
  const recibidoNum = Number(montoRecibido);
  if (!Number.isFinite(totalNum) || !Number.isFinite(recibidoNum)) return 0;
  return redondearMonto(Math.max(0, recibidoNum - totalNum));
}

export function normalizarCodigoMetodoPago(metodo) {
  if (!metodo) return '';
  const raw = typeof metodo === 'object' ? (metodo.codigo ?? metodo.nombre ?? '') : metodo;
  const normalizado = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (normalizado === 'TERMINAL_MANUAL') return METODOS_PAGO_CODIGO.TARJETA;
  return normalizado;
}

export function esMetodoPagoEfectivo(metodo) {
  return normalizarCodigoMetodoPago(metodo) === METODOS_PAGO_CODIGO.EFECTIVO;
}

function contieneCaracteresPeligrosos(texto) {
  const str = String(texto ?? '');
  if (/<[^>]*>/.test(str)) return true;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export function validarCobroWeb({
  metodoCodigo,
  metodoPago,
  isOnline = true,
  total,
  montoRecibido = 0,
  datosTarjeta = {},
  datosTransferencia = {},
  requerirVoucherTarjeta = false,
  requerirReferenciaTransferencia = false,
} = {}) {
  const codigo = normalizarCodigoMetodoPago(metodoCodigo ?? metodoPago);
  if (!METODOS_VALIDOS.has(codigo)) {
    return {
      valido: false,
      codigoError: 'METODO_NO_VALIDO',
      mensaje: 'Selecciona un método de pago válido.',
    };
  }

  if (!isOnline && codigo !== METODOS_PAGO_CODIGO.EFECTIVO) {
    return {
      valido: false,
      codigoError: 'SOLO_EFECTIVO_OFFLINE',
      mensaje: 'Sin conexión a internet solo se permiten ventas en efectivo.',
    };
  }

  const totalNum = redondearMonto(total);
  if (!Number.isFinite(Number(total)) || totalNum <= 0) {
    return {
      valido: false,
      codigoError: 'TOTAL_INVALIDO',
      mensaje: 'El total de la venta debe ser mayor a cero.',
    };
  }

  if (codigo === METODOS_PAGO_CODIGO.EFECTIVO) {
    const recibidoNum = redondearMonto(montoRecibido);
    if (!Number.isFinite(Number(montoRecibido)) || recibidoNum < totalNum) {
      return {
        valido: false,
        codigoError: 'MONTO_INSUFICIENTE',
        mensaje: 'El monto recibido en efectivo no cubre el total de la venta.',
      };
    }

    return {
      valido: true,
      codigo,
      total: totalNum,
      montoRecibido: recibidoNum,
      cambio: calcularCambioEfectivo(totalNum, recibidoNum),
      payloadPago: undefined,
    };
  }

  if (codigo === METODOS_PAGO_CODIGO.TARJETA) {
    const folioVoucher = String(datosTarjeta?.folioVoucher ?? '').trim();
    const tipoTarjeta = String(datosTarjeta?.tipoTarjeta ?? 'DEBITO').trim().toUpperCase();
    const marcaTarjeta = String(datosTarjeta?.marcaTarjeta ?? 'VISA').trim().toUpperCase();
    const ultimosDigitos = String(datosTarjeta?.ultimosDigitos ?? '').trim();

    if (requerirVoucherTarjeta && !folioVoucher) {
      return {
        valido: false,
        codigoError: 'VOUCHER_REQUERIDO',
        mensaje: 'Ingresa el folio de autorización del voucher.',
      };
    }
    if (folioVoucher && (folioVoucher.length > 100 || contieneCaracteresPeligrosos(folioVoucher))) {
      return {
        valido: false,
        codigoError: 'VOUCHER_INVALIDO',
        mensaje: 'El folio del voucher contiene caracteres no permitidos o excede 100 caracteres.',
      };
    }
    if (!TIPOS_TARJETA_VALIDOS.has(tipoTarjeta)) {
      return {
        valido: false,
        codigoError: 'TIPO_TARJETA_INVALIDO',
        mensaje: 'El tipo de tarjeta debe ser DEBITO o CREDITO.',
      };
    }
    if (!MARCAS_TARJETA_VALIDAS.has(marcaTarjeta)) {
      return {
        valido: false,
        codigoError: 'MARCA_TARJETA_INVALIDA',
        mensaje: 'La marca de tarjeta seleccionada no es válida.',
      };
    }
    if (ultimosDigitos && !/^\d{4}$/.test(ultimosDigitos)) {
      return {
        valido: false,
        codigoError: 'DIGITOS_TARJETA_INVALIDOS',
        mensaje: 'Los últimos dígitos de la tarjeta deben ser exactamente 4 números.',
      };
    }

    return {
      valido: true,
      codigo,
      total: totalNum,
      montoRecibido: totalNum,
      cambio: 0,
      payloadPago: {
        folioVoucher: folioVoucher || null,
        tipoTarjeta,
        marcaTarjeta,
        ultimosDigitos: ultimosDigitos || null,
      },
    };
  }

  if (codigo === METODOS_PAGO_CODIGO.TRANSFERENCIA) {
    const referencia = String(
      datosTransferencia?.referencia ?? datosTransferencia?.referenciaTransferencia ?? ''
    ).trim();

    if (requerirReferenciaTransferencia && !referencia) {
      return {
        valido: false,
        codigoError: 'REFERENCIA_REQUERIDA',
        mensaje: 'Ingresa la clave de rastreo o referencia bancaria.',
      };
    }
    if (referencia && (referencia.length > 100 || contieneCaracteresPeligrosos(referencia))) {
      return {
        valido: false,
        codigoError: 'REFERENCIA_INVALIDA',
        mensaje: 'La referencia de transferencia no es válida o excede 100 caracteres.',
      };
    }

    return {
      valido: true,
      codigo,
      total: totalNum,
      montoRecibido: totalNum,
      cambio: 0,
      payloadPago: {
        referenciaTransferencia: referencia || null,
      },
    };
  }

  return {
    valido: true,
    codigo: METODOS_PAGO_CODIGO.MERCADO_PAGO,
    total: totalNum,
    montoRecibido: totalNum,
    cambio: 0,
    requiereRedireccion: true,
    payloadPago: undefined,
  };
}
