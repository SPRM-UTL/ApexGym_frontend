import { appUrl } from '../scripts/constantes.js';
import { UsuarioService } from './UsuarioService.js';

export class ApiService {
    constructor() {
        this.urlBase = appUrl;
        this.user = new UsuarioService(this.urlBase);
    }
}

export const api = new ApiService();