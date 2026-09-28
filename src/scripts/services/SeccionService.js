import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class SeccionService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = urlBase + '/api/secciones';
    }

    /**
     * Devuelve las secciones con módulos a los que el usuario tiene permiso.
     * @returns {Promise<Array>} secciones con módulos
     */
    async obtenerMisSecciones() {
        try {
            const response = await httpClient.get(`${this.urlApi}/mis-secciones`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener secciones',
                error.response?.status || 500
            );
        }
    }
}
