
import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class VentaService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = `${urlBase}/api/ventas`;
    }

async crearVenta(datosVenta) {
    try {
        const response = await httpClient.post(`${this.urlApi}/`, datosVenta);
        return response.data;
    } catch (error) {
        throw new ResponseModel(
            error.response?.data || null,
            1,
            error.response?.data?.message || 'Error al crear la venta',
            error.response?.status || 500
        );
    }
}
    async obtenerTodos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
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

    async actualizarVenta(id, metodoPago, descuento, detalleVenta) {
        try {
            const datos = {};

            if (metodoPago !== undefined) {
                datos.metodoPago = metodoPago;
            }

            if (descuento !== undefined) {
                datos.descuento = descuento;
            }

            if (detalleVenta !== undefined) {
                datos.detalleVenta = detalleVenta;
            }

            const response = await httpClient.put(
                `${this.urlApi}/${id}`,
                datos
            );

            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al actualizar la venta',
                error.response?.status || 500
            );
        }
    }

    async cancelarVenta(id) {
        try {
            const response = await httpClient.patch(
                `${this.urlApi}/${id}/cancelar`
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
