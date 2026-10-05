import { obtenerValor, guardarValor, eliminarValor, limpiarAlmacenamiento } from './globales.js';

export const appUrl = 'http://localhost:3000';

/**Solo me encargue de comentar todo tipo de cosas que almacenen el token */
export const VariablesLocales = {
    /**TOKEN: 'token',**/
    USUARIO: 'usuario_actual',
};
/**  Ya no se ocupan para evitar que las guarde
export const estaAutenticado = () => {
    const token = obtenerValor(VariablesLocales.TOKEN, 'session') || obtenerValor(VariablesLocales.TOKEN, 'local');
    return !!token && token !== 'undefined' && token !== 'null';
}

export const obtenerToken = () => {
    const token = obtenerValor(VariablesLocales.TOKEN, 'session') || obtenerValor(VariablesLocales.TOKEN, 'local');
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
}

export const guardarToken = (valor, persistente = false) => {
    const tipo = persistente ? 'local' : 'session';
    eliminarToken();
    guardarValor(VariablesLocales.TOKEN, valor, tipo);
}*/

export const guardarUsuarioActual = (usuario, persistente = false) => {
    const tipo = persistente ? 'local' : 'session';
    eliminarValor(VariablesLocales.USUARIO);
    guardarValor(VariablesLocales.USUARIO, usuario, tipo);
};

export const obtenerEsPersistente = () => {
    const usuarioDeSesion = obtenerValor(VariablesLocales.USUARIO, 'session');

    if (usuarioDeSesion !== null) {
        return false;
    }

    return obtenerValor(VariablesLocales.USUARIO, 'local') !== null;
};

export const obtenerUsuarioActual = () => {
    return obtenerValor(VariablesLocales.USUARIO, 'session') || obtenerValor(VariablesLocales.USUARIO, 'local');
};
/** 
export const eliminarToken = () => {
    eliminarValor(VariablesLocales.TOKEN);
}
*/
export const eliminarUsuarioActual = () => {
    eliminarValor(VariablesLocales.USUARIO);
};

export const limpiarSesionCompleta = () => {
    limpiarAlmacenamiento();
}

export const resolverUrlImagen = (ruta) => {
    if (!ruta) return null;
    if (
        ruta.startsWith('http://') ||
        ruta.startsWith('https://') ||
        ruta.startsWith('blob:') ||
        ruta.startsWith('data:')
    ) {
        return ruta;
    }
    return `${appUrl}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
};
