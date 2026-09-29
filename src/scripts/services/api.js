import { appUrl } from '../constantes.js';
import { UsuarioService } from './UsuarioService.js';
import { SeccionService } from './SeccionService.js';
import { RolService } from './RolService.js';
import { TipoActividadService } from './TipoActividadService.js';
import { AreaTrabajoService } from './AreaTrabajoService.js';
import { ConfiguracionSistemaService } from './ConfiguracionSistemaService.js';
import { CajaService } from './CajaService.js';
import { PuestoService } from './PuestoService.js';
import { EstadoEmpleadoService } from './EstadoEmpleadoService.js';
import { EmpleadoService } from './EmpleadoService.js';

export class ApiService {
    constructor() {
        this.urlBase = appUrl;
        this.user = new UsuarioService(this.urlBase);
        this.seccion = new SeccionService(this.urlBase);
        this.rol = new RolService(this.urlBase);
        this.tipoActividad = new TipoActividadService(this.urlBase);
        this.areaTrabajo = new AreaTrabajoService(this.urlBase);
        this.configuracionSistema = new ConfiguracionSistemaService(this.urlBase);
        this.caja = new CajaService(this.urlBase);
        this.puesto = new PuestoService(this.urlBase);
        this.estadoEmpleado = new EstadoEmpleadoService(this.urlBase);
        this.empleado = new EmpleadoService(this.urlBase);
    }
}

export const api = new ApiService();
