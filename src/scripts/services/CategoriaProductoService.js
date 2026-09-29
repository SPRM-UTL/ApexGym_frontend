import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class CategoriaProductoService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        // La subruta exacta que montaste en Express:
        this.urlApi = `${urlBase}/api/categorias-productos`;
    }

    async obtenerTodas() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener categorías',
                error.response?.status || 500
            );
        }
    }

    async crear(nombre, descripcion) {
        try {
            // POST a la raíz / (sin /crearCategoria)
            const response = await httpClient.post(`${this.urlApi}/`, {
                nombre,
                descripcion,
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al crear la categoría',
                error.response?.status || 500
            );
        }
    }

    async actualizar(id, nombre, descripcion) {
        try {
            // PUT a la raíz / enviando id en el body
            const response = await httpClient.put(`${this.urlApi}/`, {
                id,
                nombre,
                descripcion,
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al actualizar la categoría',
                error.response?.status || 500
            );
        }
    }

    async eliminar(id) {
        try {
            // DELETE a la raíz / enviando id en el body
            const response = await httpClient.delete(`${this.urlApi}/`, {
                data: { id },
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al eliminar la categoría',
                error.response?.status || 500
            );
        }
    }
}