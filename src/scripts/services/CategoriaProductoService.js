import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';
import { CatalogoService } from './CatalogoService.js';
export class CategoriaProductoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'categorias-productos', 'categorías de productos');
    }
    // Alias para compatibilidad con el módulo de Productos
    obtenerTodas() {
        return this.obtenerTodos();
    }
}
