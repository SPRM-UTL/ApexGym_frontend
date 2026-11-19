import { prepararDatos } from '../globales.js';
import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class ServicioService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'servicios', 'servicios');
    }

    crear(datos) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/`, prepararDatos(datos)),
            'Error al crear servicios'
        );
    }

    actualizar(id, datos) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}`, prepararDatos(datos)),
            'Error al actualizar servicios'
        );
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
