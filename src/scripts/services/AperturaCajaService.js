import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class AperturaCajaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'aperturas-caja', 'aperturas de caja');
    }

    obtenerPorId(id) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/${id}`),
            'Error al obtener la apertura de caja'
        );
    }

    obtenerAbiertas() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/abierta`),
            'Error al obtener las aperturas de caja abiertas'
        );
    }

    cerrar(id) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/${id}/cerrar`),
            'Error al cerrar la apertura'
        );
    }
}
