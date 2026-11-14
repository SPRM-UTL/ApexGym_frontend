import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../scripts/services/api.js';

const STORAGE_KEY_SUCURSAL_ID = 'apexgym_sucursal_activa_id';
const STORAGE_KEY_SUCURSAL_CONFIRMADA = 'apexgym_sucursal_sesion_confirmada';

export const DEFAULT_SUCURSAL = {
    id: 1,
    empresaId: 1,
    nombre: 'Sucursal Matriz',
    codigo: 'MATRIZ-01',
    direccion: 'Av. Principal #100, Col. Centro',
    ciudad: 'León',
    estado: 'Guanajuato',
    codigoPostal: '37000',
    telefono: '477-123-4567',
    email: 'matriz@apexgym.com',
    activo: true,
};

const SucursalContext = createContext({
    sucursalActiva: DEFAULT_SUCURSAL,
    sucursales: [DEFAULT_SUCURSAL],
    cargandoSucursales: false,
    sucursalConfirmada: false,
    seleccionarSucursal: () => {},
    confirmarSucursal: () => {},
    desconfirmarSucursal: () => {},
    recargarSucursales: async () => [DEFAULT_SUCURSAL],
});

export function SucursalProvider({ estaLogeadoEn, children }) {
    const [sucursales, setSucursales] = useState([DEFAULT_SUCURSAL]);
    const [sucursalActivaId, setSucursalActivaId] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_SUCURSAL_ID);
            const num = Number(guardado);
            return Number.isInteger(num) && num > 0 ? num : 1;
        } catch {
            return 1;
        }
    });

    const [sucursalConfirmada, setSucursalConfirmada] = useState(() => {
        try {
            return sessionStorage.getItem(STORAGE_KEY_SUCURSAL_CONFIRMADA) === 'true';
        } catch {
            return false;
        }
    });

    const [cargandoSucursales, setCargandoSucursales] = useState(false);

    const recargarSucursales = useCallback(async () => {
        setCargandoSucursales(true);
        try {
            const respuesta = await api.sucursal.obtenerTodos();
            if (respuesta?.responseFlag === 0 && Array.isArray(respuesta?.data) && respuesta.data.length > 0) {
                setSucursales(respuesta.data);
                return respuesta.data;
            }
        } catch {
            // En caso de que no tenga permisos o error de red, fallback a matriz
        } finally {
            setCargandoSucursales(false);
        }
        return [DEFAULT_SUCURSAL];
    }, []);

    const seleccionarSucursal = useCallback((idOSucursal) => {
        const id = typeof idOSucursal === 'object' ? idOSucursal?.id : Number(idOSucursal);
        const idValido = Number.isInteger(id) && id > 0 ? id : 1;
        try {
            localStorage.setItem(STORAGE_KEY_SUCURSAL_ID, String(idValido));
        } catch {
            // Ignorar errores de almacenamiento local
        }
        setSucursalActivaId(idValido);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('apexgym:sucursal-cambiada', { detail: { sucursalId: idValido } }));
        }
    }, []);

    const confirmarSucursal = useCallback((idOSucursal) => {
        seleccionarSucursal(idOSucursal);
        setSucursalConfirmada(true);
        try {
            sessionStorage.setItem(STORAGE_KEY_SUCURSAL_CONFIRMADA, 'true');
        } catch {
            // Ignorar errores de almacenamiento
        }
    }, [seleccionarSucursal]);

    const desconfirmarSucursal = useCallback(() => {
        setSucursalConfirmada(false);
        try {
            sessionStorage.removeItem(STORAGE_KEY_SUCURSAL_CONFIRMADA);
        } catch {
            // Ignorar errores de almacenamiento
        }
    }, []);

    useEffect(() => {
        if (estaLogeadoEn) {
            recargarSucursales();
        } else {
            desconfirmarSucursal();
        }
    }, [estaLogeadoEn, recargarSucursales, desconfirmarSucursal]);

    useEffect(() => {
        const resetearConfirmacion = () => {
            desconfirmarSucursal();
        };
        window.addEventListener('apexgym:auth-login', resetearConfirmacion);
        return () => window.removeEventListener('apexgym:auth-login', resetearConfirmacion);
    }, [desconfirmarSucursal]);

    const sucursalActiva = useMemo(() => {
        const encontrada = sucursales.find((s) => s.id === sucursalActivaId);
        return encontrada || sucursales[0] || DEFAULT_SUCURSAL;
    }, [sucursales, sucursalActivaId]);

    const valor = useMemo(
        () => ({
            sucursalActiva,
            sucursales,
            cargandoSucursales,
            sucursalConfirmada,
            seleccionarSucursal,
            confirmarSucursal,
            desconfirmarSucursal,
            recargarSucursales,
        }),
        [
            sucursalActiva,
            sucursales,
            cargandoSucursales,
            sucursalConfirmada,
            seleccionarSucursal,
            confirmarSucursal,
            desconfirmarSucursal,
            recargarSucursales,
        ]
    );

    return <SucursalContext.Provider value={valor}>{children}</SucursalContext.Provider>;
}

export function useSucursal() {
    return useContext(SucursalContext);
}

export default SucursalContext;
