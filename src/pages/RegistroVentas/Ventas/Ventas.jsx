import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
    ActionIcon,
    Group,
    Tooltip,
} from '@mantine/core';
import {
    IconEye,
    IconShoppingCart,
    IconTrash,
} from '@tabler/icons-react';

import { cambioNombreWeb } from '../../../scripts/globales.js';
import { api } from '../../../scripts/services/api.js';
import { CrudCatalogo } from '../../../components/CrudCatalogo/CrudCatalogo.jsx';
import { CancelarVentaModal } from '../components/CancelarVentaModal.jsx';
import { DetalleVentaModal } from '../components/DetalleVentaModal.jsx';
import ExportarDocumento from '../../../components/exportar-documento/ExportarDocumento.jsx';
import {
    obtenerEmpleadoIdApertura,
    obtenerNombreCliente,
    obtenerNombreEmpleado,
    obtenerRegistros,
    obtenerVenta,
} from '../../../utils/ventaHelper/ventaHelpers.js';

const COLUMNAS = [
    { key: 'folio', label: 'Folio', sortable: false, filterable: false },
    { key: 'cliente', label: 'Cliente', sortable: false, filterable: false },
    { key: 'fecha', label: 'Fecha', sortable: false, filterable: false, format: 'date' },
    { key: 'estado', label: 'Estado', sortable: false, filterable: false, format: 'status' },
    { key: 'subtotal', label: 'Subtotal', sortable: false, filterable: false, format: 'currency' },
    { key: 'total', label: 'Total', sortable: false, filterable: false, format: 'currency' },
];

const normalizarEstadoVenta = (estado) => {
    const valor = String(estado ?? '').trim().toLocaleLowerCase();
    if (['cancelada', 'cancelado'].includes(valor)) return 'cancelada';
    if (['completada', 'completado', 'completa'].includes(valor)) return 'completada';
    return valor;
};

const etiquetaEstadoVenta = (estado) => {
    const normalizado = normalizarEstadoVenta(estado);
    if (normalizado === 'cancelada') return 'Cancelada';
    if (normalizado === 'completada') return 'Completada';
    return normalizado ? normalizado[0].toLocaleUpperCase() + normalizado.slice(1) : '';
};

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
            { value: 'cancelada', label: 'Cancelada' },
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
    const [detalleVenta, setDetalleVenta] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [cancelacionPendiente, setCancelacionPendiente] = useState(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [cancelando, setCancelando] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(20);
    const [busquedaHistorial, setBusquedaHistorial] = useState('');
    const [filtrosHistorial, setFiltrosHistorial] = useState({});
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
    }), [busquedaHistorial, filtrosHistorial]);
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

    const abrirDetalle = async (venta) => {
        setCargandoDetalle(true);
        setDetalleVenta({ ...venta, detalleVenta: [] });
        try {
            setDetalleVenta(await cargarVentaCompleta(venta));
        } catch (error) {
            setDetalleVenta(null);
            notifications.show({
                color: 'red',
                message: error.message || 'No se pudo cargar el detalle de la venta.',
            });
        } finally {
            setCargandoDetalle(false);
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
            await api.venta.eliminar(cancelacionPendiente.venta.id, motivo);
            await cancelacionPendiente.reload();
            setCancelacionPendiente(null);
            setMotivoCancelacion('');
            notifications.show({ color: 'green', message: 'Venta cancelada correctamente.' });
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error.message || 'No se pudo cancelar la venta.',
            });
        } finally {
            setCancelando(false);
        }
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
        folio: venta.folioVentaId ?? '—',
        cliente: obtenerNombreCliente(venta.cliente ?? venta.client),
        fecha: venta.createdAt ?? null,
        estado: venta.estado ?? 'completada',
        subtotal: venta.subtotal,
        total: venta.total,
    });

    const renderAcciones = (_fila, venta, { reload }) => (
        <Group gap={6} wrap="nowrap">
            <Tooltip label="Ver detalle del ticket">
                <ActionIcon
                    variant="light"
                    color="blue"
                    aria-label="Ver detalle del ticket"
                    onClick={() => abrirDetalle(venta)}
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
                <Tooltip label="Cancelar venta">
                    <ActionIcon
                        variant="light"
                        color="red"
                        aria-label="Cancelar venta"
                        onClick={() => {
                            setMotivoCancelacion('');
                            setCancelacionPendiente({ venta, reload });
                        }}
                    >
                        <IconTrash size={18} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );

    return (
        <>
            <CrudCatalogo
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
                pageSizeOptions={[10, 20, 50]}
                serverPagination={paginacionHistorial}
            />
            <DetalleVentaModal
                venta={detalleVenta}
                cargando={cargandoDetalle}
                onClose={() => setDetalleVenta(null)}
            />
            <CancelarVentaModal
                venta={cancelacionPendiente?.venta}
                motivo={motivoCancelacion}
                cancelando={cancelando}
                onMotivoChange={setMotivoCancelacion}
                onClose={() => setCancelacionPendiente(null)}
                onConfirm={confirmarCancelacion}
            />
        </>
    );
}

export default Ventas;
