import { appUrl } from '../constantes.js';
import { UsuarioService } from './UsuarioService.js';
import { SeccionService } from './SeccionService.js';
import { RolService } from './RolService.js';

export class ApiService {
    constructor() {
        this.urlBase = appUrl;
        this.user = new UsuarioService(this.urlBase);
        this.seccion = new SeccionService(this.urlBase);
        this.rol = new RolService(this.urlBase);
    }
}

export const api = new ApiService();
