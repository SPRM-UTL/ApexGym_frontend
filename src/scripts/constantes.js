import { obtenerValor, guardarValor, eliminarValor, limpiarAlmacenamiento } from './globales.js';

export const appUrl = 'http://localhost:3000';



export const VariablesLocales = {
    TOKEN: 'token',
    USUARIO: 'usuario_actual',
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

export const guardarUsuarioActual = (usuario, persistente = false) => {
    const tipo = persistente ? 'local' : 'session';
    eliminarValor(VariablesLocales.USUARIO);
    guardarValor(VariablesLocales.USUARIO, usuario, tipo);
};

export const obtenerUsuarioActual = () => {
    return obtenerValor(VariablesLocales.USUARIO, 'session') || obtenerValor(VariablesLocales.USUARIO, 'local');
};

export const eliminarToken = () => {
    eliminarValor(VariablesLocales.TOKEN);
}

export const eliminarUsuarioActual = () => {
    eliminarValor(VariablesLocales.USUARIO);
};

export const limpiarSesionCompleta = () => {
    limpiarAlmacenamiento();
}
