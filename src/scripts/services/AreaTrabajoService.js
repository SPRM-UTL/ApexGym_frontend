import { CatalogoService } from './CatalogoService.js';

export class AreaTrabajoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'areas-trabajo', 'áreas de trabajo');
    }
}
