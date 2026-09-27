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
}
