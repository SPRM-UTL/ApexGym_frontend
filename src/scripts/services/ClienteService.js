import { CatalogoService } from './CatalogoService.js';

export class ClienteService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'clientes', 'cliente');
    }
}
