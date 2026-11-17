import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class VisitaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'visitas', 'visita');
    }

    obtenerPorPeriodo(fechaInicio, fechaFin) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/`, { params: { fechaInicio, fechaFin } }),
            'Error al obtener visitas por periodo'
        );
    }
}
