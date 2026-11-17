import { useEffect } from 'react';
import { obtenerEmpresaCache } from '../context/EmpresaContext.jsx';

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
        const nombreEmpresa = obtenerEmpresaCache()?.nombreComercial || 'ApexGym';
        if (nombre) {
            document.title = `${nombre} | ${nombreEmpresa}`;
        } else {
            document.title = nombreEmpresa;
        }
    }, [nombre]);
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

export const prepararDatos = (datos) => {
    const formData = new FormData();

    for (const [campo, valor] of Object.entries(datos)) {
        if (campo === 'imagen') {
            if (typeof File !== 'undefined' && valor instanceof File) {
                formData.append('imagen', valor);
            }
            continue;
        }
        if (valor === undefined) continue;

        formData.append(campo, valor === null ? '' : String(valor));
    }

    return formData;
}