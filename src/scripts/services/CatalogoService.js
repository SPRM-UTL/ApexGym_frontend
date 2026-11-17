import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class CatalogoService {
    constructor(urlBase, recurso, etiqueta = 'registros') {
        this.urlApi = `${urlBase}/api/${recurso}`;
        this.etiqueta = etiqueta;
    }

    async ejecutar(peticion, mensaje) {
        try {
            const response = await peticion();
            return response.data;
        } catch (error) {
            const respuestaError = error?.response?.data || null;
            const mensajeError = respuestaError?.message
                || (!error?.response && error?.message)
                || mensaje;

            throw new ResponseModel(
                respuestaError || null,
                1,
                mensajeError,
                error?.response?.status || 500
            );
        }
    }

    obtenerTodos() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/`),
            `Error al obtener ${this.etiqueta}`
        );
    }

    obtenerPorId(id) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/${id}`),
            `Error al obtener ${this.etiqueta}`
        );
    }

    obtenerCatalogoPaginado(parametros) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/catalogo`, { params: parametros }),
            `Error al obtener ${this.etiqueta}`
        )}
    obtenerActual() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/actual`),
            `Error al obtener ${this.etiqueta} actual`
        );
    }

    crear(datos) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/`, datos),
            `Error al crear ${this.etiqueta}`
        );
    }

    actualizar(id, datos) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/${id}`, datos),
            `Error al actualizar ${this.etiqueta}`
        );
    }

    actualizarActual(datos) {
        return this.ejecutar(
            () => httpClient.put(`${this.urlApi}/actual`, datos),
            `Error al actualizar ${this.etiqueta} actual`
        );
    }

    eliminar(id) {
        return this.ejecutar(
            () => httpClient.delete(`${this.urlApi}/${id}`),
            `Error al eliminar ${this.etiqueta}`
        );
    }
}
