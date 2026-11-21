import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class PedidoCompraService {
    constructor(urlBase) {
        this.urlApi = `${urlBase}/api/pedidos-compra`;
    }

    async ejecutar(peticion, mensajeFallback) {
        try {
            const response = await peticion();
            return response.data;
        } catch (error) {
            const respuestaError = error?.response?.data || null;
            throw new ResponseModel(
                respuestaError,
                1,
                respuestaError?.message || mensajeFallback,
                error?.response?.status || 500
            );
        }
    }

    obtenerTodos(estado = '') {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/`, {
                params: estado ? { estado } : undefined,
            }),
            'Error al obtener los pedidos de compra'
        );
    }

    obtenerPorId(id) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/${id}`),
            'Error al obtener el pedido de compra'
        );
    }

    crear(datos) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/`, datos),
            'Error al crear el pedido de compra'
        );
    }

    aprobar(id, observaciones = null) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/${id}/aprobar`, observaciones ? { observaciones } : {}),
            'Error al aprobar el pedido de compra'
        );
    }

    rechazar(id, motivoRechazo = null) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/${id}/rechazar`, motivoRechazo ? { motivoRechazo } : {}),
            'Error al rechazar el pedido de compra'
        );
    }
}
