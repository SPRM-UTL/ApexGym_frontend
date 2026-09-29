import { appUrl } from '../constantes.js';
import { UsuarioService } from './UsuarioService.js';
import { SeccionService } from './SeccionService.js';
import { RolService } from './RolService.js';
import { TipoActividadService } from './TipoActividadService.js';
import { AreaTrabajoService } from './AreaTrabajoService.js';
import { ConfiguracionSistemaService } from './ConfiguracionSistemaService.js';
import { CategoriaProductoService } from './CategoriaProductoService.js';

export class ApiService {
    constructor() {
        this.urlBase = appUrl;
        this.user = new UsuarioService(this.urlBase);
        this.seccion = new SeccionService(this.urlBase);
        this.rol = new RolService(this.urlBase);
        this.tipoActividad = new TipoActividadService(this.urlBase);
        this.areaTrabajo = new AreaTrabajoService(this.urlBase);
        this.configuracionSistema = new ConfiguracionSistemaService(this.urlBase);
        this.categoriaProducto = new CategoriaProductoService(this.urlBase);
    }
}

export const api = new ApiService();
