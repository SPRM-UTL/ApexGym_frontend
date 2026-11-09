import { CatalogoService } from './CatalogoService.js';
import { httpClient } from './httpClient.js';

export class CategoriaProductoService extends CatalogoService {
    constructor(urlBase) {
        super(urlBase, 'categorias-productos', 'categorías de productos');
    }

    obtenerParaVenta() {
        return this.ejecutar(
            () => httpClient.get(`${this.urlApi}/filtro-venta`),
            'Error al obtener categorías para ventas'
        );
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
