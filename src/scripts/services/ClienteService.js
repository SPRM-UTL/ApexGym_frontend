import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class ClienteService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'clientes', 'cliente');
    }

    buscarPorNombreOId(termino, pagina = 1, limite = 20) {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/buscar`, {
                params: { q: termino, pagina, limite },
            }),
            'Error al buscar clientes'
        );
    }
}
