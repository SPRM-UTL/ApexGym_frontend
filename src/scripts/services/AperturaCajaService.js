import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class AperturaCajaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'aperturas-caja', 'aperturas de caja');
    }
    cerrar(id) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/${id}/cerrar`),
            'Error al cerrar la apertura'
        );
    }
}
