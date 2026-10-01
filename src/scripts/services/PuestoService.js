import { CatalogoService } from './CatalogoService.js';

export class PuestoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'puestos', 'puestos');
    }
}
