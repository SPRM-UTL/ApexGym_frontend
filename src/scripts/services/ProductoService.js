import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

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
            const response = await httpClient.post(`${this.urlApi}/`, datos);
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
            const response = await httpClient.put(`${this.urlApi}/`, {
                productoId,
                ...datos,
            });
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