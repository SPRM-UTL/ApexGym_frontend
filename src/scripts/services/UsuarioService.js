import axios from 'axios';
import { ResponseModel } from './models/ResponseModel.js';

export class UsuarioService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = urlBase + '/api/usuarios';
    }

    async login(email, password) {
        try {
            const response = await axios.post(`${this.urlApi}/verificarCredenciales`, {
                email,
                password
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error en el login',
                error.response?.status || 500
            );
        }
    }

    async register(nombre, email, contrasenia) {
        try {
            const response = await axios.post(`${this.urlApi}/registrarUsuario`, {
                nombre,
                email,
                contrasenia
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error en el registro',
                error.response?.status || 500
            );
        }
    }
}
