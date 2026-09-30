import { CatalogoService } from './CatalogoService.js';

export class CajaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'cajas', 'cajas');
    }
}
