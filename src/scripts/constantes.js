import { obtenerValor, guardarValor, eliminarValor, limpiarAlmacenamiento } from './globales.js';

export const VariablesLocales = {
    TOKEN: 'token',
};

export const estaAutenticado = () => {
    const token = obtenerValor(VariablesLocales.TOKEN, 'session') || obtenerValor(VariablesLocales.TOKEN, 'local');
    return !!token;
}

export const obtenerToken = () => {
    return obtenerValor(VariablesLocales.TOKEN, 'session') || obtenerValor(VariablesLocales.TOKEN, 'local');
}

export const guardarToken = (valor, persistente = false) => {
    const tipo = persistente ? 'local' : 'session';
    eliminarToken();
    guardarValor(VariablesLocales.TOKEN, valor, tipo);
}

export const eliminarToken = () => {
    eliminarValor(VariablesLocales.TOKEN);
}

export const limpiarSesionCompleta = () => {
    limpiarAlmacenamiento();
}
