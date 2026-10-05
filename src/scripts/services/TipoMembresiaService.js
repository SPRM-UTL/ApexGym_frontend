import { CatalogoService } from './CatalogoService.js';

export class TipoMembresiaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'tipos-membresia', 'tipo de membresía');
    }
}
