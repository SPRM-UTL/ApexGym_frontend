import { CatalogoService } from './CatalogoService.js';

export class EstadoMembresiaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'estados-membresia', 'estado de membresía');
    }
}
