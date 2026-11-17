import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../scripts/services/api.js';

const STORAGE_KEY_EMPRESA = 'apexgym_empresa_actual';

export const DEFAULT_EMPRESA = {
    id: 1,
    nombreComercial: 'ApexGym',
    razonSocial: 'ApexGym S.A. de C.V.',
    rfc: 'APX260101AAA',
    telefono: '555-019-2834',
    email: 'contacto@apexgym.com',
    direccion: 'Av. Principal #100, Col. Centro',
    ciudad: 'Ciudad de México',
    estado: 'CDMX',
    codigoPostal: '06000',
    logoUrl: null,
    colorPrimario: '#FF6A00',
    moneda: 'MXN',
    simboloMoneda: '$',
    zonaHoraria: 'America/Mexico_City',
    toleranciaMinutos: 15,
    mensajeTicket: '¡Gracias por entrenar en ApexGym!',
    activo: true,
};

let memoriaEmpresa = { ...DEFAULT_EMPRESA };

export function obtenerEmpresaCache() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EMPRESA);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return { ...DEFAULT_EMPRESA, ...parsed };
            }
        }
    } catch {
        // Fallback seguro a memoria/default
    }
    return { ...DEFAULT_EMPRESA, ...memoriaEmpresa };
}

function guardarEmpresaCache(datos) {
    const combinada = { ...DEFAULT_EMPRESA, ...(datos || {}) };
    memoriaEmpresa = combinada;
    try {
        localStorage.setItem(STORAGE_KEY_EMPRESA, JSON.stringify(combinada));
    } catch {
        // Ignorar errores de almacenamiento en modo privado
    }
    return combinada;
}

const EmpresaContext = createContext({
    empresa: DEFAULT_EMPRESA,
    cargandoEmpresa: false,
    recargarEmpresa: async () => DEFAULT_EMPRESA,
    actualizarEmpresa: async () => DEFAULT_EMPRESA,
});

export function EmpresaProvider({ estaLogeadoEn, children }) {
    const [empresa, setEmpresa] = useState(() => obtenerEmpresaCache());
    const [cargandoEmpresa, setCargandoEmpresa] = useState(false);

    const recargarEmpresa = useCallback(async () => {
        setCargandoEmpresa(true);
        try {
            const respuesta = await api.empresa.obtenerActual();
            if (respuesta?.responseFlag === 0 && respuesta?.data) {
                const hidratada = guardarEmpresaCache(respuesta.data);
                setEmpresa(hidratada);
                return hidratada;
            }
        } catch {
            // Si el rol actual no tiene permiso o falla la red, mantener el fallback seguro de Empresa 1
        } finally {
            setCargandoEmpresa(false);
        }
        return obtenerEmpresaCache();
    }, []);

    const actualizarEmpresa = useCallback(async (nuevosDatos) => {
        const respuesta = await api.empresa.actualizarActual(nuevosDatos);
        if (respuesta?.responseFlag === 0 && respuesta?.data) {
            const hidratada = guardarEmpresaCache(respuesta.data);
            setEmpresa(hidratada);
            return respuesta;
        }
        throw new Error(respuesta?.message || 'No se pudo actualizar la empresa');
    }, []);

    useEffect(() => {
        if (estaLogeadoEn) {
            recargarEmpresa();
        }
    }, [estaLogeadoEn, recargarEmpresa]);

    const valor = useMemo(
        () => ({
            empresa,
            cargandoEmpresa,
            recargarEmpresa,
            actualizarEmpresa,
        }),
        [empresa, cargandoEmpresa, recargarEmpresa, actualizarEmpresa]
    );

    return <EmpresaContext.Provider value={valor}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
    return useContext(EmpresaContext);
}

export default EmpresaContext;
