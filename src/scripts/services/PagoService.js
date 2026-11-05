import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class PagoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'pagos', 'transacciones');
    }

    /**
     * Crea una intención o registro de cobro con idempotencia.
     */
    crearCobro(datos, uuidIdempotencia = null) {
        const headers = uuidIdempotencia ? { 'X-Idempotency-Key': uuidIdempotencia } : {};
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/crear-cobro`, datos, { headers }),
            'Error al procesar el cobro'
        );
    }

    /**
     * Simula la aprobación o rechazo de una transacción en desarrollo.
     */
    simularResolucion(id, estado = 'APROBADO') {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/simular-resolucion/${id}`, { estado }),
            'Error al simular resolución del pago'
        );
    }

    /**
     * Reembolsa una transacción aprobada.
     */
    reembolsar(id, motivo = 'Reembolso en caja') {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/reembolsar/${id}`, { motivo }),
            'Error al procesar el reembolso'
        );
    }

    /**
     * Obtiene el resumen de métricas de pagos.
     */
    obtenerResumen() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/resumen`),
            'Error al obtener resumen de pagos'
        );
    }

    /**
     * Obtiene el listado de transacciones.
     */
    obtenerTransacciones() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/transacciones`),
            'Error al obtener transacciones'
        );
    }
}
