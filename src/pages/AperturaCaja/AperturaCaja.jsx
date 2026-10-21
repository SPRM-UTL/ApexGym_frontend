import { useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Group,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconCalendar,
    IconCash,
    IconEdit,
    IconTrash,
    IconUser,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
import { obtenerUsuarioActual } from '../../scripts/constantes.js';

/* ─── Obtener fecha local en formato YYYY-MM-DD ─────────────────────────────── */
const obtenerFechaHoyLocal = () => {
    const d = new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

/* ─── Formatear fecha y hora para visualización en tabla (es-MX) ────────────── */
const formatearFechaHora = (fecha) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/* ─── Campos (para validación y payload) ────────────────────────────────────── */
const CAMPOS = [
    {
        key: 'cajaId',
        label: 'Caja',
        required: true,
        loadOptions: async () => {
            try {
                const [cajasRes, aperturasRes] = await Promise.all([
                    api.caja.obtenerTodos(),
                    api.aperturaCaja.obtenerTodos(),
                ]);
                const cajasAbiertas = new Set(
                    (aperturasRes?.data ?? [])
                        .filter((a) => a.estado === 'ABIERTA')
                        .map((a) => a.cajaId)
                );
                return (cajasRes?.data ?? []).map((c) => ({
                    value: String(c.id),
                    label: cajasAbiertas.has(c.id) ? `${c.nombre} (Ya abierta)` : c.nombre,
                    disabled: cajasAbiertas.has(c.id),
                }));
            } catch (err) {
                console.error('Error cargando opciones de cajas:', err);
                return [];
            }
        },
    },
    {
        key: 'empleadoId',
        label: 'Empleado',
        required: true,
        loadOptions: async () => {
            try {
                const r = await api.empleado.obtenerTodos();
                return (r?.data ?? []).map((e) => ({ value: String(e.id), label: `${e.nombre} ${e.apellidoPaterno}` }));
            } catch (err) {
                console.error('Error cargando opciones de empleados:', err);
                return [];
            }
        },
    },
    { key: 'montoInicial', label: 'Monto Inicial', required: true, type: 'number', min: 0, max: 200000 },
    { key: 'fechaApertura', label: 'Fecha de Apertura', required: true, type: 'date' },
    { key: 'observaciones', label: 'Observaciones', maxLength: 500 },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'numero',        label: '#',              sortable: true, filterable: true },
    { key: 'caja',          label: 'Caja',           sortable: true, filterable: true },
    { key: 'empleado',      label: 'Empleado',        sortable: true, filterable: true },
    { key: 'montoInicial',  label: 'Monto Inicial',   sortable: true, filterable: true },
    { key: 'fechaApertura', label: 'Fecha Apertura',  sortable: true, filterable: true },
    { key: 'estado',        label: 'Estado',          sortable: true, filterable: true },
];

const INICIAL = {
    cajaId: '',
    empleadoId: '',
    montoInicial: '',
    fechaApertura: obtenerFechaHoyLocal(),
    observaciones: '',
};

/* ─── Estilos de sección ────────────────────────────────────────────────────── */
const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

/* ─── Formulario personalizado ──────────────────────────────────────────────── */
function AperturaForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCash size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información de apertura</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    {/* Col 1 */}
                    <NativeSelect
                        label="Caja"
                        withAsterisk
                        value={form.cajaId ?? ''}
                        error={errors.cajaId}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        data={[{ value: '', label: 'Selecciona una caja' }, ...(fieldOptions.cajaId ?? [])]}
                        onChange={(e) => onChange('cajaId', e.currentTarget.value)}
                    />
                    <NativeSelect
                        label="Empleado"
                        withAsterisk
                        value={form.empleadoId ?? ''}
                        error={errors.empleadoId}
                        size="md"
                        radius="md"
                        leftSection={<IconUser size={16} stroke={1.5} />}
                        data={[{ value: '', label: 'Selecciona un empleado' }, ...(fieldOptions.empleadoId ?? [])]}
                        onChange={(e) => onChange('empleadoId', e.currentTarget.value)}
                    />
                    {/* Col 2 */}
                    <NumberInput
                        label="Monto Inicial"
                        withAsterisk
                        prefix="$"
                        min={0}
                        max={200000}
                        clampBehavior="strict"
                        placeholder="Ej. $1,000.00 (Máx. $200,000.00)"
                        decimalScale={2}
                        description="Límite máximo de fondo: $200,000.00"
                        value={form.montoInicial ?? ''}
                        error={errors.montoInicial}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        onChange={(v) => onChange('montoInicial', v)}
                    />
                    <TextInput
                        label="Fecha de Apertura"
                        withAsterisk
                        type="date"
                        value={form.fechaApertura || obtenerFechaHoyLocal()}
                        error={errors.fechaApertura}
                        size="md"
                        radius="md"
                        leftSection={<IconCalendar size={16} stroke={1.5} />}
                        onChange={(e) => onChange('fechaApertura', e.currentTarget.value)}
                    />
                    {/* Full width observaciones */}
                    <Textarea
                        label="Observaciones"
                        placeholder="Observaciones de la apertura"
                        value={form.observaciones ?? ''}
                        error={errors.observaciones}
                        maxLength={500}
                        description="Máximo 500 caracteres"
                        size="md"
                        radius="md"
                        minRows={2}
                        style={{ gridColumn: '1 / -1' }}
                        onChange={(e) => onChange('observaciones', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>

            {/* Banner de errores visibles */}
            {Object.keys(errors).length > 0 && Object.values(errors).some(Boolean) && (
                <Alert
                    icon={<IconAlertCircle size={18} />}
                    title="Campos que requieren atención"
                    color="red"
                    variant="light"
                    radius="md"
                >
                    <Stack gap={2}>
                        {Object.entries(errors)
                            .filter(([_, msg]) => Boolean(msg))
                            .map(([key, msg]) => (
                                <Text size="xs" key={key} fw={600} c="red">
                                    • {msg}
                                </Text>
                            ))}
                    </Stack>
                </Alert>
            )}
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function AperturaCaja() {
    const usuarioActual = obtenerUsuarioActual();
    const esAdminOSupervisor = useMemo(() => {
        if (!usuarioActual) return false;
        const nombreRol = usuarioActual?.roles?.[0]?.nombre || usuarioActual?.rol || '';
        const rolLower = String(nombreRol).toLowerCase();
        return rolLower.includes('admin') || rolLower.includes('supervisor');
    }, [usuarioActual]);

    const [aperturaACancelar, setAperturaACancelar] = useState(null);
    const [cancelando, setCancelando] = useState(false);
    const recargarTablaRef = useRef(null);

    const mapRecordToForm = useMemo(() => (record) => {
        let fechaForm = obtenerFechaHoyLocal();
        if (record.fechaApertura) {
            const d = new Date(record.fechaApertura);
            if (!isNaN(d.getTime())) {
                fechaForm = d.toISOString().split('T')[0];
            }
        }
        return {
            cajaId:       record.caja?.id     ? String(record.caja.id)     : String(record.cajaId     ?? ''),
            empleadoId:   record.empleado?.id ? String(record.empleado.id) : String(record.empleadoId ?? ''),
            montoInicial: record.montoInicial ?? '',
            fechaApertura: fechaForm,
            observaciones: record.observaciones ?? '',
        };
    }, []);

    const mapFormToPayload = (form) => ({
        cajaId:       Number(form.cajaId),
        empleadoId:   Number(form.empleadoId),
        montoInicial: Number(form.montoInicial),
        fechaApertura: form.fechaApertura || obtenerFechaHoyLocal(),
        observaciones: form.observaciones || null,
    });

    const mapRecordToRow = (record) => ({
        id:           record.id,
        numero: (
            <Badge variant="light" color="gray" size="sm" radius="sm">
                #{record.id}
            </Badge>
        ),
        caja:         record.caja?.nombre ?? '—',
        empleado:     record.empleado
            ? `${record.empleado.nombre} ${record.empleado.apellidoPaterno}`
            : '—',
        montoInicial: `$${Number(record.montoInicial ?? 0).toFixed(2)}`,
        fechaApertura: formatearFechaHora(record.fechaApertura),
        estado: (
            <Badge color={record.estado === 'ABIERTA' ? 'green' : 'red'} variant="light">
                {record.estado ?? '—'}
            </Badge>
        ),
    });

    const handleConfirmarCancelacion = async () => {
        if (!aperturaACancelar) return;
        try {
            setCancelando(true);
            const res = await api.aperturaCaja.eliminar(aperturaACancelar.id);
            if (res.responseFlag !== 0) throw new Error(res.message);
            notifications.show({
                title: 'Apertura cancelada',
                message: 'La apertura de caja fue cancelada y la caja ha sido liberada correctamente.',
                color: 'green',
            });
            setAperturaACancelar(null);
            recargarTablaRef.current?.();
        } catch (err) {
            notifications.show({
                title: 'Error al cancelar apertura',
                message: err.message || 'No se pudo cancelar la apertura de caja.',
                color: 'red',
            });
        } finally {
            setCancelando(false);
        }
    };

    return (
        <>
            <ModalConfirmacion
                opened={Boolean(aperturaACancelar)}
                onClose={() => !cancelando && setAperturaACancelar(null)}
                onConfirm={handleConfirmarCancelacion}
                loading={cancelando}
                title="Cancelar apertura de caja"
                message={`¿Deseas cancelar la apertura activa de la caja "${aperturaACancelar?.caja?.nombre ?? 'seleccionada'}"? Esta acción cancelará la sesión y liberará la caja para nuevas aperturas.`}
                confirmText="Sí, cancelar apertura"
            />

            <CrudCatalogo
                titulo="Apertura de Caja"
                singular="Apertura"
                icon={IconCash}
                servicio={api.aperturaCaja}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={{ ...INICIAL, fechaApertura: obtenerFechaHoyLocal() }}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderForm={(props) => <AperturaForm {...props} />}
                permitirEditar={false}
                permitirEliminar={false}
                initialSortBy="fechaApertura"
                initialSortDirection="asc"
                renderAccionesFila={(fila, recordOriginal, helpers) => {
                    const apertura = recordOriginal ?? fila?._recordOriginal ?? fila;
                    const esAbierta = apertura?.estado === 'ABIERTA';
                    const esCerrada = apertura?.estado === 'CERRADA';

                    if (helpers?.reload) {
                        recargarTablaRef.current = helpers.reload;
                    }

                    // Reglas de Edición:
                    // - Si está cerrada: no puede modificarse.
                    // - Si está abierta: no puede modificarse a menos que tenga permiso específico (admin/supervisor).
                    const puedeEditar = esAbierta && esAdminOSupervisor;
                    const tooltipEdicion = esCerrada
                        ? 'No se puede editar una apertura que ya ha sido cerrada'
                        : (!esAdminOSupervisor
                            ? 'Una apertura abierta no puede modificarse salvo que cuente con permisos de supervisor o administrador'
                            : 'Editar apertura de caja');

                    // Reglas de Eliminación / Cancelación:
                    // - Si está cerrada: no puede eliminarse ("una vez cerrada es imposible eliminarse").
                    // - Si está abierta: solo puede cancelarse ("solo puede cancelarse, no eliminarse").
                    const puedeCancelar = esAbierta;
                    const tooltipEliminacion = esCerrada
                        ? 'No pueden eliminarse, una vez cerrada la caja es imposible eliminarla'
                        : 'Cancelar apertura de caja';

                    return (
                        <Group gap={6} wrap="nowrap">
                            <Tooltip label={tooltipEdicion} withArrow openDelay={200}>
                                <span style={{ display: 'inline-block' }}>
                                    <ActionIcon
                                        variant="light"
                                        size="lg"
                                        color={puedeEditar ? 'blue' : 'gray'}
                                        disabled={!puedeEditar}
                                        aria-label="Editar apertura"
                                        onClick={() => puedeEditar && helpers?.openEdit(apertura)}
                                    >
                                        <IconEdit size={18} stroke={1.8} />
                                    </ActionIcon>
                                </span>
                            </Tooltip>

                            <Tooltip label={tooltipEliminacion} withArrow openDelay={200}>
                                <span style={{ display: 'inline-block' }}>
                                    <ActionIcon
                                        variant="light"
                                        size="lg"
                                        color={puedeCancelar ? 'red' : 'gray'}
                                        disabled={!puedeCancelar}
                                        aria-label={esAbierta ? 'Cancelar apertura' : 'Eliminar apertura'}
                                        onClick={() => puedeCancelar && setAperturaACancelar(apertura)}
                                    >
                                        <IconTrash size={18} stroke={1.8} />
                                    </ActionIcon>
                                </span>
                            </Tooltip>
                        </Group>
                    );
                }}
            />
        </>
    );
}

export default AperturaCaja;
