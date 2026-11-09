import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';
import {
    obtenerEmpleadoIdApertura,
} from '../../../utils/ventaHelper/ventaHelpers.js';
import { normalizar, obtenerLista, obtenerPagina } from '../utils/venta.utils.js';

const CATALOGOS = [
    ['Métodos de pago', () => api.metodosPago.obtenerActivos()],
    ['Categorías', () => api.categoriaProducto.obtenerParaVenta()],
];

const CARGAR_CATALOGO = {
    productos: (parametros) => api.producto.obtenerCatalogoPaginado(parametros),
    servicios: (parametros) => api.servicio.obtenerCatalogoPaginado(parametros),
    membresias: (parametros) => api.tipoMembresia.obtenerCatalogoPaginado(parametros),
};
const LIMITE_CATALOGO = 12;

export function useCatalogosVenta(empleadoId, aperturaCajaId, filtrosCatalogo) {
    const {
        tipoItem,
        busqueda,
        pagina: paginaActual,
        categoriaId: categoriaActual,
        orden,
        onPaginaChange,
    } = filtrosCatalogo;
    const [metodosPago, setMetodosPago] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [productos, setProductos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [membresias, setMembresias] = useState([]);
    const [totalCatalogo, setTotalCatalogo] = useState(0);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
    const [errorCatalogo, setErrorCatalogo] = useState('');
    const [aperturaAsignada, setAperturaAsignada] = useState(null);
    const [asignacionValida, setAsignacionValida] = useState(false);

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            setAsignacionValida(false);
            setAperturaAsignada(null);

            const resultadoApertura = aperturaCajaId
                ? api.aperturaCaja.obtenerPorId(Number(aperturaCajaId))
                : Promise.resolve(null);
            const [resultadosCatalogos, resultadoAperturaCaja] = await Promise.all([
                Promise.allSettled(CATALOGOS.map(([, cargarCatalogo]) => cargarCatalogo())),
                Promise.resolve(resultadoApertura).then(
                    (apertura) => ({ status: 'fulfilled', value: apertura }),
                    (reason) => ({ status: 'rejected', reason })
                ),
            ]);
            if (cancelado) return;

            const listas = resultadosCatalogos.map((resultado, indice) => {
                const [etiqueta] = CATALOGOS[indice];
                if (resultado.status === 'rejected') {
                    const error = resultado.reason;
                    notifications.show({
                        color: 'red',
                        message: `${etiqueta}: ${error.message || 'No se pudo cargar'}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`,
                    });
                    return null;
                }

                try {
                    return obtenerLista(resultado.value);
                } catch (error) {
                    notifications.show({ color: 'red', message: `${etiqueta}: ${error.message}` });
                    return null;
                }
            });

            const [listaMetodos, listaCategorias] = listas;
            if (listaMetodos) setMetodosPago(listaMetodos);
            if (listaCategorias) setCategorias(listaCategorias);

            if (!empleadoId || !aperturaCajaId) return;

            if (resultadoAperturaCaja.status === 'rejected') {
                const error = resultadoAperturaCaja.reason;
                notifications.show({
                    color: 'red',
                    message: error.message || 'No se pudo validar la apertura de caja.',
                });
                return;
            }

            const apertura = resultadoAperturaCaja.value?.data ?? resultadoAperturaCaja.value;
            const aperturaPerteneceAlEmpleado = apertura
                && String(obtenerEmpleadoIdApertura(apertura) ?? '') === empleadoId;

            if (!apertura || String(apertura.estado).trim().toUpperCase() !== 'ABIERTA' || !aperturaPerteneceAlEmpleado) {
                notifications.show({
                    color: 'red',
                    message: 'La caja abierta ya no está disponible o no corresponde al empleado seleccionado.',
                });
                return;
            }

            const nombreEmpleado = [
                apertura.empleado?.nombre,
                apertura.empleado?.apellidoPaterno,
                apertura.empleado?.apellidoMaterno,
            ].filter(Boolean).join(' ');

            setAsignacionValida(true);
            setAperturaAsignada({
                label: `${apertura.caja?.nombre ?? `Caja #${apertura.cajaId ?? '—'}`} — ${nombreEmpleado || 'Empleado'} — Apertura #${apertura.id}`,
            });
        };

        cargar();
        return () => {
            cancelado = true;
        };
    }, [empleadoId, aperturaCajaId]);

    useEffect(() => {
        let cancelado = false;
        const cargarCatalogo = CARGAR_CATALOGO[tipoItem];

        if (!cargarCatalogo) {
            setCargandoCatalogo(false);
            return undefined;
        }

        const termino = busqueda.trim();
        const categoriaId = tipoItem === 'productos' && categoriaActual != null
            ? Number(categoriaActual)
            : null;
        const parametros = {
            q: termino,
            pagina: paginaActual,
            limite: LIMITE_CATALOGO,
            orden: orden || 'nombre-asc',
            ...(categoriaId !== null ? { categoriaId } : {}),
        };

        setCargandoCatalogo(true);
        setErrorCatalogo('');
        if (tipoItem === 'productos') setProductos([]);
        if (tipoItem === 'servicios') setServicios([]);
        if (tipoItem === 'membresias') setMembresias([]);

        const timeout = setTimeout(async () => {
            try {
                const respuesta = await cargarCatalogo(parametros);
                if (cancelado) return;

                const pagina = obtenerPagina(respuesta);
                const paginasTotales = Math.max(1, Math.ceil(pagina.total / LIMITE_CATALOGO));
                if (paginaActual > paginasTotales) {
                    onPaginaChange(paginasTotales);
                    return;
                }

                const registros = normalizar(pagina.registros);
                if (tipoItem === 'productos') setProductos(registros);
                if (tipoItem === 'servicios') setServicios(registros);
                if (tipoItem === 'membresias') setMembresias(registros);
                setTotalCatalogo(pagina.total);
            } catch (error) {
                if (cancelado) return;
                setProductos([]);
                setServicios([]);
                setMembresias([]);
                setTotalCatalogo(0);
                setErrorCatalogo(error.message || 'No se pudo cargar el catálogo.');
                notifications.show({
                    color: 'red',
                    message: error.message || 'No se pudo cargar el catálogo.',
                });
            } finally {
                if (!cancelado) setCargandoCatalogo(false);
            }
        }, 300);

        return () => {
            cancelado = true;
            clearTimeout(timeout);
        };
    }, [
        tipoItem,
        busqueda,
        paginaActual,
        categoriaActual,
        orden,
        onPaginaChange,
    ]);

    return {
        metodosPago,
        categorias,
        productos,
        servicios,
        membresias,
        totalCatalogo,
        totalPaginasCatalogo: Math.max(1, Math.ceil(totalCatalogo / LIMITE_CATALOGO)),
        cargandoCatalogo,
        errorCatalogo,
        aperturaAsignada,
        asignacionValida,
    };
}
