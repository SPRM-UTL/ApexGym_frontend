import { useEffect, useState } from 'react';
import { api } from '../../../scripts/services/api.js';

const LIMITE_POR_PAGINA = 20;

export function useClientesVenta() {
    const [busqueda, setBusquedaActual] = useState('');
    const [pagina, setPaginaActual] = useState(1);
    const [clientes, setClientes] = useState([]);
    const [clienteDefault, setClienteDefault] = useState(null);
    const [total, setTotal] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelado = false;
        async function cargarClienteDefault() {
            try {
                const respuesta = await api.cliente.buscarPorNombreOId('Público General', 1, 5);
                const lista = respuesta?.data?.registros || [];
                const pg = lista.find((c) =>
                    c.nombre?.toLowerCase().includes('público')
                    || c.nombre?.toLowerCase().includes('publico')
                ) || lista[0];
                if (!cancelado && pg) {
                    setClienteDefault(pg);
                }
            } catch (err) {
                console.error('Error al cargar cliente por defecto:', err);
            }
        }
        cargarClienteDefault();
        return () => { cancelado = true; };
    }, []);

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
        clienteDefault,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA)),
        cargando,
        error,
    };
}
