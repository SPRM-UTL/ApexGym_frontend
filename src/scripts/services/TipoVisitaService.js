import { CatalogoService } from './CatalogoService.js';

export class TipoVisitaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'tipos-visita', 'tipo de visita');
    }
}
