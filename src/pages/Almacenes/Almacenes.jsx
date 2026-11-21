import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Drawer,
    Group,
    Loader,
    Modal,
    NumberInput,
    Paper,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAdjustments,
    IconAlertCircle,
    IconArrowsExchange,
    IconBuildingStore,
    IconBuildingWarehouse,
    IconCheck,
    IconEdit,
    IconMapPin,
    IconPackage,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useSucursal } from '../../context/SucursalContext.jsx';
import { obtenerEmpresaCache } from '../../context/EmpresaContext.jsx';
import { appUrl } from '../../scripts/constantes.js';
import { api } from '../../scripts/services/api.js';
import { AlmacenService } from '../../scripts/services/AlmacenService.js';
import classes from './Almacenes.module.css';

const TIPOS_ALMACEN = [
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'BODEGA', label: 'Bodega' },
    { value: 'PISO_VENTA', label: 'Piso de venta' },
    { value: 'REFRIGERACION', label: 'Refrigeración' },
    { value: 'OTRO', label: 'Otro' },
];

const FORM_ALMACEN_INICIAL = {
    nombre: '',
    codigo: '',
    tipo: 'BODEGA',
    ubicacion: '',
    esPrincipal: false,
    activo: true,
};

function numeroSeguro(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

function normalizarAlmacen(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const conteoProductos =
        raw.productosConStock ??
        raw.totalProductos ??
        raw.productosCount ??
        raw.cantidadProductos ??
        raw._count?.inventarios ??
        (Array.isArray(raw.inventarios) ? raw.inventarios.length : 0);

    const totalUnidades =
        raw.totalUnidades ??
        raw.unidadesTotales ??
        raw.stockTotal ??
        (Array.isArray(raw.inventarios)
            ? raw.inventarios.reduce((acc, inv) => acc + numeroSeguro(inv.stockActual), 0)
            : 0);

    return {
        id: Number(raw.id),
        sucursalId: Number(raw.sucursalId ?? 1),
        nombre: raw.nombre ?? `Almacén #${raw.id}`,
        codigo: raw.codigo ?? '',
        tipo: raw.tipo ?? 'PRINCIPAL',
        ubicacion: raw.ubicacion ?? '',
        esPrincipal: Boolean(raw.esPrincipal),
        activo: raw.activo !== false,
        productosCount: numeroSeguro(conteoProductos),
        unidadesTotales: numeroSeguro(totalUnidades),
    };
}

function normalizarInventarioItem(raw) {
    const prod = raw.producto ?? raw;
    const productoId = Number(raw.productoId ?? prod.id ?? raw.id);
    return {
        inventarioId: raw.inventarioId ?? (raw.producto ? raw.id : null),
        productoId,
        nombre: prod.nombre ?? raw.nombre ?? `Producto #${productoId}`,
        codigoBarras: prod.codigoBarras ?? raw.codigoBarras ?? '',
        categoriaNombre:
            prod.categoria?.nombre ?? raw.categoriaNombre ?? raw.categoria ?? 'Sin categoría',
        estadoProducto: String(prod.estado ?? raw.estadoProducto ?? 'ACTIVO').toUpperCase(),
        precioVenta: numeroSeguro(prod.precioVenta ?? raw.precioVenta),
        stockGlobal: numeroSeguro(
            raw.stockGlobal ?? prod.stockActual ?? raw.productoStockActual ?? raw.stockActual
        ),
        stockActual: numeroSeguro(raw.stockActual ?? raw.stockEnAlmacen ?? raw.cantidad),
        stockMinimo: numeroSeguro(raw.stockMinimo ?? prod.stockMinimo, 1),
        ubicacionEstante: raw.ubicacionEstante ?? '',
    };
}

function normalizarRespuestaInventario(rawData) {
    const lista = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.items)
            ? rawData.items
            : Array.isArray(rawData?.productos)
                ? rawData.productos
                : Array.isArray(rawData?.inventario)
                    ? rawData.inventario
                    : [];
    return lista.map(normalizarInventarioItem).filter((item) => Number.isFinite(item.productoId));
}

function badgeEstadoStock(actual, minimo) {
    if (actual <= 0) return { label: 'Agotado', color: 'red' };
    if (actual <= minimo) return { label: 'Stock bajo', color: 'orange' };
    return { label: 'Disponible', color: 'green' };
}

export function Almacenes({
    embedded = false,
    onInventarioActualizado,
    extraHeaderAction = null,
}) {
    const { sucursalActiva } = useSucursal();
    const sucursalId = sucursalActiva?.id ?? 1;

    useEffect(() => {
        if (embedded) return;
        const nombreEmpresa = obtenerEmpresaCache()?.nombreComercial || 'ApexGym';
        document.title = `Almacenes | ${nombreEmpresa}`;
    }, [embedded]);

    const almacenService = useMemo(
        () => api.almacen ?? new AlmacenService(api.urlBase || appUrl),
        []
    );

    const [almacenes, setAlmacenes] = useState([]);
    const [cargandoAlmacenes, setCargandoAlmacenes] = useState(true);
    const [errorAlmacenes, setErrorAlmacenes] = useState(null);
    const [sinPermiso, setSinPermiso] = useState(false);

    const [almacenSeleccionadoState, setAlmacenSeleccionadoState] = useState({
        sucursalId,
        almacenId: null,
    });
    const almacenSeleccionadoId =
        almacenSeleccionadoState.sucursalId === sucursalId
            ? almacenSeleccionadoState.almacenId
            : null;

    const [inventariosPorAlmacen, setInventariosPorAlmacen] = useState({});
    const [cargandoInventario, setCargandoInventario] = useState(false);
    const [errorInventario, setErrorInventario] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroStock, setFiltroStock] = useState('todos');

    // Modal Crear / Editar almacén
    const [modalAlmacenAbierto, setModalAlmacenAbierto] = useState(false);
    const [almacenEditando, setAlmacenEditando] = useState(null);
    const [formAlmacen, setFormAlmacen] = useState(FORM_ALMACEN_INICIAL);
    const [erroresFormAlmacen, setErroresFormAlmacen] = useState({});
    const [guardandoAlmacen, setGuardandoAlmacen] = useState(false);

    // Modal Eliminar almacén
    const [almacenAEliminar, setAlmacenAEliminar] = useState(null);
    const [eliminandoAlmacen, setEliminandoAlmacen] = useState(false);

    // Drawer de ajuste rápido de stock
    const [productoAjustando, setProductoAjustando] = useState(null);
    const [formAjuste, setFormAjuste] = useState({
        stockActual: 0,
        stockMinimo: 1,
        ubicacionEstante: '',
    });
    const [guardandoAjuste, setGuardandoAjuste] = useState(false);

    // Modal Transferir stock entre almacenes
    const [modalTransferirAbierto, setModalTransferirAbierto] = useState(false);
    const [formTransferencia, setFormTransferencia] = useState({
        origenAlmacenId: '',
        destinoAlmacenId: '',
        productoId: '',
        cantidad: 1,
    });
    const [cargandoOrigenTransfer, setCargandoOrigenTransfer] = useState(false);
    const [transfiriendo, setTransfiriendo] = useState(false);

    const seleccionarAlmacen = useCallback((id) => {
        setAlmacenSeleccionadoState({ sucursalId, almacenId: id });
    }, [sucursalId]);

    const cargarAlmacenes = useCallback(async () => {
        setCargandoAlmacenes(true);
        setErrorAlmacenes(null);
        setSinPermiso(false);
        try {
            const res = await almacenService.obtenerTodos();
            const rawLista = Array.isArray(res?.data) ? res.data : [];
            const lista = rawLista
                .map(normalizarAlmacen)
                .filter(Boolean);

            setAlmacenes(lista);
            setInventariosPorAlmacen({});

            setAlmacenSeleccionadoState((prev) => {
                const actualId = prev.sucursalId === sucursalId ? prev.almacenId : null;
                const sigueExistiendo = actualId && lista.some((a) => a.id === actualId);
                if (sigueExistiendo) {
                    return { sucursalId, almacenId: actualId };
                }
                const principal = lista.find((a) => a.esPrincipal) ?? lista[0] ?? null;
                return { sucursalId, almacenId: principal ? principal.id : null };
            });
        } catch (err) {
            if (err?.statusCode === 403 || err?.status === 403) {
                setSinPermiso(true);
                setErrorAlmacenes(
                    'Tu rol actual no tiene permisos para consultar o administrar almacenes en esta sucursal.'
                );
            } else {
                setErrorAlmacenes(err?.message || 'No se pudieron cargar los almacenes.');
            }
            setAlmacenes([]);
        } finally {
            setCargandoAlmacenes(false);
        }
    }, [almacenService, sucursalId]);

    useEffect(() => {
        cargarAlmacenes();
    }, [cargarAlmacenes]);

    const cargarInventarioAlmacen = useCallback(async (idAlmacen, { silencioso = false } = {}) => {
        if (!idAlmacen) return [];
        if (!silencioso) {
            setCargandoInventario(true);
            setErrorInventario(null);
        }
        try {
            const res = await almacenService.obtenerInventario(idAlmacen);
            const items = normalizarRespuestaInventario(res?.data ?? res);
            setInventariosPorAlmacen((prev) => ({ ...prev, [idAlmacen]: items }));
            return items;
        } catch (err) {
            if (!silencioso) {
                setErrorInventario(err?.message || 'No se pudo cargar el inventario del almacén.');
            }
            return [];
        } finally {
            if (!silencioso) {
                setCargandoInventario(false);
            }
        }
    }, [almacenService]);

    useEffect(() => {
        if (almacenSeleccionadoId) {
            cargarInventarioAlmacen(almacenSeleccionadoId);
        }
    }, [almacenSeleccionadoId, cargarInventarioAlmacen]);

    const almacenSeleccionado = useMemo(
        () => almacenes.find((a) => a.id === almacenSeleccionadoId) ?? null,
        [almacenes, almacenSeleccionadoId]
    );

    const inventarioActual = useMemo(
        () => (almacenSeleccionadoId ? inventariosPorAlmacen[almacenSeleccionadoId] ?? [] : []),
        [inventariosPorAlmacen, almacenSeleccionadoId]
    );

    const resumenInventarioActual = useMemo(() => {
        const conExistencia = inventarioActual.filter((i) => i.stockActual > 0).length;
        const unidades = inventarioActual.reduce((acc, i) => acc + i.stockActual, 0);
        const bajosOAgotados = inventarioActual.filter((i) => i.stockActual <= i.stockMinimo).length;
        return {
            totalProductos: inventarioActual.length,
            conExistencia,
            unidades,
            bajosOAgotados,
        };
    }, [inventarioActual]);

    const inventarioFiltrado = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return inventarioActual.filter((item) => {
            if (filtroStock === 'bajo' && item.stockActual > item.stockMinimo) return false;
            if (filtroStock === 'disponible' && item.stockActual <= 0) return false;
            if (!q) return true;
            return (
                item.nombre.toLowerCase().includes(q) ||
                item.codigoBarras.toLowerCase().includes(q) ||
                item.categoriaNombre.toLowerCase().includes(q) ||
                item.ubicacionEstante.toLowerCase().includes(q)
            );
        });
    }, [inventarioActual, busqueda, filtroStock]);

    const almacenesActivos = useMemo(
        () => almacenes.filter((a) => a.activo),
        [almacenes]
    );

    // ─── CRUD Almacén ────────────────────────────────────────────────────────
    const abrirCrearAlmacen = () => {
        setAlmacenEditando(null);
        setFormAlmacen({
            ...FORM_ALMACEN_INICIAL,
            esPrincipal: almacenes.length === 0,
        });
        setErroresFormAlmacen({});
        setModalAlmacenAbierto(true);
    };

    const abrirEditarAlmacen = (almacen) => {
        setAlmacenEditando(almacen);
        setFormAlmacen({
            nombre: almacen.nombre ?? '',
            codigo: almacen.codigo ?? '',
            tipo: almacen.tipo ?? 'BODEGA',
            ubicacion: almacen.ubicacion ?? '',
            esPrincipal: Boolean(almacen.esPrincipal),
            activo: Boolean(almacen.activo),
        });
        setErroresFormAlmacen({});
        setModalAlmacenAbierto(true);
    };

    const guardarAlmacen = async () => {
        const errores = {};
        const nombreLimpio = formAlmacen.nombre.trim();
        if (!nombreLimpio) {
            errores.nombre = 'El nombre del almacén es obligatorio.';
        } else if (nombreLimpio.length > 120) {
            errores.nombre = 'El nombre no debe exceder 120 caracteres.';
        }
        if (formAlmacen.codigo.trim().length > 40) {
            errores.codigo = 'El código no debe exceder 40 caracteres.';
        }
        if (formAlmacen.ubicacion.trim().length > 200) {
            errores.ubicacion = 'La ubicación no debe exceder 200 caracteres.';
        }
        if (Object.keys(errores).length > 0) {
            setErroresFormAlmacen(errores);
            return;
        }

        setGuardandoAlmacen(true);
        try {
            const payload = {
                nombre: nombreLimpio,
                codigo: formAlmacen.codigo.trim() || null,
                tipo: formAlmacen.tipo || 'BODEGA',
                ubicacion: formAlmacen.ubicacion.trim() || null,
                esPrincipal: Boolean(formAlmacen.esPrincipal),
                activo: Boolean(formAlmacen.activo),
            };
            if (almacenEditando) {
                await almacenService.actualizar(almacenEditando.id, payload);
                notifications.show({
                    title: 'Almacén actualizado',
                    message: `"${payload.nombre}" se actualizó correctamente.`,
                    color: 'green',
                    icon: <IconCheck size={16} />,
                });
            } else {
                const res = await almacenService.crear(payload);
                const nuevoId = Number(res?.data?.id);
                if (Number.isInteger(nuevoId) && nuevoId > 0) {
                    seleccionarAlmacen(nuevoId);
                }
                notifications.show({
                    title: 'Almacén creado',
                    message: `"${payload.nombre}" se registró en ${sucursalActiva?.nombre || 'la sucursal'}.`,
                    color: 'green',
                    icon: <IconCheck size={16} />,
                });
            }
            setModalAlmacenAbierto(false);
            await cargarAlmacenes();
        } catch (err) {
            notifications.show({
                title: 'Error al guardar almacén',
                message: err?.message || 'No se pudo guardar el almacén.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setGuardandoAlmacen(false);
        }
    };

    const confirmarEliminarAlmacen = async () => {
        if (!almacenAEliminar || eliminandoAlmacen) return;
        setEliminandoAlmacen(true);
        try {
            await almacenService.eliminar(almacenAEliminar.id);
            notifications.show({
                title: 'Almacén eliminado',
                message: `"${almacenAEliminar.nombre}" fue eliminado.`,
                color: 'orange',
            });
            setAlmacenAEliminar(null);
            await cargarAlmacenes();
        } catch (err) {
            notifications.show({
                title: 'No se pudo eliminar',
                message: err?.message || 'Verifica que no sea el almacén principal único ni tenga stock positivo.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setEliminandoAlmacen(false);
        }
    };

    // ─── Ajuste rápido de stock ──────────────────────────────────────────────
    const abrirAjusteStock = (item) => {
        setProductoAjustando(item);
        setFormAjuste({
            stockActual: item.stockActual,
            stockMinimo: item.stockMinimo,
            ubicacionEstante: item.ubicacionEstante ?? '',
        });
    };

    const aplicarDeltaStock = (delta) => {
        setFormAjuste((prev) => ({
            ...prev,
            stockActual: Math.max(0, numeroSeguro(prev.stockActual) + delta),
        }));
    };

    const stockActualAjusteValido =
        Number.isInteger(Number(formAjuste.stockActual)) && Number(formAjuste.stockActual) >= 0;
    const stockMinimoAjusteValido =
        Number.isInteger(Number(formAjuste.stockMinimo)) && Number(formAjuste.stockMinimo) >= 0;

    const guardarAjusteStock = async () => {
        if (!almacenSeleccionado || !productoAjustando) return;
        if (!stockActualAjusteValido || !stockMinimoAjusteValido) return;

        setGuardandoAjuste(true);
        try {
            await almacenService.ajustarStock(
                almacenSeleccionado.id,
                productoAjustando.productoId,
                {
                    stockActual: Number(formAjuste.stockActual),
                    stockMinimo: Number(formAjuste.stockMinimo),
                    ubicacionEstante: formAjuste.ubicacionEstante.trim() || null,
                }
            );
            notifications.show({
                title: 'Inventario actualizado',
                message: `${productoAjustando.nombre} ahora tiene ${formAjuste.stockActual} u. en ${almacenSeleccionado.nombre}.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
            setProductoAjustando(null);
            await Promise.all([
                cargarInventarioAlmacen(almacenSeleccionado.id),
                cargarAlmacenes(),
            ]);
            onInventarioActualizado?.();
        } catch (err) {
            notifications.show({
                title: 'Error al ajustar stock',
                message: err?.message || 'No se pudo actualizar el stock del producto.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setGuardandoAjuste(false);
        }
    };

    // ─── Transferencia entre almacenes ───────────────────────────────────────
    const abrirModalTransferir = async (productoPreseleccionado = null) => {
        const origenDefault =
            almacenSeleccionado && almacenSeleccionado.activo
                ? almacenSeleccionado
                : almacenesActivos[0] ?? null;
        const destinoDefault =
            almacenesActivos.find((a) => a.id !== origenDefault?.id) ?? null;

        const origenIdStr = origenDefault ? String(origenDefault.id) : '';
        const destinoIdStr = destinoDefault ? String(destinoDefault.id) : '';
        const prodIdStr = productoPreseleccionado ? String(productoPreseleccionado.productoId) : '';

        setFormTransferencia({
            origenAlmacenId: origenIdStr,
            destinoAlmacenId: destinoIdStr,
            productoId: prodIdStr,
            cantidad: 1,
        });
        setModalTransferirAbierto(true);

        if (origenDefault && !inventariosPorAlmacen[origenDefault.id]) {
            setCargandoOrigenTransfer(true);
            await cargarInventarioAlmacen(origenDefault.id, { silencioso: true });
            setCargandoOrigenTransfer(false);
        }
    };

    const cambiarOrigenTransferencia = async (nuevoOrigenId) => {
        const valor = nuevoOrigenId ?? '';
        const destinoActual = formTransferencia.destinoAlmacenId;
        const nuevoDestino =
            destinoActual === valor
                ? String(almacenesActivos.find((a) => String(a.id) !== valor)?.id ?? '')
                : destinoActual;

        setFormTransferencia((prev) => ({
            ...prev,
            origenAlmacenId: valor,
            destinoAlmacenId: nuevoDestino,
            productoId: '',
            cantidad: 1,
        }));

        const idNum = Number(valor);
        if (idNum && !inventariosPorAlmacen[idNum]) {
            setCargandoOrigenTransfer(true);
            await cargarInventarioAlmacen(idNum, { silencioso: true });
            setCargandoOrigenTransfer(false);
        }
    };

    const inventarioOrigenTransfer = useMemo(() => {
        const idNum = Number(formTransferencia.origenAlmacenId);
        return idNum ? inventariosPorAlmacen[idNum] ?? [] : [];
    }, [inventariosPorAlmacen, formTransferencia.origenAlmacenId]);

    const productoOrigenSeleccionado = useMemo(
        () =>
            inventarioOrigenTransfer.find(
                (i) => String(i.productoId) === String(formTransferencia.productoId)
            ) ?? null,
        [inventarioOrigenTransfer, formTransferencia.productoId]
    );

    const stockDisponibleOrigen = productoOrigenSeleccionado?.stockActual ?? 0;
    const cantidadTransferNum = Number(formTransferencia.cantidad);

    const errorValidacionTransferencia = useMemo(() => {
        if (!formTransferencia.origenAlmacenId || !formTransferencia.destinoAlmacenId) {
            return 'Selecciona un almacén de origen y uno de destino.';
        }
        if (formTransferencia.origenAlmacenId === formTransferencia.destinoAlmacenId) {
            return 'El almacén de origen y el de destino deben ser diferentes.';
        }
        if (!formTransferencia.productoId) {
            return 'Selecciona el producto que deseas transferir.';
        }
        if (stockDisponibleOrigen <= 0) {
            return 'El producto seleccionado no tiene existencias disponibles en el almacén de origen.';
        }
        if (!Number.isInteger(cantidadTransferNum) || cantidadTransferNum <= 0) {
            return 'La cantidad a transferir debe ser un número entero mayor a 0.';
        }
        if (cantidadTransferNum > stockDisponibleOrigen) {
            return `La cantidad (${cantidadTransferNum}) supera el stock disponible en origen (${stockDisponibleOrigen}).`;
        }
        return null;
    }, [formTransferencia, stockDisponibleOrigen, cantidadTransferNum]);

    const confirmarTransferencia = async () => {
        if (errorValidacionTransferencia || transfiriendo) return;
        setTransfiriendo(true);
        try {
            const payload = {
                origenAlmacenId: Number(formTransferencia.origenAlmacenId),
                destinoAlmacenId: Number(formTransferencia.destinoAlmacenId),
                productoId: Number(formTransferencia.productoId),
                cantidad: cantidadTransferNum,
            };
            await almacenService.transferirStock(payload);
            notifications.show({
                title: 'Transferencia completada',
                message: `Se transfirieron ${cantidadTransferNum} unidad(es) de "${productoOrigenSeleccionado?.nombre ?? 'producto'}" correctamente.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
            setModalTransferirAbierto(false);
            await cargarAlmacenes();
            if (almacenSeleccionadoId) {
                await cargarInventarioAlmacen(almacenSeleccionadoId);
            }
            onInventarioActualizado?.();
        } catch (err) {
            notifications.show({
                title: 'Error en la transferencia',
                message: err?.message || 'No se pudo transferir el stock entre almacenes.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setTransfiriendo(false);
        }
    };

    const opcionesAlmacenTransfer = useMemo(
        () =>
            almacenesActivos.map((a) => ({
                value: String(a.id),
                label: a.esPrincipal ? `${a.nombre} (Principal)` : a.nombre,
            })),
        [almacenesActivos]
    );

    const opcionesProductoTransfer = useMemo(
        () =>
            inventarioOrigenTransfer.map((item) => ({
                value: String(item.productoId),
                label: `${item.nombre} — Disp: ${item.stockActual}`,
                disabled: item.stockActual <= 0,
            })),
        [inventarioOrigenTransfer]
    );

    return (
        <Stack className={classes.page} gap="md">
            {!embedded ? (
                <Paper className={classes.heroBar}>
                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Group gap="sm" align="center">
                            <ThemeIcon size={46} radius="md" color="orange" variant="filled">
                                <IconBuildingWarehouse size={26} stroke={1.8} />
                            </ThemeIcon>
                            <div>
                                <Text className={classes.heroEyebrow}>Inventario multialmacén</Text>
                                <Title order={2} className={classes.heroTitle}>
                                    Almacenes de Sucursal
                                </Title>
                                <Group gap="xs" mt={4}>
                                    <Badge
                                        variant="filled"
                                        color="orange"
                                        size="sm"
                                        leftSection={<IconBuildingStore size={12} />}
                                    >
                                        {sucursalActiva?.nombre || `Sucursal #${sucursalId}`}
                                    </Badge>
                                    <Text size="xs" c="#D7E3FF">
                                        {almacenes.length} almacén(es) registrado(s)
                                    </Text>
                                </Group>
                            </div>
                        </Group>

                        <Group gap="sm" wrap="wrap">
                            {extraHeaderAction}
                            <Button
                                className={classes.actionBtn}
                                variant="white"
                                color="dark"
                                leftSection={<IconRefresh size={16} />}
                                loading={cargandoAlmacenes}
                                onClick={cargarAlmacenes}
                            >
                                Actualizar
                            </Button>
                            <Button
                                className={classes.actionBtn}
                                variant="light"
                                color="yellow"
                                leftSection={<IconArrowsExchange size={16} />}
                                disabled={almacenesActivos.length < 2 || sinPermiso}
                                onClick={() => abrirModalTransferir()}
                            >
                                Transferir stock
                            </Button>
                            <Button
                                className={classes.actionBtn}
                                color="orange"
                                leftSection={<IconPlus size={16} />}
                                disabled={sinPermiso}
                                onClick={abrirCrearAlmacen}
                            >
                                Nuevo almacén
                            </Button>
                        </Group>
                    </Group>
                </Paper>
            ) : (
                <Paper className={classes.embeddedToolbar}>
                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                        <Group gap="xs" wrap="wrap">
                            <ThemeIcon size={34} radius="md" color="orange" variant="light">
                                <IconBuildingWarehouse size={18} />
                            </ThemeIcon>
                            <div>
                                <Text fw={700} size="sm" c="#1B1F3A">
                                    Almacenes en {sucursalActiva?.nombre || `Sucursal #${sucursalId}`}
                                </Text>
                                <Text size="xs" c="#475569">
                                    Selecciona un almacén para consultar existencias, ajustar o transferir entre almacenes.
                                </Text>
                            </div>
                        </Group>
                        <Group gap="xs" wrap="wrap">
                            {extraHeaderAction}
                            <Button
                                size="xs"
                                className={classes.actionBtn}
                                variant="light"
                                color="indigo"
                                leftSection={<IconArrowsExchange size={15} />}
                                disabled={almacenesActivos.length < 2 || sinPermiso}
                                onClick={() => abrirModalTransferir()}
                            >
                                Transferir stock
                            </Button>
                            <Button
                                size="xs"
                                className={classes.actionBtn}
                                color="orange"
                                leftSection={<IconPlus size={15} />}
                                disabled={sinPermiso}
                                onClick={abrirCrearAlmacen}
                            >
                                Nuevo almacén
                            </Button>
                        </Group>
                    </Group>
                </Paper>
            )}

            {errorAlmacenes && (
                <Alert
                    color={sinPermiso ? 'yellow' : 'red'}
                    variant="light"
                    title={sinPermiso ? 'Permisos insuficientes' : 'Error al cargar almacenes'}
                    icon={<IconAlertCircle size={18} />}
                >
                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                        <Text size="sm">{errorAlmacenes}</Text>
                        {!sinPermiso && (
                            <Button size="xs" variant="light" color="red" onClick={cargarAlmacenes}>
                                Reintentar
                            </Button>
                        )}
                    </Group>
                </Alert>
            )}

            {cargandoAlmacenes ? (
                <Paper className={classes.inventoryPanel} py="xl">
                    <Group justify="center" gap="sm">
                        <Loader color="orange" />
                        <Text fw={600} c="#1B1F3A">
                            Cargando almacenes de la sucursal…
                        </Text>
                    </Group>
                </Paper>
            ) : !sinPermiso && (
                <>
                    {almacenes.length === 0 ? (
                        <Paper className={classes.inventoryPanel} py="xl">
                            <Stack align="center" gap="xs">
                                <ThemeIcon size={48} radius="xl" color="orange" variant="light">
                                    <IconBuildingWarehouse size={24} />
                                </ThemeIcon>
                                <Text fw={700} c="#1B1F3A">
                                    Esta sucursal aún no tiene almacenes registrados
                                </Text>
                                <Text size="sm" c="#475569">
                                    Crea el almacén principal para empezar a gestionar el inventario por ubicación.
                                </Text>
                                <Button
                                    mt="xs"
                                    color="orange"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={abrirCrearAlmacen}
                                >
                                    Crear primer almacén
                                </Button>
                            </Stack>
                        </Paper>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {almacenes.map((alm) => {
                                const esSeleccionado = alm.id === almacenSeleccionadoId;
                                const invCache = inventariosPorAlmacen[alm.id];
                                const conteoProductos = invCache
                                    ? invCache.filter((i) => i.stockActual > 0).length
                                    : alm.productosCount;
                                const conteoUnidades = invCache
                                    ? invCache.reduce((acc, i) => acc + i.stockActual, 0)
                                    : alm.unidadesTotales;

                                return (
                                    <div
                                        key={alm.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-pressed={esSeleccionado}
                                        className={`${classes.warehouseCard} ${
                                            esSeleccionado ? classes.warehouseCardActive : ''
                                        }`}
                                        onClick={() => seleccionarAlmacen(alm.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                seleccionarAlmacen(alm.id);
                                            }
                                        }}
                                    >
                                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                                            <div style={{ minWidth: 0 }}>
                                                <Group gap={6} wrap="wrap" mb={4}>
                                                    {alm.esPrincipal && (
                                                        <Badge size="xs" variant="filled" color="orange">
                                                            Principal
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        size="xs"
                                                        variant="light"
                                                        color={alm.activo ? 'green' : 'gray'}
                                                    >
                                                        {alm.activo ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                    <Badge size="xs" variant="outline" color="indigo">
                                                        {alm.tipo}
                                                    </Badge>
                                                </Group>
                                                <Text className={classes.warehouseName} truncate>
                                                    {alm.nombre}
                                                </Text>
                                                <Text className={classes.warehouseMeta}>
                                                    {alm.codigo ? `Código: ${alm.codigo}` : 'Sin código'}
                                                    {alm.ubicacion ? ` · ${alm.ubicacion}` : ''}
                                                </Text>
                                            </div>

                                            <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                                                <Tooltip label="Editar almacén" withArrow>
                                                    <ActionIcon
                                                        className={classes.iconAction}
                                                        variant="light"
                                                        color="blue"
                                                        aria-label={`Editar almacén ${alm.nombre}`}
                                                        onClick={() => abrirEditarAlmacen(alm)}
                                                    >
                                                        <IconEdit size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Eliminar almacén" withArrow>
                                                    <ActionIcon
                                                        className={classes.iconAction}
                                                        variant="light"
                                                        color="red"
                                                        aria-label={`Eliminar almacén ${alm.nombre}`}
                                                        onClick={() => setAlmacenAEliminar(alm)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Group>

                                        <SimpleGrid cols={2} spacing="xs">
                                            <div className={classes.statBox}>
                                                <Text className={classes.statLabel}>Productos</Text>
                                                <Text className={classes.statValue}>{conteoProductos}</Text>
                                            </div>
                                            <div className={classes.statBox}>
                                                <Text className={classes.statLabel}>Unidades</Text>
                                                <Text className={classes.statValue}>{conteoUnidades}</Text>
                                            </div>
                                        </SimpleGrid>
                                    </div>
                                );
                            })}
                        </SimpleGrid>
                    )}

                    {/* Panel de Inventario por Almacén */}
                    {almacenSeleccionado && (
                        <Paper className={classes.inventoryPanel}>
                            <Stack gap="md">
                                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                                    <div>
                                        <Group gap="xs" wrap="wrap">
                                            <Text className={classes.panelHeading}>
                                                Inventario en {almacenSeleccionado.nombre}
                                            </Text>
                                            {almacenSeleccionado.esPrincipal && (
                                                <Badge size="sm" color="orange" variant="light">
                                                    Almacén principal
                                                </Badge>
                                            )}
                                            <Badge size="sm" color="indigo" variant="light">
                                                {resumenInventarioActual.totalProductos} productos
                                            </Badge>
                                            <Badge size="sm" color="green" variant="light">
                                                {resumenInventarioActual.unidades} unidades
                                            </Badge>
                                            {resumenInventarioActual.bajosOAgotados > 0 && (
                                                <Badge size="sm" color="red" variant="light">
                                                    {resumenInventarioActual.bajosOAgotados} bajo/agotado
                                                </Badge>
                                            )}
                                        </Group>
                                        {almacenSeleccionado.ubicacion && (
                                            <Group gap={4} mt={2}>
                                                <IconMapPin size={13} color="#475569" />
                                                <Text size="xs" c="#475569">
                                                    {almacenSeleccionado.ubicacion}
                                                </Text>
                                            </Group>
                                        )}
                                    </div>

                                    <Group gap="sm" wrap="wrap">
                                        <TextInput
                                            placeholder="Buscar producto, código o estante…"
                                            size="sm"
                                            leftSection={<IconSearch size={15} />}
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.currentTarget.value)}
                                            style={{ minWidth: 240 }}
                                        />
                                        <SegmentedControl
                                            size="xs"
                                            color="orange"
                                            value={filtroStock}
                                            onChange={setFiltroStock}
                                            data={[
                                                { value: 'todos', label: 'Todos' },
                                                { value: 'disponible', label: 'Con stock' },
                                                { value: 'bajo', label: 'Bajo / Agotado' },
                                            ]}
                                        />
                                    </Group>
                                </Group>

                                {errorInventario && (
                                    <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                                        {errorInventario}
                                    </Alert>
                                )}

                                {cargandoInventario ? (
                                    <Group justify="center" py="lg">
                                        <Loader size="sm" color="orange" />
                                        <Text size="sm" c="#475569">
                                            Consultando existencias del almacén…
                                        </Text>
                                    </Group>
                                ) : inventarioFiltrado.length === 0 ? (
                                    <Stack align="center" py="lg" gap="xs">
                                        <IconPackage size={28} color="#94A3B8" />
                                        <Text size="sm" c="#475569">
                                            No hay productos que coincidan con los filtros en este almacén.
                                        </Text>
                                    </Stack>
                                ) : (
                                    <Table.ScrollContainer minWidth={760}>
                                        <Table striped highlightOnHover withTableBorder>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Producto</Table.Th>
                                                    <Table.Th>Categoría</Table.Th>
                                                    <Table.Th style={{ textAlign: 'center' }}>Stock en almacén</Table.Th>
                                                    <Table.Th style={{ textAlign: 'center' }}>Stock mínimo</Table.Th>
                                                    <Table.Th>Ubicación en estante</Table.Th>
                                                    <Table.Th style={{ textAlign: 'center' }}>Stock global</Table.Th>
                                                    <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {inventarioFiltrado.map((item) => {
                                                    const estado = badgeEstadoStock(item.stockActual, item.stockMinimo);
                                                    return (
                                                        <Table.Tr key={item.productoId}>
                                                            <Table.Td>
                                                                <Text size="sm" fw={700} c="#1E293B">
                                                                    {item.nombre}
                                                                </Text>
                                                                {item.codigoBarras && (
                                                                    <Text size="xs" c="#475569">
                                                                        {item.codigoBarras}
                                                                    </Text>
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Badge variant="light" color="gray" size="sm">
                                                                    {item.categoriaNombre}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'center' }} className={classes.numericCell}>
                                                                <Badge color={estado.color} variant="light" size="md">
                                                                    {item.stockActual} · {estado.label}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'center' }} className={classes.numericCell}>
                                                                {item.stockMinimo}
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="sm" c={item.ubicacionEstante ? '#1E293B' : '#64748B'}>
                                                                    {item.ubicacionEstante || 'Sin asignar'}
                                                                </Text>
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'center' }} className={classes.numericCell}>
                                                                <Badge variant="outline" color="dark" size="sm">
                                                                    {item.stockGlobal}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Group justify="flex-end" gap={6} wrap="nowrap">
                                                                    <Button
                                                                        size="xs"
                                                                        className={classes.actionBtn}
                                                                        variant="light"
                                                                        color="orange"
                                                                        leftSection={<IconAdjustments size={14} />}
                                                                        onClick={() => abrirAjusteStock(item)}
                                                                    >
                                                                        Ajustar
                                                                    </Button>
                                                                    <Tooltip
                                                                        label={
                                                                            almacenesActivos.length < 2
                                                                                ? 'Se requieren al menos 2 almacenes activos para transferir'
                                                                                : item.stockActual <= 0
                                                                                    ? 'Sin existencias disponibles para transferir'
                                                                                    : 'Transferir a otro almacén'
                                                                        }
                                                                        withArrow
                                                                    >
                                                                        <span>
                                                                            <Button
                                                                                size="xs"
                                                                                className={classes.actionBtn}
                                                                                variant="light"
                                                                                color="indigo"
                                                                                leftSection={<IconArrowsExchange size={14} />}
                                                                                disabled={
                                                                                    almacenesActivos.length < 2 ||
                                                                                    !almacenSeleccionado.activo ||
                                                                                    item.stockActual <= 0
                                                                                }
                                                                                onClick={() => abrirModalTransferir(item)}
                                                                            >
                                                                                Transferir
                                                                            </Button>
                                                                        </span>
                                                                    </Tooltip>
                                                                </Group>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    );
                                                })}
                                            </Table.Tbody>
                                        </Table>
                                    </Table.ScrollContainer>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </>
            )}

            {/* Modal Crear / Editar Almacén */}
            <Modal
                opened={modalAlmacenAbierto}
                onClose={() => !guardandoAlmacen && setModalAlmacenAbierto(false)}
                title={almacenEditando ? `Editar almacén: ${almacenEditando.nombre}` : 'Nuevo almacén'}
                centered
            >
                <Stack gap="md">
                    <TextInput
                        label="Nombre del almacén"
                        withAsterisk
                        placeholder="Ej. Bodega Norte / Piso de Venta"
                        maxLength={120}
                        value={formAlmacen.nombre}
                        error={erroresFormAlmacen.nombre}
                        onChange={(e) => {
                            const v = e.currentTarget.value;
                            setFormAlmacen((prev) => ({ ...prev, nombre: v }));
                            setErroresFormAlmacen((prev) => ({ ...prev, nombre: null }));
                        }}
                    />
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                        <TextInput
                            label="Código"
                            placeholder="Ej. ALM-02"
                            maxLength={40}
                            value={formAlmacen.codigo}
                            error={erroresFormAlmacen.codigo}
                            onChange={(e) => {
                                const v = e.currentTarget.value.toUpperCase();
                                setFormAlmacen((prev) => ({ ...prev, codigo: v }));
                            }}
                        />
                        <Select
                            label="Tipo de almacén"
                            data={TIPOS_ALMACEN}
                            value={formAlmacen.tipo}
                            onChange={(v) => setFormAlmacen((prev) => ({ ...prev, tipo: v || 'BODEGA' }))}
                            comboboxProps={{ withinPortal: true }}
                        />
                    </SimpleGrid>
                    <TextInput
                        label="Ubicación física"
                        placeholder="Ej. Planta baja, área de suplementos"
                        maxLength={200}
                        value={formAlmacen.ubicacion}
                        error={erroresFormAlmacen.ubicacion}
                        onChange={(e) => {
                            const v = e.currentTarget.value;
                            setFormAlmacen((prev) => ({ ...prev, ubicacion: v }));
                        }}
                    />
                    <Group justify="space-between" pt={4}>
                        <Switch
                            label="Almacén principal de la sucursal"
                            color="orange"
                            checked={formAlmacen.esPrincipal}
                            onChange={(e) =>
                                setFormAlmacen((prev) => ({ ...prev, esPrincipal: e.currentTarget.checked }))
                            }
                        />
                        <Switch
                            label="Activo"
                            color="green"
                            checked={formAlmacen.activo}
                            onChange={(e) =>
                                setFormAlmacen((prev) => ({ ...prev, activo: e.currentTarget.checked }))
                            }
                        />
                    </Group>

                    <Group justify="flex-end" mt="sm">
                        <Button
                            variant="default"
                            onClick={() => setModalAlmacenAbierto(false)}
                            disabled={guardandoAlmacen}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="orange"
                            loading={guardandoAlmacen}
                            onClick={guardarAlmacen}
                        >
                            {almacenEditando ? 'Guardar cambios' : 'Crear almacén'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal Confirmar Eliminación */}
            <Modal
                opened={Boolean(almacenAEliminar)}
                onClose={() => !eliminandoAlmacen && setAlmacenAEliminar(null)}
                title="Eliminar almacén"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">
                        ¿Seguro que deseas eliminar el almacén{' '}
                        <strong>{almacenAEliminar?.nombre}</strong>?
                    </Text>
                    <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
                        No se permite eliminar el único almacén principal ni un almacén que aún conserve unidades en inventario.
                    </Alert>
                    <Group justify="flex-end">
                        <Button
                            variant="default"
                            onClick={() => setAlmacenAEliminar(null)}
                            disabled={eliminandoAlmacen}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="red"
                            loading={eliminandoAlmacen}
                            onClick={confirmarEliminarAlmacen}
                        >
                            Eliminar almacén
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Drawer Ajuste Rápido de Stock */}
            <Drawer
                opened={Boolean(productoAjustando)}
                onClose={() => !guardandoAjuste && setProductoAjustando(null)}
                title={`Ajustar stock · ${almacenSeleccionado?.nombre ?? ''}`}
                position="right"
                size="md"
            >
                {productoAjustando && (
                    <Stack gap="md">
                        <Paper p="sm" withBorder radius="md" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                            <Text fw={700} size="sm" c="#1B1F3A">
                                {productoAjustando.nombre}
                            </Text>
                            <Group gap="xs" mt={4}>
                                <Badge size="xs" color="gray" variant="light">
                                    {productoAjustando.categoriaNombre}
                                </Badge>
                                <Badge size="xs" color="indigo" variant="light">
                                    Stock actual en almacén: {productoAjustando.stockActual}
                                </Badge>
                                <Badge size="xs" color="dark" variant="outline">
                                    Global: {productoAjustando.stockGlobal}
                                </Badge>
                            </Group>
                        </Paper>

                        <div>
                            <NumberInput
                                label="Nuevo stock en este almacén"
                                withAsterisk
                                min={0}
                                allowDecimal={false}
                                value={formAjuste.stockActual}
                                error={!stockActualAjusteValido ? 'Ingresa un entero mayor o igual a 0.' : null}
                                onChange={(val) =>
                                    setFormAjuste((prev) => ({
                                        ...prev,
                                        stockActual: val === '' ? 0 : Number(val),
                                    }))
                                }
                            />
                            <Group gap="xs" mt="xs">
                                {[-5, -1, 1, 5, 10].map((delta) => (
                                    <Button
                                        key={delta}
                                        size="xs"
                                        variant="light"
                                        color={delta < 0 ? 'red' : 'green'}
                                        onClick={() => aplicarDeltaStock(delta)}
                                    >
                                        {delta > 0 ? `+${delta}` : delta}
                                    </Button>
                                ))}
                            </Group>
                        </div>

                        <NumberInput
                            label="Stock mínimo en este almacén"
                            withAsterisk
                            min={0}
                            allowDecimal={false}
                            value={formAjuste.stockMinimo}
                            error={!stockMinimoAjusteValido ? 'Ingresa un entero mayor o igual a 0.' : null}
                            onChange={(val) =>
                                setFormAjuste((prev) => ({
                                    ...prev,
                                    stockMinimo: val === '' ? 0 : Number(val),
                                }))
                            }
                        />

                        <TextInput
                            label="Ubicación en estante"
                            placeholder="Ej. Pasillo A - Nivel 2"
                            maxLength={100}
                            value={formAjuste.ubicacionEstante}
                            onChange={(e) => {
                                const v = e.currentTarget.value;
                                setFormAjuste((prev) => ({ ...prev, ubicacionEstante: v }));
                            }}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="default"
                                onClick={() => setProductoAjustando(null)}
                                disabled={guardandoAjuste}
                            >
                                Cancelar
                            </Button>
                            <Button
                                color="orange"
                                loading={guardandoAjuste}
                                disabled={!stockActualAjusteValido || !stockMinimoAjusteValido}
                                onClick={guardarAjusteStock}
                            >
                                Guardar ajuste
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Drawer>

            {/* Modal Transferir Stock entre Almacenes */}
            <Modal
                opened={modalTransferirAbierto}
                onClose={() => !transfiriendo && setModalTransferirAbierto(false)}
                title="Transferir stock entre almacenes"
                size="lg"
                centered
            >
                <Stack gap="md">
                    <Text size="xs" c="#475569">
                        Transfiere unidades entre almacenes pertenecientes a{' '}
                        <strong>{sucursalActiva?.nombre || `Sucursal #${sucursalId}`}</strong>.
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                        <Select
                            label="Almacén origen"
                            withAsterisk
                            placeholder="Selecciona origen"
                            data={opcionesAlmacenTransfer}
                            value={formTransferencia.origenAlmacenId}
                            onChange={cambiarOrigenTransferencia}
                            comboboxProps={{ withinPortal: true }}
                        />
                        <Select
                            label="Almacén destino"
                            withAsterisk
                            placeholder="Selecciona destino"
                            data={opcionesAlmacenTransfer.filter(
                                (o) => o.value !== formTransferencia.origenAlmacenId
                            )}
                            value={formTransferencia.destinoAlmacenId}
                            onChange={(val) =>
                                setFormTransferencia((prev) => ({ ...prev, destinoAlmacenId: val ?? '' }))
                            }
                            comboboxProps={{ withinPortal: true }}
                        />
                    </SimpleGrid>

                    <Select
                        label="Producto"
                        withAsterisk
                        searchable
                        nothingFoundMessage={
                            cargandoOrigenTransfer ? 'Cargando inventario…' : 'Sin productos disponibles'
                        }
                        placeholder="Selecciona un producto con existencias"
                        data={opcionesProductoTransfer}
                        value={formTransferencia.productoId}
                        onChange={(val) =>
                            setFormTransferencia((prev) => ({
                                ...prev,
                                productoId: val ?? '',
                                cantidad: 1,
                            }))
                        }
                        comboboxProps={{ withinPortal: true }}
                    />

                    {productoOrigenSeleccionado && (
                        <div className={classes.transferPreview}>
                            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                                <div>
                                    <Text size="xs" c="#475569" fw={600}>
                                        Stock disponible en origen
                                    </Text>
                                    <Text size="md" fw={800} c="#1B1F3A">
                                        {stockDisponibleOrigen} unidad(es)
                                    </Text>
                                </div>
                                <Badge
                                    color={stockDisponibleOrigen > 0 ? 'green' : 'red'}
                                    variant="light"
                                    size="md"
                                >
                                    {stockDisponibleOrigen > 0 ? 'Disponible para traslado' : 'Sin stock'}
                                </Badge>
                            </Group>
                        </div>
                    )}

                    <NumberInput
                        label="Cantidad a transferir"
                        withAsterisk
                        min={1}
                        max={Math.max(1, stockDisponibleOrigen)}
                        allowDecimal={false}
                        value={formTransferencia.cantidad}
                        onChange={(val) =>
                            setFormTransferencia((prev) => ({
                                ...prev,
                                cantidad: val === '' ? 0 : Number(val),
                            }))
                        }
                    />

                    {errorValidacionTransferencia && (
                        <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
                            {errorValidacionTransferencia}
                        </Alert>
                    )}

                    <Group justify="flex-end" mt="xs">
                        <Button
                            variant="default"
                            onClick={() => setModalTransferirAbierto(false)}
                            disabled={transfiriendo}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="orange"
                            leftSection={<IconArrowsExchange size={16} />}
                            loading={transfiriendo}
                            disabled={Boolean(errorValidacionTransferencia)}
                            onClick={confirmarTransferencia}
                        >
                            Confirmar transferencia
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

export default Almacenes;
