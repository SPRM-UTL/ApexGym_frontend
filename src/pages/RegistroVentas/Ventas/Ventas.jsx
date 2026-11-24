import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    Paper,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Textarea,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconArrowBackUp,
    IconCash,
    IconCashRegister,
    IconCloudOff,
    IconCreditCard,
    IconDeviceMobile,
    IconDownload,
    IconEye,
    IconExternalLink,
    IconRefresh,
    IconShoppingCart,
    IconTrash,
    IconUpload,
} from '@tabler/icons-react';

import { cambioNombreWeb } from '../../../scripts/globales.js';
import { api } from '../../../scripts/services/api.js';
import { useOffline } from '../../../context/OfflineContext.jsx';
import { CrudCatalogo } from '../../../components/CrudCatalogo/CrudCatalogo.jsx';
import { CancelarVentaModal } from '../components/CancelarVentaModal.jsx';
import { DetalleVentaModal } from '../components/DetalleVentaModal.jsx';
import { FormularioDevolucionModal } from '../components/FormularioDevolucionModal.jsx';
import ExportarDocumento from '../../../components/exportar-documento/ExportarDocumento.jsx';
import classes from './Ventas.module.css';
import {
    obtenerEmpleadoIdApertura,
    obtenerNombreCliente,
    obtenerNombreEmpleado,
    obtenerMensajeSeguroVenta,
    obtenerRegistros,
    obtenerVenta,
} from '../../../utils/ventaHelper/ventaHelpers.js';

const COLUMNAS = [
    { key: 'folio', label: 'Folio', sortable: false, filterable: false },
    { key: 'cliente', label: 'Cliente', sortable: false, filterable: false },
    { key: 'metodoPago', label: 'Método de pago', sortable: false, filterable: false },
    { key: 'fecha', label: 'Fecha', sortable: false, filterable: false, format: 'date' },
    {
        key: 'estado',
        label: 'Estado',
        sortable: false,
        filterable: false,
        format: 'status',
        colorByValue: {
            APROBADO: 'green',
            PENDIENTE: 'yellow',
            CANCELADA: 'red',
            REEMBOLSADO: 'blue',
        },
    },
    { key: 'subtotal', label: 'Subtotal', sortable: false, filterable: false, format: 'currency' },
    { key: 'total', label: 'Total', sortable: false, filterable: false, format: 'currency' },
];

const formatoMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

function TarjetaResumen({ icon: Icono, label, value, color }) {
    return (
        <Card className={classes.summaryCard} padding="md" radius="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                    <Text className={classes.summaryLabel}>{label}</Text>
                    <Text className={classes.summaryValue}>{value}</Text>
                </div>
                <ThemeIcon size={42} radius="md" variant="light" color={color}>
                    {createElement(Icono, { size: 22, stroke: 1.8 })}
                </ThemeIcon>
            </Group>
        </Card>
    );
}

function BadgeMetodoPago({ metodoPago }) {
    const codigo = String(metodoPago?.codigo ?? '').toUpperCase();
    const metodos = {
        EFECTIVO: { etiqueta: 'EFECTIVO', color: 'teal', icono: IconCash },
        MERCADO_PAGO: { etiqueta: 'MERCADO PAGO', color: 'violet', icono: IconDeviceMobile },
        TARJETA: { etiqueta: 'TARJETA', color: 'blue', icono: IconCreditCard },
        TERMINAL_MANUAL: { etiqueta: 'TARJETA', color: 'blue', icono: IconCreditCard },
        TRANSFERENCIA: { etiqueta: 'TRANSFERENCIA', color: 'violet', icono: IconDeviceMobile },
    };
    const metodo = metodos[codigo];
    const Icono = metodo?.icono ?? IconCreditCard;
    const etiqueta = metodo?.etiqueta ?? String(metodoPago?.nombre ?? 'No identificado').toLocaleUpperCase();

    return (
        <Badge
            color={metodo?.color ?? 'gray'}
            variant="light"
            size="sm"
            radius="sm"
            leftSection={createElement(Icono, { size: 12 })}
        >
            {etiqueta}
        </Badge>
    );
}

const normalizarEstadoVenta = (estado) => {
    const valor = String(estado ?? '').trim().toLocaleLowerCase();
    if (['cancelada', 'cancelado'].includes(valor)) return 'cancelada';
    if (['completada', 'completado', 'completa'].includes(valor)) return 'completada';
    return valor;
};

const estadoPagoVenta = (estado) => {
    const normalizado = normalizarEstadoVenta(estado);
    if (normalizado === 'completada') return 'APROBADO';
    if (normalizado === 'pendiente_pago') return 'PENDIENTE';
    if (normalizado === 'cancelada') return 'CANCELADA';
    return normalizado ? normalizado.toLocaleUpperCase() : '—';
};

function ventaTieneReembolsoPendiente(venta) {
    return (venta?.devoluciones ?? []).some((devolucion) => (
        String(devolucion.estadoReembolso ?? '').toUpperCase() === 'PENDIENTE_REEMBOLSO'
    ));
}

function ventaEstaTotalmenteDevuelta(venta) {
    if ((venta?.transaccionesPago ?? []).some((transaccion) => (
        transaccion.estado === 'REEMBOLSADO'
            || (
                Number(transaccion.monto) > 0
                && Number(transaccion.montoReembolsado ?? 0) >= Number(transaccion.monto)
            )
    ))) return true;

    const detalles = venta?.detalleVenta ?? [];
    if (detalles.length === 0) return false;
    if (detalles.every((detalle) => (
        detalle.cantidadDisponible !== undefined
        && detalle.cantidadDisponible !== null
        && Number.isFinite(Number(detalle.cantidadDisponible))
    ))) {
        return detalles.every((detalle) => Number(detalle.cantidadDisponible) <= 0);
    }

    const cantidadesDevueltas = new Map();
    for (const devolucion of venta?.devoluciones ?? []) {
        if (String(devolucion.estadoReembolso ?? '').toUpperCase() !== 'COMPLETADA') continue;
        for (const detalle of devolucion.detalles ?? []) {
            const id = Number(detalle.detalleVentaId);
            cantidadesDevueltas.set(
                id,
                (cantidadesDevueltas.get(id) ?? 0) + Number(detalle.cantidad)
            );
        }
    }
    return detalles.every((detalle) => (
        (cantidadesDevueltas.get(Number(detalle.id)) ?? 0) >= Number(detalle.cantidad)
    ));
}

function ventaBloqueaCancelacion(venta) {
    return ventaTieneReembolsoPendiente(venta) || ventaEstaTotalmenteDevuelta(venta);
}

const etiquetaEstadoVenta = (estado) => {
    const normalizado = normalizarEstadoVenta(estado);
    if (normalizado === 'cancelada') return 'Cancelada';
    if (normalizado === 'completada') return 'Completada';
    if (normalizado === 'pendiente_pago') return 'Pendiente de pago';
    return normalizado ? normalizado[0].toLocaleUpperCase() + normalizado.slice(1) : '';
};

function abrirConfirmacionCancelacion(venta, onConfirm) {
    const metodoPago = venta.metodoPago?.nombre ?? 'No identificado';
    const codigoMetodo = String(venta.metodoPago?.codigo ?? '').trim().toUpperCase();
    const nombreMetodo = String(metodoPago).trim().toLocaleLowerCase();
    const esMercadoPago = codigoMetodo === 'MERCADO_PAGO' || nombreMetodo.includes('mercado pago');
    const esTerminal = ['TARJETA', 'TERMINAL', 'TERMINAL_MANUAL'].includes(codigoMetodo)
        || nombreMetodo.includes('terminal');
    const pagoPendiente = normalizarEstadoVenta(venta.estado) === 'pendiente_pago';
    const transaccion = (venta.transaccionesPago ?? []).find((pago) => (
        pago.estado === 'APROBADO' || pago.estado === 'REEMBOLSADO'
    ));
    const montoRestante = transaccion
        ? Math.max(0, Number(transaccion.monto) - Number(transaccion.montoReembolsado ?? 0))
        : Number(venta.total ?? 0);
    const monto = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(montoRestante);

    let avisoReembolso = 'Esta acción no se puede deshacer.';
    if (esMercadoPago && pagoPendiente) {
        avisoReembolso = 'El pago de Mercado Pago sigue pendiente; al cancelar no se devolverá dinero, se cancelará el intento de cobro. Esta acción no se puede deshacer.';
    } else if (esMercadoPago) {
        avisoReembolso = 'El saldo se devolverá al cliente en efectivo desde caja. No se realizará un reembolso en Mercado Pago. Esta acción no se puede deshacer.';
    } else if (esTerminal) {
        avisoReembolso = 'El dinero se devolverá al cliente por la terminal; procesa el reembolso en ese medio antes de continuar. Esta acción no se puede deshacer.';
    }

    modals.openConfirmModal({
        centered: true,
        title: '¿Deseas cancelar esta venta?',
        children: (
            <Stack gap="xs">
                <Text size="sm">Monto a reembolsar: <strong>{monto}</strong></Text>
                <Text size="sm">Método de pago original: <strong>{metodoPago}</strong></Text>
                {esMercadoPago && !pagoPendiente && (
                    <Text size="sm">Método de devolución: <strong>Efectivo</strong></Text>
                )}
                <Text size="sm" c="red" fw={500}>{avisoReembolso}</Text>
            </Stack>
        ),
        labels: { confirm: 'Continuar', cancel: 'Volver' },
        confirmProps: { color: 'red' },
        onConfirm,
    });
}

const FILTROS = [
    {
        key: 'cliente',
        label: 'Cliente',
        type: 'text',
        placeholder: 'Nombre o apellido',
        getValue: (venta) => obtenerNombreCliente(venta.cliente ?? venta.client),
    },
    {
        key: 'fechaVenta',
        label: 'Fecha de venta',
        type: 'dateRange',
        from: 'fechaDesde',
        to: 'fechaHasta',
        getValue: (venta) => venta.createdAt ?? venta.fecha,
    },
    {
        key: 'metodoPagoId',
        label: 'Método de pago',
        type: 'select',
        placeholder: 'Todos los métodos de pago',
        loadOptions: async () => {
            const respuesta = await api.metodosPago.obtenerActivos();
            return obtenerRegistros(respuesta, 'métodos de pago').map((metodo) => ({
                value: String(metodo.id),
                label: metodo.nombre,
            }));
        },
        getValue: (venta) => venta.metodoPago?.id,
    },
    {
        key: 'estadoVenta',
        label: 'Estado',
        type: 'select',
        placeholder: 'Todos los estados',
        options: [
            { value: 'completada', label: 'Completada' },
            { value: 'pendiente_pago', label: 'Pendiente de pago' },
            { value: 'cancelada', label: 'Cancelada' },
            { value: 'reembolsado', label: 'Reembolsado' },
        ],
        optionsFromRecords: (ventas) => [...new Set(ventas
            .map((venta) => normalizarEstadoVenta(venta.estado))
            .filter(Boolean))]
            .map((estado) => ({ value: estado, label: etiquetaEstadoVenta(estado) })),
        getValue: (venta) => venta.estado,
        normalizeValue: normalizarEstadoVenta,
    },
];

let empleadosYAperturasRequest;

const cargarEmpleadosYAperturas = () => {
    if (!empleadosYAperturasRequest) {
        empleadosYAperturasRequest = Promise.all([
            api.empleado.obtenerTodos(),
            api.aperturaCaja.obtenerAbiertas(),
        ]).then(([respuestaEmpleados, respuestaAperturas]) => ({
            empleados: obtenerRegistros(respuestaEmpleados, 'empleados'),
            aperturas: obtenerRegistros(respuestaAperturas, 'aperturas de caja'),
        })).finally(() => {
            empleadosYAperturasRequest = null;
        });
    }

    return empleadosYAperturasRequest;
};

const CAMPOS = [
    {
        key: 'empleadoId',
        label: 'Empleado',
        type: 'select',
        required: true,
        loadOptions: async () => {
            const { empleados, aperturas } = await cargarEmpleadosYAperturas();
            const empleadosConCajaAbierta = new Set(
                aperturas.map(obtenerEmpleadoIdApertura).filter((id) => id != null).map(String)
            );

            return empleados
                .filter((empleado) => empleadosConCajaAbierta.has(String(empleado.id)))
                .map((empleado) => ({
                    value: String(empleado.id),
                    label: obtenerNombreEmpleado(empleado),
                }));
        },
    },
    {
        key: 'aperturaCajaId',
        label: 'Caja abierta',
        type: 'select',
        required: true,
        dependsOn: 'empleadoId',
        filterOptions: (apertura, form) =>
            Boolean(form.empleadoId) && String(apertura.empleadoId) === String(form.empleadoId),
        loadOptions: async () => {
            const { empleados, aperturas } = await cargarEmpleadosYAperturas();
            const empleadosPorId = new Map(empleados.map((empleado) => [String(empleado.id), empleado]));

            return aperturas.map((apertura) => {
                const empleadoId = obtenerEmpleadoIdApertura(apertura);
                const empleado = empleadosPorId.get(String(empleadoId)) ?? apertura.empleado;

                return {
                    value: String(apertura.id),
                    empleadoId: empleadoId != null ? String(empleadoId) : '',
                    label: `${apertura.caja?.nombre ?? `Caja #${apertura.cajaId ?? '—'}`} — ${obtenerNombreEmpleado(empleado)} — Apertura #${apertura.id}`,
                };
            });
        },
    },
];

const INICIAL = {
    empleadoId: '',
    aperturaCajaId: '',
};

export function Ventas() {
    cambioNombreWeb('Ventas');

    const navigate = useNavigate();
    const {
        isOnline,
        sincronizando,
        ventasPendientes,
        ventasPendientesTotales,
        sincronizarAhora,
        exportarVentasOffline,
        descartarVentaOffline,
        reintentarVentaOffline,
        importarVentasOffline,
    } = useOffline();
    const archivoOfflineRef = useRef(null);
    const [ventaDescartar, setVentaDescartar] = useState(null);
    const [motivoDescarte, setMotivoDescarte] = useState('');
    const [procesandoDescarte, setProcesandoDescarte] = useState(false);

    const [detalleVenta, setDetalleVenta] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [recargarDetalle, setRecargarDetalle] = useState(null);
    const [cancelacionPendiente, setCancelacionPendiente] = useState(null);
    const [devolucionPendiente, setDevolucionPendiente] = useState(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [folioCancelacion, setFolioCancelacion] = useState('');
    const [confirmacionTerminal, setConfirmacionTerminal] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [versionResumen, setVersionResumen] = useState(0);
    const [versionSync, setVersionSync] = useState(0);
    const [resumenCaja, setResumenCaja] = useState(null);
    const [aperturasHistorial, setAperturasHistorial] = useState([]);
    const [filtroAperturaId, setFiltroAperturaId] = useState('global');
    const [cargandoResumen, setCargandoResumen] = useState(true);
    const [cargandoAperturasHistorial, setCargandoAperturasHistorial] = useState(true);
    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(10);
    const [busquedaHistorial, setBusquedaHistorial] = useState('');
    const [filtrosHistorial, setFiltrosHistorial] = useState({});

    useEffect(() => {
        const recargarTrasSync = () => {
            setVersionResumen((v) => v + 1);
            setVersionSync((v) => v + 1);
        };
        window.addEventListener('apexgym:ventas-sincronizadas', recargarTrasSync);
        return () => window.removeEventListener('apexgym:ventas-sincronizadas', recargarTrasSync);
    }, []);

    const notificarErrorHistorial = useCallback(() => {
        notifications.show({
            color: 'red',
            title: 'No se pudo cargar el historial de ventas',
            message: 'Intenta actualizar el historial nuevamente.',
        });
    }, []);
    const cambiarFiltrosHistorial = useCallback((filtros) => {
        setFiltrosHistorial(filtros);
        setPagina(1);
    }, []);
    const cambiarBusquedaHistorial = useCallback((busqueda) => {
        setBusquedaHistorial(busqueda);
        setPagina(1);
    }, []);
    const queryHistorial = useMemo(() => ({
        q: busquedaHistorial || undefined,
        cliente: filtrosHistorial.cliente,
        fechaDesde: filtrosHistorial.fechaVenta?.fechaDesde,
        fechaHasta: filtrosHistorial.fechaVenta?.fechaHasta,
        metodoPagoId: filtrosHistorial.metodoPagoId,
        estado: filtrosHistorial.estadoVenta,
        aperturaCajaId: filtroAperturaId === 'global' ? undefined : Number(filtroAperturaId),
    }), [busquedaHistorial, filtrosHistorial, filtroAperturaId]);
    const paginacionHistorial = useMemo(() => ({
        page: pagina,
        pageSize: limite,
        query: queryHistorial,
        onPageChange: setPagina,
        onPageSizeChange: (nuevoLimite) => {
            setLimite(nuevoLimite);
            setPagina(1);
        },
        onFiltersChange: cambiarFiltrosHistorial,
        onSearchChange: cambiarBusquedaHistorial,
    }), [pagina, limite, queryHistorial, cambiarFiltrosHistorial, cambiarBusquedaHistorial]);

    useEffect(() => {
        let vigente = true;
        const cargarAperturasHistorial = async () => {
            setCargandoAperturasHistorial(true);
            try {
                const respuesta = await api.aperturaCaja.obtenerTodos();
                if (respuesta.responseFlag !== 0) {
                    throw new Error(respuesta.message || 'No se pudieron cargar las aperturas.');
                }
                const aperturas = obtenerRegistros(respuesta, 'aperturas de caja')
                    .sort((a, b) => Number(b.id) - Number(a.id));
                if (vigente) setAperturasHistorial(aperturas);
            } catch {
                if (vigente) {
                    setAperturasHistorial([]);
                    notifications.show({
                        color: 'red',
                        message: 'No se pudieron cargar las opciones de caja.',
                    });
                }
            } finally {
                if (vigente) setCargandoAperturasHistorial(false);
            }
        };

        cargarAperturasHistorial();
        return () => { vigente = false; };
    }, []);

    useEffect(() => {
        let vigente = true;
        const cargarResumenCaja = async () => {
            setCargandoResumen(true);
            setResumenCaja(null);
            try {
                const aperturaCajaId = filtroAperturaId === 'global'
                    ? undefined
                    : Number(filtroAperturaId);
                const respuestaResumen = await api.venta.obtenerResumen(
                    aperturaCajaId ? { aperturaCajaId } : {}
                );
                if (respuestaResumen.responseFlag !== 0) {
                    throw new Error(respuestaResumen.message || 'No se pudo obtener el resumen de ventas.');
                }

                if (vigente) setResumenCaja(respuestaResumen.data);
            } catch (error) {
                if (vigente) {
                    setResumenCaja(null);
                    notifications.show({
                        color: 'red',
                        title: 'No se pudo actualizar el resumen',
                        message: obtenerMensajeSeguroVenta(error, 'el resumen de ventas'),
                    });
                }
            } finally {
                if (vigente) setCargandoResumen(false);
            }
        };

        cargarResumenCaja();
        return () => { vigente = false; };
    }, [versionResumen, filtroAperturaId]);

    const cambiarAperturaFiltro = useCallback((value) => {
        setFiltroAperturaId(value ?? 'global');
        setPagina(1);
    }, []);

    const abrirAgregar = ({ form }) => {
        navigate('/registro-de-ventas/nueva', {
            state: {
                empleadoId: form.empleadoId,
                aperturaCajaId: form.aperturaCajaId,
            },
        });
    };

    const validateForm = (form, { editingId, fieldOptions }) => {
        if (editingId) return {};

        const errors = {};
        if (!form.empleadoId) errors.empleadoId = 'Selecciona un empleado';
        if (!form.aperturaCajaId) errors.aperturaCajaId = 'Selecciona una caja abierta';

        if (form.empleadoId && form.aperturaCajaId) {
            const apertura = fieldOptions.aperturaCajaId?.find(
                (opcion) => String(opcion.value) === String(form.aperturaCajaId)
            );
            if (!apertura || apertura.empleadoId !== String(form.empleadoId)) {
                errors.aperturaCajaId = 'La caja abierta debe corresponder al empleado seleccionado';
            }
        }

        return errors;
    };

    const cargarVentaCompleta = async (venta) => {
        const respuesta = await api.venta.obtenerPorId(venta.id);
        const registro = obtenerVenta(respuesta);
        if (!Array.isArray(registro.detalleVenta)) {
            throw new Error('La venta no contiene un detalle válido.');
        }

        return {
            ...venta,
            ...registro,
            createdAt: registro.createdAt ?? venta.createdAt,
            fecha: registro.fecha ?? venta.fecha,
        };
    };

    const abrirDetalle = async (venta, reload) => {
        setCargandoDetalle(true);
        setRecargarDetalle(() => reload);
        setDetalleVenta({ ...venta, detalleVenta: [] });
        try {
            setDetalleVenta(await cargarVentaCompleta(venta));
        } catch {
            setDetalleVenta(null);
            notifications.show({
                color: 'red',
                message: 'No se pudo cargar el detalle de la venta.',
            });
        } finally {
            setCargandoDetalle(false);
        }
    };

    const solicitarCancelacion = async (venta, reload) => {
        try {
            const ventaCompleta = await cargarVentaCompleta(venta);
            if (ventaBloqueaCancelacion(ventaCompleta)) {
                notifications.show({
                    color: 'yellow',
                    title: ventaTieneReembolsoPendiente(ventaCompleta)
                        ? 'Reembolso pendiente'
                        : 'Venta devuelta completamente',
                    message: ventaTieneReembolsoPendiente(ventaCompleta)
                        ? 'Espera a que termine el reembolso antes de cancelar.'
                        : 'Ya se devolvieron todos los artículos de esta venta.',
                });
                return;
            }

            abrirConfirmacionCancelacion(ventaCompleta, () => {
                setMotivoCancelacion('');
                setFolioCancelacion('');
                setConfirmacionTerminal(false);
                setCancelacionPendiente({ venta: ventaCompleta, reload });
            });
        } catch {
            notifications.show({ color: 'red', message: 'No se pudo validar el estado de devolución de la venta.' });
        }
    };

    const confirmarCancelacion = async () => {
        const motivo = motivoCancelacion.trim();
        if (!motivo) {
            notifications.show({ color: 'yellow', message: 'Escribe el motivo de cancelación.' });
            return;
        }

        setCancelando(true);
        try {
            const venta = cancelacionPendiente.venta;
            await api.venta.cancelar(venta.id, motivo, {
                folioCancelacion,
                confirmacionTerminal,
            });
            setVersionResumen((version) => version + 1);
            setCancelacionPendiente(null);
            setMotivoCancelacion('');
            setFolioCancelacion('');
            setConfirmacionTerminal(false);
            try {
                await cancelacionPendiente.reload?.();
            } catch {
                notifications.show({
                    color: 'yellow',
                    message: 'La venta se canceló, pero no se pudo actualizar el historial.',
                });
            }
            notifications.show({ color: 'green', message: 'Venta cancelada correctamente.' });
        } catch (error) {
            const mensajeSeguro = obtenerMensajeSeguroVenta(error, 'la cancelación');
            notifications.show({
                color: 'red',
                title: 'No se pudo completar la cancelación',
                message: mensajeSeguro,
            });
        } finally {
            setCancelando(false);
        }
    };

    const confirmarDevolucion = async () => {
        const pendiente = devolucionPendiente;
        setVersionResumen((version) => version + 1);
        try {
            await pendiente?.reload?.();
        } catch {
            notifications.show({
                color: 'yellow',
                message: 'La devolución se registró, pero no se pudo actualizar el historial.',
            });
        }
        notifications.show({
            color: 'green',
            message: 'Devolución registrada con éxito.',
            autoClose: 5000,
        });
    };

    const mapRecordToForm = (venta) => {
        const empleadoId = venta.empleadoId ?? venta.empleado?.id;
        const aperturaCajaId = venta.aperturaCajaId ?? venta.aperturaCaja?.id;

        return {
            empleadoId: empleadoId != null ? String(empleadoId) : '',
            aperturaCajaId: aperturaCajaId != null ? String(aperturaCajaId) : '',
        };
    };

    const mapFormToPayload = () => ({});

    const mapRecordToRow = (venta) => ({
        id: venta.id,
        folio: venta.folioVenta?.id ?? venta.folioVentaId ?? venta.id,
        cliente: obtenerNombreCliente(venta.cliente ?? venta.client),
        metodoPago: <BadgeMetodoPago metodoPago={venta.metodoPago} />,
        fecha: venta.createdAt ?? null,
        estado: normalizarEstadoVenta(venta.estado) === 'cancelada'
            ? 'CANCELADA'
            : ventaEstaTotalmenteDevuelta(venta)
                ? 'REEMBOLSADO'
                : estadoPagoVenta(venta.estado),
        subtotal: venta.subtotal,
        total: venta.total,
    });

    const continuarPago = async (venta) => {
        try {
            const respuesta = await api.venta.obtenerCheckoutPago(venta.id);
            if (respuesta.responseFlag !== 0) throw new Error(respuesta.message);
            if (respuesta.data?.yaPagada) {
                notifications.show({ color: 'green', message: 'Esta venta ya cuenta con un pago confirmado.' });
                return;
            }
            if (!respuesta.data?.urlCheckout) {
                throw new Error('Mercado Pago no devolvió un enlace de checkout.');
            }
            window.open(respuesta.data.urlCheckout, '_blank');
        } catch {
            notifications.show({
                color: 'red',
                message: 'No se pudo recuperar el checkout. Intenta nuevamente.',
            });
        }
    };

    const renderAcciones = (_fila, venta, { reload }) => (
        <Group gap={6} wrap="nowrap">
            {normalizarEstadoVenta(venta.estado) === 'pendiente_pago' && (
                <Tooltip label="Continuar pago en Mercado Pago">
                    <ActionIcon
                        variant="light"
                        color="blue"
                        aria-label="Continuar pago en Mercado Pago"
                        onClick={() => continuarPago(venta)}
                    >
                        <IconExternalLink size={18} />
                    </ActionIcon>
                </Tooltip>
            )}
            <Tooltip label="Ver detalle del ticket">
                <ActionIcon
                    variant="light"
                    color="blue"
                    aria-label="Ver detalle del ticket"
                    onClick={() => abrirDetalle(venta, reload)}
                >
                    <IconEye size={18} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Descargar ticket PDF">
                <span>
                    <ExportarDocumento
                        crearDocumento={async () => {
                            const ventaTicket = await cargarVentaCompleta(venta);
                            const { default: DocumentoTicketVenta } = await import(
                                '../../../documents/DocumentoTicketVenta.jsx'
                            );
                            return <DocumentoTicketVenta venta={ventaTicket} />;
                        }}
                        nombreArchivo={`ticket-${venta.folioVentaId ?? venta.id}.pdf`}
                        soloDescargar
                    />
                </span>
            </Tooltip>
            {String(venta.estado ?? 'completada').toLowerCase() !== 'cancelada' && (
                <Tooltip label={ventaBloqueaCancelacion(venta)
                    ? (ventaTieneReembolsoPendiente(venta)
                        ? 'Hay un reembolso pendiente.'
                        : 'La venta ya fue devuelta completamente.')
                    : 'Cancelar venta'}>
                    <span>
                        <ActionIcon
                            variant="light"
                            color="red"
                            aria-label="Cancelar venta"
                            disabled={ventaBloqueaCancelacion(venta)}
                            onClick={() => solicitarCancelacion(venta, reload)}
                        >
                            <IconTrash size={18} />
                        </ActionIcon>
                    </span>
                </Tooltip>
            )}
        </Group>
    );

    const abrirDescarte = (venta) => {
        setVentaDescartar(venta);
        setMotivoDescarte('');
    };

    const confirmarDescarte = async () => {
        if (!ventaDescartar) return;
        if (!motivoDescarte.trim()) {
            notifications.show({
                color: 'yellow',
                message: 'Escribe el motivo del descarte para dejar rastro en el registro local.',
            });
            return;
        }

        setProcesandoDescarte(true);
        const descartada = await descartarVentaOffline(ventaDescartar, motivoDescarte.trim());
        setProcesandoDescarte(false);
        if (descartada) {
            setVentaDescartar(null);
            setMotivoDescarte('');
        }
    };

    const manejarImportarArchivo = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) {
            await importarVentasOffline(file);
        }
    };

    return (
        <>
            <CrudCatalogo
                key={`ventas-crud-${versionSync}`}
                titulo="Registro de Ventas"
                singular="Venta"
                icon={IconShoppingCart}
                servicio={api.venta}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={INICIAL}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderAccionesFila={renderAcciones}
                filters={FILTROS}
                initialSortBy="fecha"
                initialSortDirection="desc"
                permitirEditar={false}
                permitirEliminar={false}
                formMode="drawer"
                drawerSize={620}
                headerVariant="unified"
                tableHeaderVariant="neutral"
                validateForm={validateForm}
                createPersonalized={abrirAgregar}
                createButtonLabel="Nueva Venta / Cobro"
                onFetchError={notificarErrorHistorial}
                pageSizeOptions={[10, 20, 50]}
                serverPagination={paginacionHistorial}
                tableMinWidth={1200}
                topContent={(
                    <Stack className={classes.salesOverview} gap="md">
                        <Paper className={classes.cashBanner} p="md" radius="md">
                            <Group justify="space-between" align="center" wrap="wrap" gap="md">
                                <Group align="center" wrap="nowrap">
                                    <ThemeIcon size={48} radius="md" color="orange" variant="light">
                                        <IconCashRegister size={26} stroke={1.8} />
                                    </ThemeIcon>
                                    <div>
                                        <Text className={classes.cashEyebrow}>Resumen de ventas</Text>
                                        <Title order={4} className={classes.cashTitle}>
                                            {filtroAperturaId === 'global'
                                                ? 'Historial global'
                                                : aperturasHistorial.find((apertura) => String(apertura.id) === filtroAperturaId)?.caja?.nombre
                                                    ?? `Apertura #${filtroAperturaId}`}
                                        </Title>
                                        <Text size="sm" c="dimmed">
                                            {filtroAperturaId === 'global'
                                                ? 'Todas las aperturas de caja'
                                                : `Filtro aplicado a la apertura #${filtroAperturaId}`}
                                        </Text>
                                    </div>
                                </Group>
                                <Group gap="sm" align="center">
                                    <Select
                                        aria-label="Filtrar historial por apertura de caja"
                                        className={classes.cashSelect}
                                        label="Historial"
                                        size="sm"
                                        data={[
                                            { value: 'global', label: 'Todas las aperturas' },
                                            ...aperturasHistorial.map((apertura) => ({
                                                value: String(apertura.id),
                                                label: `${apertura.caja?.nombre ?? `Caja #${apertura.cajaId ?? '—'}`} · Apertura #${apertura.id} · ${apertura.estado}`,
                                            })),
                                        ]}
                                        value={filtroAperturaId}
                                        onChange={cambiarAperturaFiltro}
                                        disabled={cargandoAperturasHistorial}
                                        comboboxProps={{ withinPortal: true }}
                                    />
                                </Group>
                            </Group>
                        </Paper>

                        <Paper className={classes.cashBanner} p="md" radius="md">
                            <Stack gap="sm">
                                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                                    <Group gap="sm" wrap="nowrap">
                                        <ThemeIcon size={40} radius="md" color={ventasPendientesTotales > 0 ? 'orange' : 'teal'} variant="light">
                                            <IconCloudOff size={20} stroke={1.8} />
                                        </ThemeIcon>
                                        <div>
                                            <Group gap="xs" wrap="wrap">
                                                <Text fw={700} size="sm" c="var(--ag-text-primary)">
                                                    Ventas sin conexión (solo efectivo)
                                                </Text>
                                                <Badge
                                                    size="sm"
                                                    color={ventasPendientesTotales > 0 ? 'orange' : 'gray'}
                                                    variant={ventasPendientesTotales > 0 ? 'filled' : 'light'}
                                                >
                                                    Pendientes: {ventasPendientesTotales}
                                                </Badge>
                                            </Group>
                                            <Text size="xs" c="var(--ag-text-muted)">
                                                Respalda en JSON firmado o sincroniza las ventas en efectivo capturadas sin internet.
                                            </Text>
                                        </div>
                                    </Group>

                                    <Group gap="xs" wrap="wrap">
                                        <Button
                                            size="xs"
                                            variant="filled"
                                            color="apex"
                                            loading={sincronizando}
                                            disabled={!isOnline || ventasPendientesTotales === 0}
                                            leftSection={<IconRefresh size={14} />}
                                            onClick={() => sincronizarAhora({ silencioso: false })}
                                        >
                                            Sincronizar offline
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            color="secondary"
                                            disabled={ventasPendientesTotales === 0}
                                            leftSection={<IconDownload size={14} />}
                                            onClick={exportarVentasOffline}
                                        >
                                            Exportar JSON
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            color="secondary"
                                            leftSection={<IconUpload size={14} />}
                                            onClick={() => archivoOfflineRef.current?.click()}
                                        >
                                            Importar JSON
                                        </Button>
                                        <input
                                            ref={archivoOfflineRef}
                                            type="file"
                                            accept=".json,application/json"
                                            style={{ display: 'none' }}
                                            aria-label="Importar paquete JSON de ventas offline"
                                            onChange={manejarImportarArchivo}
                                        />
                                    </Group>
                                </Group>

                                {ventasPendientes.filter((v) => v.estadoSync === 'ERROR').map((v) => (
                                    <Alert
                                        key={`error-offline-${v.uuidIdempotencia}`}
                                        color="red"
                                        variant="light"
                                        icon={<IconAlertTriangle size={18} />}
                                        title={`No se pudo sincronizar el folio ${v.folioLocal}`}
                                    >
                                        <Stack gap="xs">
                                            <Text size="xs">
                                                {v.ultimoError || 'El servidor rechazó esta venta al sincronizar.'}
                                            </Text>
                                            <Group gap="xs">
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="red"
                                                    leftSection={<IconRefresh size={14} />}
                                                    disabled={!isOnline}
                                                    loading={sincronizando}
                                                    onClick={() => reintentarVentaOffline(v)}
                                                >
                                                    Reintentar
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="subtle"
                                                    color="gray"
                                                    leftSection={<IconTrash size={14} />}
                                                    onClick={() => abrirDescarte(v)}
                                                >
                                                    Descartar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </Alert>
                                ))}

                                {ventasPendientes.length > 0 && (
                                    <Table.ScrollContainer minWidth={600}>
                                        <Table striped highlightOnHover withTableBorder fz="xs">
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Folio local</Table.Th>
                                                    <Table.Th>Cliente</Table.Th>
                                                    <Table.Th>Método</Table.Th>
                                                    <Table.Th>Total</Table.Th>
                                                    <Table.Th>Estado</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {ventasPendientes.map((v) => (
                                                    <Table.Tr key={v.uuidIdempotencia}>
                                                        <Table.Td fw={700}>{v.folioLocal}</Table.Td>
                                                        <Table.Td>{obtenerNombreCliente(v.cliente)}</Table.Td>
                                                        <Table.Td>
                                                            <Badge color="teal" variant="light" size="xs">
                                                                EFECTIVO
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td fw={600}>{formatoMoneda.format(Number(v.total || 0))}</Table.Td>
                                                        <Table.Td>
                                                            <Badge
                                                                color={v.estadoSync === 'ERROR' ? 'red' : 'orange'}
                                                                variant="light"
                                                                size="xs"
                                                            >
                                                                {v.estadoSync === 'ERROR' ? 'Error al sincronizar' : 'Pendiente sync'}
                                                            </Badge>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Table.ScrollContainer>
                                )}
                            </Stack>
                        </Paper>

                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            <TarjetaResumen
                                icon={IconCash}
                                label="Total cobrado"
                                value={cargandoResumen ? '—' : formatoMoneda.format(Number(resumenCaja?.totalCobrado ?? 0))}
                                color="green"
                            />
                            <TarjetaResumen
                                icon={IconTrash}
                                label="Total cancelado"
                                value={cargandoResumen ? '—' : formatoMoneda.format(Number(resumenCaja?.totalCancelado ?? 0))}
                                color="red"
                            />
                            <TarjetaResumen
                                icon={IconArrowBackUp}
                                label="Total reembolsado"
                                value={cargandoResumen ? '—' : formatoMoneda.format(Number(resumenCaja?.totalReembolsado ?? 0))}
                                color="blue"
                            />
                        </SimpleGrid>
                    </Stack>
                )}
            />
            <Modal
                opened={Boolean(ventaDescartar)}
                onClose={() => {
                    if (!procesandoDescarte) setVentaDescartar(null);
                }}
                title="Descartar venta offline"
                centered
            >
                <Stack gap="sm">
                    <Text size="sm">
                        La venta <strong>{ventaDescartar?.folioLocal}</strong> no se enviará al servidor.
                        Quedará archivada en este dispositivo como descartada, con el motivo registrado.
                    </Text>
                    <Textarea
                        label="Motivo"
                        placeholder="Ej. venta duplicada, el cliente se retiró, artículo descontinuado..."
                        value={motivoDescarte}
                        onChange={(event) => setMotivoDescarte(event.currentTarget.value)}
                        minRows={3}
                        autosize
                    />
                    <Group justify="flex-end" gap="xs">
                        <Button
                            variant="default"
                            onClick={() => setVentaDescartar(null)}
                            disabled={procesandoDescarte}
                        >
                            Cancelar
                        </Button>
                        <Button color="red" loading={procesandoDescarte} onClick={confirmarDescarte}>
                            Descartar venta
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            <DetalleVentaModal
                venta={detalleVenta}
                cargando={cargandoDetalle}
                onReturn={() => {
                    setDevolucionPendiente({
                        venta: detalleVenta,
                        reload: recargarDetalle,
                    });
                    setDetalleVenta(null);
                }}
                onClose={() => setDetalleVenta(null)}
            />
            <FormularioDevolucionModal
                venta={devolucionPendiente?.venta}
                onClose={() => setDevolucionPendiente(null)}
                onSuccess={confirmarDevolucion}
            />
            <CancelarVentaModal
                venta={cancelacionPendiente?.venta}
                motivo={motivoCancelacion}
                cancelando={cancelando}
                folioCancelacion={folioCancelacion}
                confirmacionTerminal={confirmacionTerminal}
                onMotivoChange={setMotivoCancelacion}
                onFolioCancelacionChange={setFolioCancelacion}
                onConfirmacionTerminalChange={setConfirmacionTerminal}
                onClose={() => setCancelacionPendiente(null)}
                onConfirm={confirmarCancelacion}
            />
        </>
    );
}

export default Ventas;
