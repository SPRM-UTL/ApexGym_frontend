import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../scripts/services/api.js';

const SeccionesContext = createContext({
    secciones: [],
    cargandoSecciones: false,
    errorSecciones: null,
    recargarSecciones: async () => {},
});

export function SeccionesProvider({ estaLogeadoEn, children }) {
    const [secciones, setSecciones] = useState([]);
    const [cargandoSecciones, setCargandoSecciones] = useState(false);
    const [errorSecciones, setErrorSecciones] = useState(null);

    const recargarSecciones = useCallback(async () => {
        if (!estaLogeadoEn) {
            setSecciones([]);
            setErrorSecciones(null);
            setCargandoSecciones(false);
            return;
        }

        try {
            setCargandoSecciones(true);
            setErrorSecciones(null);
            const resp = await api.seccion.obtenerMisSecciones();
            if (resp.responseFlag !== 0) {
                throw new Error(resp.message || 'No se pudieron cargar las secciones');
            }
            setSecciones(Array.isArray(resp.data) ? resp.data : []);
        } catch (err) {
            setSecciones([]);
            setErrorSecciones(err.message || 'Error al cargar secciones');
        } finally {
            setCargandoSecciones(false);
        }
    }, [estaLogeadoEn]);

    useEffect(() => {
        recargarSecciones();
    }, [recargarSecciones]);

    return (
        <SeccionesContext.Provider
            value={{
                secciones,
                cargandoSecciones,
                errorSecciones,
                recargarSecciones,
            }}
        >
            {children}
        </SeccionesContext.Provider>
    );
}

export function useSecciones() {
    return useContext(SeccionesContext);
}
