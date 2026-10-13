import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class ClienteMembresiaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'clientes-membresias', 'membresía');
    }

    obtenerHistorialPorCliente(clienteId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/cliente/${clienteId}`),
            'Error al obtener el historial de membresías'
        );
    }

    obtenerActivaPorCliente(clienteId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/cliente/${clienteId}/activa`),
            'Error al obtener la membresía activa'
        );
    }

    asignar(datos) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/`, datos),
            'Error al asignar membresía'
        );
    }

    renovar(id, datos = {}) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}/renovar`, datos),
            'Error al renovar membresía'
        );
    }

    cancelar(id) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}/cancelar`),
            'Error al cancelar membresía'
        );
    }
}
