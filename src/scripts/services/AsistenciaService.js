import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class AsistenciaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'asistencias', 'asistencia');
    }

    buscarClientes(termino) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/buscar-cliente`, { params: { q: termino } }),
            'Error al buscar clientes'
        );
    }

    validarYRegistrar(clienteId, observaciones = null) {
        return this.ejecutar(
            () => httpClient.post(`${this.urlApi}/validar-y-registrar`, { clienteId, observaciones }),
            'Error al validar y registrar asistencia'
        );
    }

    obtenerHoy(fecha = null) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/hoy`, { params: fecha ? { fecha } : {} }),
            'Error al obtener asistencias del día'
        );
    }

    obtenerHistorialPorCliente(clienteId, pagina = 1, limite = 20) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/cliente/${clienteId}`, { params: { pagina, limite } }),
            'Error al obtener historial del cliente'
        );
    }
}
