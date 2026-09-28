import { CatalogoService } from './CatalogoService.js';

export class TipoActividadService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'tipos-actividad', 'tipos de actividad');
    }
}
