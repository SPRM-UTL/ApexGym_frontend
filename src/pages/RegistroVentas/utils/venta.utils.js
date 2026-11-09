import { resolverUrlImagen } from '../../../scripts/constantes.js';

export const normalizar = (lista) => (lista ?? []).map((item) => ({
    ...item,
    imagen: resolverUrlImagen(item.imagenUrl ?? item.imagen),
    precio: Number(item.precioVenta ?? item.precio),
}));

export const obtenerLista = (respuesta) => {
    let contenido = respuesta;
    while (!Array.isArray(contenido) && contenido?.data != null) {
        contenido = contenido.data;
    }
    if (Array.isArray(contenido)) return contenido;
    throw new Error('El servidor devolvió un formato de catálogo no válido.');
};

export const obtenerPagina = (respuesta) => {
    let contenido = respuesta;
    while (contenido?.data != null && !Array.isArray(contenido.registros)) {
        contenido = contenido.data;
    }
    if (!Array.isArray(contenido?.registros)) {
        throw new Error('El servidor devolvió un formato de catálogo paginado no válido.');
    }

    const total = Number(contenido.total);
    if (!Number.isSafeInteger(total) || total < 0) {
        throw new Error('El servidor devolvió un total de catálogo no válido.');
    }
    return { registros: contenido.registros, total };
};

export const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

export function calcularMontos(items) {
    const subtotal = redondear(
        items.reduce((acumulado, item) => acumulado + redondear(item.precio * item.cantidad), 0)
    );
    const iva = redondear(subtotal * 0.16);
    return { subtotal, iva, total: redondear(subtotal + iva) };
}

export function normalizarTextoBusqueda(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();
}
