import { CatalogoService } from './CatalogoService.js';

export class ConfiguracionSistemaService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'configuraciones-sistema', 'configuraciones');
    }
}
