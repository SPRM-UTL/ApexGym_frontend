import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class ServicioService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'servicios', 'servicios');
    }

    obtenerDisponiblesParaVenta(sucursalId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/venta/disponibles`, {
                headers: { 'x-sucursal-id': String(sucursalId) },
            }),
            'Error al obtener servicios disponibles para venta'
        );
    }
}
