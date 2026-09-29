import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class MovimientoCajaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'movimientos-caja', 'movimientos de caja');
    }
    obtenerPorApertura(aperturaCajaId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/apertura/${aperturaCajaId}`),
            'Error al obtener movimientos'
        );
    }
}
