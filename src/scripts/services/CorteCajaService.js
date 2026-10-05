import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class CorteCajaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'cortes-caja', 'cortes de caja');
    }
    obtenerPorApertura(aperturaCajaId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/apertura/${aperturaCajaId}`),
            'Error al obtener corte'
        );
    }
    validar(id) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}/validar`),
            'Error al validar el corte de caja'
        );
    }
}
