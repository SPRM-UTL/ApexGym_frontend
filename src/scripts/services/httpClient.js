import axios from 'axios';
import { obtenerToken } from '../constantes.js';
import { apiLoadingStore } from '../apiLoading.js';

/**
 * Cliente HTTP compartido: adjunta Bearer token cuando existe sesión activa.
 */
export const httpClient = axios.create();

httpClient.interceptors.request.use((config) => {
    apiLoadingStore.iniciar();
    const token = obtenerToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    apiLoadingStore.finalizar();
    return Promise.reject(error);
});

httpClient.interceptors.response.use(
    (response) => {
        apiLoadingStore.finalizar();
        return response;
    },
    (error) => {
        apiLoadingStore.finalizar();
        return Promise.reject(error);
    }
);
