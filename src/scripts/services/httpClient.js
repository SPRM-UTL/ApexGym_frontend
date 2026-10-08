import axios from 'axios';
/**import { obtenerToken } from '../constantes.js';**/
import { apiLoadingStore } from '../apiLoading.js';

/**
 * Cliente HTTP compartido: adjunta Bearer token cuando existe sesión activa.
 */

/** El navegador no guarda las cookies que le devuelve el servidor esto es por que intenta 
 * no acepptar ninguna cookie sin permiso de esta manera le decimos a axios que hacepte la peticion de guardar la cookie
 */

/**Aqui tambien quiite el token para que no lo use de esta manera evitamos que leea el LocalStore o intente traer algun token*/
export const httpClient = axios.create({withCredentials: true});

httpClient.interceptors.request.use((config) => {
    apiLoadingStore.iniciar();
    
    return config;
    /**const token = obtenerToken();*/
    /**if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }**/
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
