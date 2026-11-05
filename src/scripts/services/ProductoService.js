import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

function convertirImagenADataUrl(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(typeof lector.result === 'string' ? lector.result : null);
        lector.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        lector.readAsDataURL(archivo);
    });
}

async function prepararDatosProducto(datos) {
    const { imagen, ...resto } = datos;
    if (typeof File !== 'undefined' && imagen instanceof File) {
        resto.imagenUrl = await convertirImagenADataUrl(imagen);
    }
    return resto;
}

export class ProductoService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = `${urlBase}/api/productos`;
    }

    async obtenerTodos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener los productos',
                error.response?.status || 500
            );
        }
    }

    // Alias para compatibilidad si se llama obtenerTodas
    async obtenerTodas() {
        return this.obtenerTodos();
    }

    async crear(datos) {
        try {
            const datosProducto = await prepararDatosProducto(datos);
            const response = await httpClient.post(
                `${this.urlApi}/`,
                datosProducto
            );
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al crear el producto',
                error.response?.status || 500
            );
        }
    }

    async actualizar(productoId, datos) {
        try {
            const datosProducto = await prepararDatosProducto(datos);
            datosProducto.productoId = Number(productoId);
            const response = await httpClient.put(`${this.urlApi}/`, datosProducto);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al actualizar el producto',
                error.response?.status || 500
            );
        }
    }

    async eliminar(productoId) {
        try {
            const response = await httpClient.delete(`${this.urlApi}/`, {
                data: { productoId },
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al eliminar el producto',
                error.response?.status || 500
            );
        }
    }
}
