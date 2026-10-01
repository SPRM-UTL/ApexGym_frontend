import { appUrl } from '../constantes.js';
import { UsuarioService } from './UsuarioService.js';
import { SeccionService } from './SeccionService.js';
import { RolService } from './RolService.js';
import { TipoActividadService } from './TipoActividadService.js';
import { AreaTrabajoService } from './AreaTrabajoService.js';
import { ConfiguracionSistemaService } from './ConfiguracionSistemaService.js';
import { CategoriaProductoService } from './CategoriaProductoService.js';
import { EstadoClienteService } from './EstadoClienteService.js';
import { ClienteService } from './ClienteService.js';
import { EstadoMembresiaService } from './EstadoMembresiaService.js';
import { TipoMembresiaService } from './TipoMembresiaService.js';
import { TipoVisitaService } from './TipoVisitaService.js';

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
        this.estadoCliente = new EstadoClienteService(this.urlBase);
        this.cliente = new ClienteService(this.urlBase);
        this.estadoMembresia = new EstadoMembresiaService(this.urlBase);
        this.tipoMembresia = new TipoMembresiaService(this.urlBase);
        this.tipoVisita = new TipoVisitaService(this.urlBase);
    }
}

export const api = new ApiService();
