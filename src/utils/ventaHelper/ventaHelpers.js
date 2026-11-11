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

export const obtenerNombreEmpleado = (empleado) =>
    [empleado?.nombre, empleado?.apellidoPaterno, empleado?.apellidoMaterno]
        .filter(Boolean)
        .join(' ') || 'Empleado sin nombre';
