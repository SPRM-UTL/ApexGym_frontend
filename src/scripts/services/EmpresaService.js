import { CatalogoService } from './CatalogoService.js';

export class EmpresaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'empresa', 'empresa');
    }
}
