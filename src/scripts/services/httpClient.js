import axios from 'axios';
import { obtenerToken } from '../constantes.js';

/**
 * Cliente HTTP compartido: adjunta Bearer token cuando existe sesión activa.
 */
export const httpClient = axios.create();

httpClient.interceptors.request.use((config) => {
    const token = obtenerToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
