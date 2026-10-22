import { CatalogoService } from './CatalogoService.js';

export class ServicioService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'servicios', 'servicios');
    }
}
