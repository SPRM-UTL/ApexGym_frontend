import { useEffect } from 'react';

const codificar = (valor) => {
    try {
        return btoa(encodeURIComponent(JSON.stringify(valor)));
    } catch {
        return null;
    }
};

const decodificar = (valorGuardado) => {
    try {
        return JSON.parse(decodeURIComponent(atob(valorGuardado)));
    } catch {
        return null;
    }
};

export const cambioNombreWeb = (nombre) => {
    useEffect(() => {
        document.title = `${nombre} | ApexGym`;
    }, []);
};

export const guardarValor = (clave, valor, tipo = 'session') => {
    const storage = tipo === 'local' ? localStorage : sessionStorage;
    const valorCodificado = codificar(valor);
    if (valorCodificado) {
        storage.setItem(clave, valorCodificado);
    }
}

export const obtenerValor = (clave, tipo = 'session') => {
    const storage = tipo === 'local' ? localStorage : sessionStorage;
    const valor = storage.getItem(clave);
    return valor ? decodificar(valor) : null;
}

export const eliminarValor = (clave) => {
    sessionStorage.removeItem(clave);
    localStorage.removeItem(clave);
}

export const limpiarAlmacenamiento = () => {
    sessionStorage.clear();
    localStorage.clear();
}
