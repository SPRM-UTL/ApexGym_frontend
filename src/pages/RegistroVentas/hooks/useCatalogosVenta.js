import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';
import {
    obtenerEmpleadoIdApertura,
} from '../../../utils/ventaHelper/ventaHelpers.js';
import {
    normalizar,
    normalizarTextoBusqueda,
    obtenerLista,
} from '../utils/venta.utils.js';

const CATALOGOS = [
    ['Métodos de pago', () => api.metodosPago.obtenerActivos()],
    ['Categorías', () => api.categoriaProducto.obtenerParaVenta()],
];

const LIMITE_CATALOGO = 12;

function filtrarCatalogo(registros, busqueda, categoriaId, orden) {
    const termino = normalizarTextoBusqueda(busqueda);
    const categoriaSeleccionada = categoriaId == null ? null : String(categoriaId);
    const filtrados = registros.filter((registro) => {
        const categoria = registro.categoria?.nombre
            ?? (typeof registro.categoria === 'string' ? registro.categoria : '');
        const textoRegistro = normalizarTextoBusqueda([
            registro.nombre,
            registro.codigoBarras,
            categoria,
        ].filter(Boolean).join(' '));
        const categoriaRegistro = registro.categoriaProductoId
            ?? registro.categoriaId
            ?? registro.categoria?.id;

        return (!termino || textoRegistro.includes(termino))
            && (
                categoriaSeleccionada === null
                || String(categoriaRegistro ?? '') === categoriaSeleccionada
            );
    });

    const [campo, direccion] = String(orden || 'nombre-asc').split('-');
    filtrados.sort((a, b) => {
        const comparacion = campo === 'precio'
            ? Number(a.precio) - Number(b.precio)
            : normalizarTextoBusqueda(a.nombre).localeCompare(normalizarTextoBusqueda(b.nombre), 'es');
        return direccion === 'desc' ? -comparacion : comparacion;
    });

    return filtrados;
}

export function useCatalogosVenta(empleadoId, aperturaCajaId, apertura, filtrosCatalogo) {
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
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [serviciosDisponibles, setServiciosDisponibles] = useState([]);
    const [membresiasDisponibles, setMembresiasDisponibles] = useState([]);
    const [catalogosSucursalId, setCatalogosSucursalId] = useState(null);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
    const [errorCatalogo, setErrorCatalogo] = useState('');
    const [aperturaAsignada, setAperturaAsignada] = useState(null);
    const [asignacionValida, setAsignacionValida] = useState(false);
    const solicitudCatalogoRef = useRef(0);

    const sucursalId = Number.isSafeInteger(Number(apertura?.sucursalId))
        && Number(apertura?.sucursalId) > 0
        ? String(Number(apertura.sucursalId))
        : null;

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            setAsignacionValida(false);
            setAperturaAsignada(null);

            const resultadosCatalogos = await Promise.allSettled(
                CATALOGOS.map(([, cargarCatalogo]) => cargarCatalogo())
            );
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
            const aperturaPerteneceAlEmpleado = apertura
                && String(obtenerEmpleadoIdApertura(apertura) ?? '') === empleadoId;

            if (!apertura || String(apertura.estado).trim().toUpperCase() !== 'ABIERTA' || !aperturaPerteneceAlEmpleado) {
                notifications.show({
                    color: 'red',
                    message: 'La caja abierta ya no está disponible o no corresponde al empleado seleccionado.',
                });
                return;
            }

            if (!sucursalId) {
                notifications.show({
                    color: 'red',
                    message: 'La apertura seleccionada no tiene una sucursal asignada. Selecciona una apertura asociada a una sucursal.',
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
    }, [empleadoId, aperturaCajaId, apertura, sucursalId]);

    const recargarCatalogosVenta = useCallback(async () => {
        const solicitud = ++solicitudCatalogoRef.current;
        setCargandoCatalogo(true);
        setErrorCatalogo('');

        if (!sucursalId) {
            setProductosDisponibles([]);
            setServiciosDisponibles([]);
            setMembresiasDisponibles([]);
            setCatalogosSucursalId(null);
            setErrorCatalogo('La apertura seleccionada no tiene una sucursal asignada.');
            setCargandoCatalogo(false);
            return false;
        }

        try {
            const [respuestaProductos, respuestaServicios, respuestaMembresias] = await Promise.all([
                api.producto.obtenerDisponiblesParaVenta(sucursalId),
                api.servicio.obtenerDisponiblesParaVenta(sucursalId),
                api.tipoMembresia.obtenerDisponiblesParaVenta(sucursalId),
            ]);
            if (solicitud !== solicitudCatalogoRef.current) return false;

            setProductosDisponibles(normalizar(obtenerLista(respuestaProductos)));
            setServiciosDisponibles(normalizar(obtenerLista(respuestaServicios)));
            setMembresiasDisponibles(normalizar(obtenerLista(respuestaMembresias)));
            setCatalogosSucursalId(sucursalId);
            return true;
        } catch (error) {
            if (solicitud !== solicitudCatalogoRef.current) return false;

            setProductosDisponibles([]);
            setServiciosDisponibles([]);
            setMembresiasDisponibles([]);
            setCatalogosSucursalId(null);
            setErrorCatalogo(error.message || 'No se pudieron cargar los artículos disponibles para esta sucursal.');
            notifications.show({
                color: 'red',
                message: error.message || 'No se pudieron cargar los artículos disponibles para esta sucursal.',
            });
            return false;
        } finally {
            if (solicitud === solicitudCatalogoRef.current) setCargandoCatalogo(false);
        }
    }, [sucursalId]);

    useEffect(() => {
        recargarCatalogosVenta();
        return () => {
            solicitudCatalogoRef.current += 1;
        };
    }, [recargarCatalogosVenta]);

    const catalogosDisponibles = useMemo(() => ({
        productos: productosDisponibles,
        servicios: serviciosDisponibles,
        membresias: membresiasDisponibles,
    }), [productosDisponibles, serviciosDisponibles, membresiasDisponibles]);

    const registrosFiltrados = useMemo(
        () => {
            const registrosCatalogo = tipoItem === 'productos'
                ? productosDisponibles
                : tipoItem === 'servicios'
                    ? serviciosDisponibles
                    : tipoItem === 'membresias'
                        ? membresiasDisponibles
                        : [];
            return filtrarCatalogo(
                registrosCatalogo,
                busqueda,
                tipoItem === 'productos' ? categoriaActual : null,
                orden
            );
        },
        [
            productosDisponibles,
            serviciosDisponibles,
            membresiasDisponibles,
            busqueda,
            categoriaActual,
            tipoItem,
            orden,
        ]
    );
    const totalCatalogo = registrosFiltrados.length;
    const totalPaginasCatalogo = Math.max(1, Math.ceil(totalCatalogo / LIMITE_CATALOGO));

    useEffect(() => {
        if (paginaActual > totalPaginasCatalogo) onPaginaChange(totalPaginasCatalogo);
    }, [paginaActual, totalPaginasCatalogo, onPaginaChange]);

    const registrosPagina = useMemo(
        () => registrosFiltrados.slice((paginaActual - 1) * LIMITE_CATALOGO, paginaActual * LIMITE_CATALOGO),
        [registrosFiltrados, paginaActual]
    );

    return {
        metodosPago,
        categorias,
        productos: tipoItem === 'productos' ? registrosPagina : [],
        servicios: tipoItem === 'servicios' ? registrosPagina : [],
        membresias: tipoItem === 'membresias' ? registrosPagina : [],
        catalogosDisponibles,
        sucursalId,
        catalogosSucursalId,
        recargarCatalogosVenta,
        totalCatalogo,
        totalPaginasCatalogo,
        cargandoCatalogo,
        errorCatalogo,
        aperturaAsignada,
        asignacionValida,
    };
}
