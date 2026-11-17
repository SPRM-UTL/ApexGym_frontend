import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class TipoMembresiaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'tipos-membresia', 'tipo de membresía');
    }

    obtenerDisponiblesParaVenta(sucursalId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/venta/disponibles`, {
                headers: { 'x-sucursal-id': String(sucursalId) },
            }),
            'Error al obtener membresías disponibles para venta'
        );
    }
}
