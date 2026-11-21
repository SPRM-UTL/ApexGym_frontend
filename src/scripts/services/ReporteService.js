import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

function limpiarParametros(params = {}) {
    if (!params || typeof params !== 'object') return undefined;
    const limpio = {};
    for (const [clave, valor] of Object.entries(params)) {
        if (valor !== undefined && valor !== null && valor !== '') {
            limpio[clave] = valor;
        }
    }
    return Object.keys(limpio).length > 0 ? limpio : undefined;
}

export class ReporteService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'reportes', 'reportes');
    }

    consultarReporte(endpoint, params, mensajeFallback) {
        const limpios = limpiarParametros(params);
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/${endpoint}`, { params: limpios }),
            mensajeFallback
        );
    }

    obtenerResumen(params = {}) {
        return this.consultarReporte('resumen', params, 'Error al obtener el resumen de reportes');
    }

    obtenerVentas(params = {}) {
        return this.consultarReporte('ventas', params, 'Error al obtener el reporte de ventas');
    }

    obtenerRendimiento(params = {}) {
        return this.consultarReporte('rendimiento', params, 'Error al obtener el reporte de rendimiento');
    }

    obtenerTopProductos(params = {}) {
        return this.consultarReporte('top-productos', params, 'Error al obtener el top de productos vendidos');
    }
}

export default ReporteService;
