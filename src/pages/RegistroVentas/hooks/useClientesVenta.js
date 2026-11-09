import { useEffect, useState } from 'react';
import { api } from '../../../scripts/services/api.js';

const LIMITE_POR_PAGINA = 20;

export function useClientesVenta() {
    const [busqueda, setBusquedaActual] = useState('');
    const [pagina, setPaginaActual] = useState(1);
    const [clientes, setClientes] = useState([]);
    const [total, setTotal] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const cambiarBusqueda = (valor) => {
        setBusquedaActual(valor);
        setPaginaActual(1);
    };

    useEffect(() => {
        const termino = busqueda.trim();
        const esId = /^\d+$/.test(termino);

        if (!termino || (termino.length < 2 && !esId)) {
            setClientes([]);
            setTotal(0);
            setError('');
            setCargando(false);
            return undefined;
        }

        let cancelado = false;
        const timeout = setTimeout(async () => {
            setCargando(true);
            setError('');

            try {
                const respuesta = await api.cliente.buscarPorNombreOId(
                    termino,
                    pagina,
                    LIMITE_POR_PAGINA
                );
                if (cancelado) return;

                const resultado = respuesta?.data;
                setClientes(Array.isArray(resultado?.registros) ? resultado.registros : []);
                setTotal(Number(resultado?.total) || 0);
            } catch (errorBusqueda) {
                if (cancelado) return;
                setClientes([]);
                setTotal(0);
                setError(errorBusqueda.message || 'No se pudo buscar clientes.');
            } finally {
                if (!cancelado) setCargando(false);
            }
        }, 300);

        return () => {
            cancelado = true;
            clearTimeout(timeout);
        };
    }, [busqueda, pagina]);

    return {
        busqueda,
        cambiarBusqueda,
        pagina,
        setPagina: setPaginaActual,
        clientes,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA)),
        cargando,
        error,
    };
}
