import { CatalogoService } from './CatalogoService.js';

export class EstadoClienteService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'estados-cliente', 'estado de cliente');
    }
}
