import { appUrl } from '../constantes.js';
import { UsuarioService } from './UsuarioService.js';
import { SeccionService } from './SeccionService.js';

export class ApiService {
    constructor() {
        this.urlBase = appUrl;
        this.user = new UsuarioService(this.urlBase);
        this.seccion = new SeccionService(this.urlBase);
    }
}

export const api = new ApiService();
