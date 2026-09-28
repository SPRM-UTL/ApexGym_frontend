import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class RolService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = urlBase + '/api/roles';
    }

    async obtenerTodos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener roles',
                error.response?.status || 500
            );
        }
    }

    async obtenerPermisos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/permisos`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener permisos',
                error.response?.status || 500
            );
        }
    }

    async crear(datos) {
        try {
            const response = await httpClient.post(`${this.urlApi}/`, datos);
            return response.data;
        } catch (error) {
            throw new ResponseModel(error.response?.data || null, 1, error.response?.data?.message || 'Error al crear rol', error.response?.status || 500);
        }
    }

    async actualizar(id, datos) {
        try {
            const response = await httpClient.put(`${this.urlApi}/${id}`, datos);
            return response.data;
        } catch (error) {
            throw new ResponseModel(error.response?.data || null, 1, error.response?.data?.message || 'Error al actualizar rol', error.response?.status || 500);
        }
    }

    async eliminar(id) {
        try {
            const response = await httpClient.delete(`${this.urlApi}/${id}`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(error.response?.data || null, 1, error.response?.data?.message || 'Error al eliminar rol', error.response?.status || 500);
        }
    }
}
