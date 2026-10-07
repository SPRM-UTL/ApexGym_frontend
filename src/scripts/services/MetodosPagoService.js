import { ResponseModel } from './models/ResponseModel.js'
import { httpClient } from './httpClient.js'
import { CatalogoService } from './CatalogoService.js';

export class MetodosPagoService extends CatalogoService{
    constructor(urlBase){
        super(urlBase, 'metodos-pago', 'métodos de pago');
    }
} 