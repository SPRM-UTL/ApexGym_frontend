import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { esUsuarioCliente, obtenerUsuarioActual } from '../scripts/constantes.js';
import { api } from '../scripts/services/api.js';

const SeccionesContext = createContext({
    secciones: [],
    cargandoSecciones: false,
    errorSecciones: null,
    recargarSecciones: async () => {},
});

const CLAVE_SECCIONES_GUARDADAS = 'apexgym_secciones_cache';

function identificarUsuarioActual() {
    const usuario = obtenerUsuarioActual();
    if (!usuario) return null;
    return usuario.id ?? usuario.usuarioId ?? usuario.correo ?? usuario.email ?? null;
}

function leerSeccionesGuardadas() {
    try {
        const crudo = localStorage.getItem(CLAVE_SECCIONES_GUARDADAS);
        if (!crudo) return null;
        const datos = JSON.parse(crudo);
        const usuarioId = identificarUsuarioActual();
        if (usuarioId == null || String(datos?.usuarioId) !== String(usuarioId)) return null;
        return Array.isArray(datos?.secciones) ? datos.secciones : null;
    } catch {
        return null;
    }
}

function guardarSecciones(secciones) {
    try {
        localStorage.setItem(CLAVE_SECCIONES_GUARDADAS, JSON.stringify({
            usuarioId: identificarUsuarioActual(),
            secciones,
            actualizadoEn: new Date().toISOString(),
        }));
    } catch {
        // Almacenamiento restringido: se continúa sin respaldo
    }
}

export function SeccionesProvider({ estaLogeadoEn, children }) {
    const [secciones, setSecciones] = useState([]);
    const [cargandoSecciones, setCargandoSecciones] = useState(false);
    const [errorSecciones, setErrorSecciones] = useState(null);

    const recargarSecciones = useCallback(async () => {
        if (!estaLogeadoEn || esUsuarioCliente()) {
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
            const listaSecciones = Array.isArray(resp.data) ? resp.data : [];
            setSecciones(listaSecciones);
            guardarSecciones(listaSecciones);
        } catch (err) {
            setSecciones([]);
            // Con el backend caído se conservan los permisos ya conocidos para no bloquear el acceso
            setSecciones(leerSeccionesGuardadas() || []);
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

// eslint-disable-next-line react-refresh/only-export-components
export function useSecciones() {
    return useContext(SeccionesContext);
}
