import { CatalogoService } from './CatalogoService.js';

export class CategoriaProductoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'categorias-productos', 'categorías de productos');
    }

    // Alias para compatibilidad con el módulo de Productos
    obtenerTodas() {
        return this.obtenerTodos();
    }

    crear(datosONombre, descripcion) {
        const payload =
            typeof datosONombre === 'object' && datosONombre !== null
                ? datosONombre
                : { nombre: datosONombre, descripcion };
        return super.crear(payload);
    }

    actualizar(id, datosONombre, descripcion) {
        const payload =
            typeof datosONombre === 'object' && datosONombre !== null
                ? datosONombre
                : { nombre: datosONombre, descripcion };
        return super.actualizar(id, payload);
    }

    eliminar(id) {
        return super.eliminar(id);
    }
}
