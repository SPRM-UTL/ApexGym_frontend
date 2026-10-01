import { CatalogoService } from './CatalogoService.js';

export class EmpleadoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'empleados', 'empleados');
    }
}
