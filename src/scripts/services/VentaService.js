
import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class VentaService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = `${urlBase}/api/ventas`;
    }

    async crearVenta(datosVenta, sucursalId, uuidIdempotencia = null) {
        try {
            const response = await httpClient.post(`${this.urlApi}/`, datosVenta, {
                headers: {
                    'x-sucursal-id': String(sucursalId),
                    ...(uuidIdempotencia ? { 'x-idempotency-key': uuidIdempotencia } : {}),
                },
            });
            return response.data;
        } catch (error) {
            const respuestaError = error.response?.data;
            throw new ResponseModel(
                respuestaError?.data ?? respuestaError ?? null,
                1,
                respuestaError?.message || 'Error al crear la venta',
                error.response?.status || 500
            );
        }
    }

    async consultarEstadoPago(id, paymentId = null) {
        try {
            const response = await httpClient.get(`${this.urlApi}/${id}/pago`, {
                params: paymentId ? { payment_id: paymentId } : {},
            });
            return response.data;
        } catch (error) {
            const respuestaError = error.response?.data;
            throw new ResponseModel(
                respuestaError?.data ?? respuestaError ?? null,
                1,
                respuestaError?.message || 'Error al consultar el estado del pago',
                error.response?.status || 500
            );
        }
    }

    async obtenerCheckoutPago(id) {
        try {
            const response = await httpClient.post(`${this.urlApi}/${id}/pago/checkout`);
            return response.data;
        } catch (error) {
            const respuestaError = error.response?.data;
            throw new ResponseModel(
                respuestaError?.data ?? respuestaError ?? null,
                1,
                respuestaError?.message || 'Error al recuperar el checkout del pago',
                error.response?.status || 500
            );
        }
    }
    async obtenerTodos(parametros = {}) {
        try {
            const response = await httpClient.get(`${this.urlApi}/`, { params: parametros });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener las ventas',
                error.response?.status || 500
            );
        }
    }

    async obtenerResumen(parametros = {}) {
        try {
            const response = await httpClient.get(`${this.urlApi}/resumen`, { params: parametros });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener el resumen de ventas',
                error.response?.status || 500
            );
        }
    }

    async obtenerPorId(id) {
        try {
            const response = await httpClient.get(`${this.urlApi}/${id}`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener la venta',
                error.response?.status || 500
            );
        }
    }

    async obtenerDisponibilidadDevolucion(id) {
        try {
            const response = await httpClient.get(
                `${this.urlApi}/${id}/devoluciones/disponibilidad`
            );
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener la disponibilidad de devolución',
                error.response?.status || 500
            );
        }
    }

    async previsualizarDevolucion(id, detalles) {
        try {
            const response = await httpClient.post(
                `${this.urlApi}/${id}/devoluciones/previsualizar`,
                { detalles }
            );
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al previsualizar la devolución',
                error.response?.status || 500
            );
        }
    }

    async crearDevolucion(id, datosDevolucion) {
        try {
            const response = await httpClient.post(
                `${this.urlApi}/${id}/devoluciones`,
                datosDevolucion
            );
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al registrar la devolución',
                error.response?.status || 500
            );
        }
    }

    async cancelar(id, motivoCancelacion, datosReembolso = {}) {
        const motivo = typeof motivoCancelacion === 'string'
            ? motivoCancelacion.trim()
            : '';
        if (!motivo || motivo.length > 500) {
            throw new Error('El motivo de cancelación es obligatorio y no debe exceder 500 caracteres.');
        }

        try {
            const response = await httpClient.post(
                `${this.urlApi}/${id}/cancelar`,
                {
                    motivoCancelacion: motivo,
                    folioCancelacion: datosReembolso.folioCancelacion,
                    confirmacionTerminal: datosReembolso.confirmacionTerminal,
                }
            );

            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al cancelar la venta',
                error.response?.status || 500
            );
        }
    }

    
}
