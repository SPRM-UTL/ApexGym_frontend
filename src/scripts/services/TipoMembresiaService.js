import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';
import { prepararDatos } from '../globales.js';

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

    crear(datos) {
        const datosMembresia = prepararDatos(datos);
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/`, datosMembresia),
            'Error al crear el tipo de membresía'
        );
    }

    actualizar(id, datos) {
        const datosMembresia = prepararDatos(datos);
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}`, datosMembresia),
            'Error al actualizar el tipo de membresía'
        );
    }
}