export const obtenerVenta = (respuesta) =>
    respuesta?.data?.venta ?? respuesta?.data ?? respuesta;

export const escaparHtml = (valor) => String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
})[caracter]);

export const obtenerNombreCliente = (cliente) =>
    [cliente?.nombre, cliente?.apellidoPaterno, cliente?.apellidoMaterno]
        .filter(Boolean)
        .join(' ') || 'Público general';

export const obtenerRegistros = (respuesta, etiqueta) => {
    let contenido = respuesta;
    while (!Array.isArray(contenido) && contenido?.data != null) {
        contenido = contenido.data;
    }
    if (Array.isArray(contenido)) return contenido;
    throw new Error(`El servidor devolvió un formato no válido para ${etiqueta}.`);
};

export const obtenerEmpleadoIdApertura = (apertura) =>
    apertura.empleadoId ?? apertura.empleado?.id;

export const esErrorCajaCerrada = (error) =>
    error?.data?.code === 'APERTURA_CAJA_CERRADA';

export const obtenerMensajeSeguroVenta = (error, accion = 'la operación') => {
    const codigo = error?.data?.data?.code ?? error?.data?.code ?? error?.code;
    const mensaje = String(error?.message ?? '');

    if (codigo === 'REEMBOLSO_REGISTRADO_PENDIENTE_CONCILIACION') {
        return 'Mercado Pago confirmó el movimiento, pero la actualización quedó pendiente. No repitas la operación y solicita conciliación.';
    }
    if (/Unauthorized use of live credentials|Mercado Pago rechazó el reembolso/i.test(mensaje)) {
        return 'Mercado Pago rechazó el reembolso. Verifica que las credenciales de prueba correspondan al pago.';
    }
    if (codigo === 'VENTA_CON_DEVOLUCIONES') {
        return 'No se puede cancelar una venta que ya tiene una devolución completada o pendiente.';
    }
    if (codigo === 'COTIZACION_DESACTUALIZADA' || codigo === 'DEVOLUCIONES_INCONSISTENTES') {
        return 'La disponibilidad cambió. Actualiza la venta e inténtalo nuevamente.';
    }
    if (codigo === 'MONTO_REEMBOLSO_EXCEDIDO') {
        return 'El reembolso excede el saldo disponible para devolver.';
    }

    return `No se pudo completar ${accion}. Revisa la operación e inténtalo nuevamente.`;
};

export const obtenerNombreEmpleado = (empleado) =>
    [empleado?.nombre, empleado?.apellidoPaterno, empleado?.apellidoMaterno]
        .filter(Boolean)
        .join(' ') || 'Empleado sin nombre';
