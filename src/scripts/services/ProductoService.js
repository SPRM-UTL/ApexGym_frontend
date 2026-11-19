import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';
import { prepararDatos } from '../globales.js';

export class ProductoService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = `${urlBase}/api/productos`;
    }

    async obtenerTodos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener los productos',
                error.response?.status || 500
            );
        }
    }

    async obtenerCatalogoPaginado(parametros) {
        try {
            const response = await httpClient.get(`${this.urlApi}/catalogo`, { params: parametros });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener el catálogo de productos',
                error.response?.status || 500
            );
        }
    }

    async obtenerDisponiblesParaVenta(sucursalId) {
        try {
            const response = await httpClient.get(`${this.urlApi}/venta/disponibles`, {
                headers: { 'x-sucursal-id': String(sucursalId) },
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener productos disponibles para venta',
                error.response?.status || 500
            );
        }
    }

    // Alias para compatibilidad si se llama obtenerTodas
    async obtenerTodas() {
        return this.obtenerTodos();
    }

    async crear(datos) {
        try {
            const datosProducto = await prepararDatos(datos);
            const response = await httpClient.post(
                `${this.urlApi}/`,
                datosProducto
            );
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al crear el producto',
                error.response?.status || 500
            );
        }
    }

    async actualizar(productoId, datos) {
        try {
            const datosProducto = await prepararDatosProducto(datos);
            datosProducto.append('productoId', String(Number(productoId)));
            const response = await httpClient.put(`${this.urlApi}/`, datosProducto);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al actualizar el producto',
                error.response?.status || 500
            );
        }
    }

    async eliminar(productoId) {
        try {
            const response = await httpClient.delete(`${this.urlApi}/`, {
                data: { productoId },
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al eliminar el producto',
                error.response?.status || 500
            );
        }
    }
}
