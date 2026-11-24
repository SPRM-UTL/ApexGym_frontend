import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class AlmacenService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'almacenes', 'almacenes');
    }

    obtenerInventario(almacenId) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/${almacenId}/inventario`),
            'Error al obtener el inventario del almacén'
        );
    }

    ajustarStock(almacenId, productoId, data) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${almacenId}/inventario/${productoId}`, data),
            'Error al ajustar el stock en el almacén'
        );
    }

    transferirStock(data) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/transferir`, data),
            'Error al transferir el stock entre almacenes'
        );
    }
}

export default AlmacenService;
