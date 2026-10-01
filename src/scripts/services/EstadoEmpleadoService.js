import { CatalogoService } from './CatalogoService.js';

export class EstadoEmpleadoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'estados-empleado', 'estados de empleado');
    }
}
