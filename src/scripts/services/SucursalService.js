import { CatalogoService } from './CatalogoService.js';

export class SucursalService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'sucursal', 'sucursal');
    }
}
