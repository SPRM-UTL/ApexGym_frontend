import axios from 'axios';
import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class UsuarioService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = urlBase + '/api/usuarios';
    }

    async login(email, contrasenia) {
        try {
            const response = await axios.post(`${this.urlApi}/verificarCredenciales`, {
                email,
                contrasenia,
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al iniciar sesión',
                error.response?.status || 500
            );
        }
    }

    async register(nombre, email, contrasenia) {
        try {
            const response = await httpClient.post(`${this.urlApi}/registrarUsuario`, {
                nombre,
                email,
                contrasenia,
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al registrar usuario',
                error.response?.status || 500
            );
        }
    }

    async obtenerTodos() {
        try {
            const response = await httpClient.get(`${this.urlApi}/`);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al obtener usuarios',
                error.response?.status || 500
            );
        }
    }

    async actualizarUsuario(id, nombre, email, contrasenia) {
        try {
            const body = { id, nombre, email };
            if (contrasenia) body.contrasenia = contrasenia;

            const response = await httpClient.put(`${this.urlApi}/actualizarUsuario`, body);
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al actualizar usuario',
                error.response?.status || 500
            );
        }
    }

    async eliminarUsuario(id) {
        try {
            const response = await httpClient.delete(`${this.urlApi}/eliminarUsuario`, {
                data: { id },
            });
            return response.data;
        } catch (error) {
            throw new ResponseModel(
                error.response?.data || null,
                1,
                error.response?.data?.message || 'Error al eliminar usuario',
                error.response?.status || 500
            );
        }
    }
}
