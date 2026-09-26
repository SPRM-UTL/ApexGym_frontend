import axios from 'axios';
import { ResponseModel } from './models/ResponseModel.js';
import { obtenerToken } from '../constantes.js';

export class UsuarioService {
    constructor(urlBase) {
        this.urlBase = urlBase;
        this.urlApi = urlBase + '/api/usuarios';
    }

    /** Devuelve los headers con Authorization si hay token disponible */
    #headersAutenticados() {
        const token = obtenerToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
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
            const response = await axios.post(`${this.urlApi}/registrarUsuario`, {
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
            const response = await axios.get(`${this.urlApi}/`, {
                headers: this.#headersAutenticados(),
            });
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

            const response = await axios.put(`${this.urlApi}/actualizarUsuario`, body, {
                headers: this.#headersAutenticados(),
            });
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
            const response = await axios.delete(`${this.urlApi}/eliminarUsuario`, {
                headers: this.#headersAutenticados(),
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
