import {
    obtenerNombreCliente,
    obtenerNombreEmpleado,
} from '../ventaHelper/ventaHelpers.js';

const formatearMonto = (valor) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
}).format(Number(valor) || 0);

const obtenerNombreArticulo = (item) =>
    item.articuloNombre
    ?? item.producto?.nombre
    ?? item.servicio?.nombre
    ?? item.tipoMembresia?.nombre
    ?? item.membresia?.nombre
    ?? item.descripcion
    ?? 'Artículo';

const formatearFecha = (fecha) => {
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) return '—';
    return new Date(fecha).toLocaleString('es-MX');
};

export function prepararDatosTicketVenta(venta) {
    if (!venta || typeof venta !== 'object') {
        throw new Error('No se recibieron los datos de la venta.');
    }

    const subtotal = Number(venta.subtotal ?? 0);
    const total = Number(venta.total ?? subtotal);

    return {
        folio: venta.folioVentaId ?? venta.folioVenta?.id ?? venta.id ?? '—',
        fecha: formatearFecha(venta.createdAt ?? venta.fecha),
        cliente: obtenerNombreCliente(venta.cliente ?? venta.client),
        empleado: obtenerNombreEmpleado(venta.empleado),
        caja: venta.aperturaCaja?.caja?.nombre
            ?? `Apertura #${venta.aperturaCajaId ?? venta.aperturaCaja?.id ?? '—'}`,
        metodoPago: venta.metodoPago?.nombre ?? '—',
        estado: venta.estado ?? 'completada',
        motivoCancelacion: venta.motivoCancelacion ?? '',
        subtotal: formatearMonto(subtotal),
        iva: formatearMonto(Number(venta.iva ?? venta.impuestoIVA ?? total - subtotal)),
        total: formatearMonto(total),
        productos: (venta.detalleVenta ?? venta.detalles ?? []).map((item) => {
            const cantidad = Number(item.cantidad ?? 0);
            const precioUnitario = Number(item.precioUnitario ?? item.precio ?? 0);
            return {
                id: item.id,
                descripcion: obtenerNombreArticulo(item),
                cantidad,
                precioUnitario: formatearMonto(precioUnitario),
                importe: formatearMonto(Number(item.subtotal ?? cantidad * precioUnitario)),
            };
        }),
    };
}
