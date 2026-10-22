import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Modal,
    NativeSelect,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Table,
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
    IconCoins,
    IconEdit,
    IconEye,
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

/* ─── Denominaciones monetarias (Pesos Mexicanos) ─────────────────────────── */
const DENOMINACIONES = [
    { valor: 1000, tipo: 'billete', label: '$1,000' },
    { valor: 500,  tipo: 'billete', label: '$500'   },
    { valor: 200,  tipo: 'billete', label: '$200'   },
    { valor: 100,  tipo: 'billete', label: '$100'   },
    { valor: 50,   tipo: 'billete', label: '$50'    },
    { valor: 20,   tipo: 'billete', label: '$20'    },
    { valor: 10,   tipo: 'moneda',  label: '$10'    },
    { valor: 5,    tipo: 'moneda',  label: '$5'     },
    { valor: 2,    tipo: 'moneda',  label: '$2'     },
    { valor: 1,    tipo: 'moneda',  label: '$1'     },
    { valor: 0.5,  tipo: 'moneda',  label: '$0.50'  },
];

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
    desgloseInicio: null,
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
    // Conteo de billetes y monedas para fondo inicial
    const [conteoBilletes, setConteoBilletes] = useState(() => {
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object') {
            return form.desgloseInicio;
        }
        const init = {};
        for (const d of DENOMINACIONES) init[d.valor] = '';
        return init;
    });

    useEffect(() => {
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object') {
            setConteoBilletes(form.desgloseInicio);
        } else if (!form.desgloseInicio) {
            const init = {};
            for (const d of DENOMINACIONES) init[d.valor] = '';
            setConteoBilletes(init);
        }
    }, [form.desgloseInicio]);

    const montoUsuario = Number(form.montoInicial || 0);

    // Total acumulado actual del desglose de efectivo inicial
    const totalDesglose = useMemo(() => {
        let total = 0;
        for (const d of DENOMINACIONES) {
            const c = conteoBilletes[d.valor] === '' ? 0 : Number(conteoBilletes[d.valor]);
            total += d.valor * c;
        }
        return Math.round(total * 100) / 100;
    }, [conteoBilletes]);

    const desgloseExcedeMonto = montoUsuario > 0 && totalDesglose > montoUsuario;

    // Calcula el subtotal de todas las demás denominaciones excepto la indicada
    const calcularTotalOtras = (valorActual) => {
        let sum = 0;
        for (const item of DENOMINACIONES) {
            if (item.valor !== valorActual) {
                const cant = conteoBilletes[item.valor] === '' ? 0 : Number(conteoBilletes[item.valor]);
                sum += item.valor * cant;
            }
        }
        return Math.round(sum * 100) / 100;
    };

    // Calcula la cantidad máxima permitida para una denominación según el monto inicial ingresado
    const maxCantidadPermitida = (valor) => {
        if (montoUsuario <= 0) return 500;
        const totalOtras = calcularTotalOtras(valor);
        const restante = Math.max(0, Math.round((montoUsuario - totalOtras) * 100) / 100);
        return Math.floor(restante / valor);
    };

    // Manejar cambio en conteo de denominaciones
    const actualizarDenominacion = (valor, cantidad) => {
        let cant = 0;
        if (cantidad !== '' && !isNaN(Number(cantidad))) {
            cant = Math.max(0, Math.floor(Number(cantidad)));
        }

        // Si el usuario ingresó un monto inicial, los billetes/monedas NO deben superar ese monto
        if (montoUsuario > 0) {
            const maxPermitido = maxCantidadPermitida(valor);
            cant = Math.min(cant, maxPermitido);
        } else {
            cant = Math.min(cant, 500);
        }

        const valToStore = cantidad === '' ? '' : cant;
        const nuevoConteo = { ...conteoBilletes, [valor]: valToStore };
        setConteoBilletes(nuevoConteo);

        let total = 0;
        for (const d of DENOMINACIONES) {
            const c = nuevoConteo[d.valor] === '' ? 0 : Number(nuevoConteo[d.valor]);
            total += d.valor * c;
        }
        total = Math.round(total * 100) / 100;

        onChange('desgloseInicio', nuevoConteo);

        // Si el usuario NO había ingresado un monto inicial previamente, el desglose llena el monto inicial automáticamente.
        // Si ya había ingresado un monto, NO se sobreescribe para respetar la cantidad que puso.
        if (montoUsuario <= 0 && (total > 0 || Object.values(nuevoConteo).some((v) => v !== '' && Number(v) > 0))) {
            onChange('montoInicial', total);
        }
    };

    const limpiarDesglose = () => {
        const init = {};
        for (const d of DENOMINACIONES) init[d.valor] = '';
        setConteoBilletes(init);
        onChange('desgloseInicio', null);
    };

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
                        label="Monto Inicial (Fondo de caja)"
                        withAsterisk
                        prefix="$"
                        min={0}
                        max={200000}
                        clampBehavior="strict"
                        placeholder="Ej. $1,000.00 (Máx. $200,000.00)"
                        decimalScale={2}
                        description="Límite máximo de fondo: $200,000.00"
                        value={form.montoInicial ?? ''}
                        error={
                            desgloseExcedeMonto
                                ? `El total de billetes/monedas ($${totalDesglose.toFixed(2)}) supera este monto`
                                : errors.montoInicial
                        }
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

            {/* ── Billetes y monedas de inicio (Fondo de caja) ── */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" color="apex">
                        <IconCoins size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Billetes y monedas de inicio (Fondo de caja)</Title>
                </div>

                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fffdfa' }}>
                    <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
                        <Text size="xs" c="dimmed">
                            {montoUsuario > 0
                                ? `Captura con qué billetes y monedas cuentas para cubrir los $${montoUsuario.toFixed(2)} de fondo inicial.`
                                : 'Ingresa la cantidad de billetes y monedas con que abres caja (el monto inicial se calculará automáticamente).'}
                        </Text>
                        <Group gap="xs">
                            {totalDesglose > 0 && (
                                <Button
                                    variant="subtle"
                                    color="gray"
                                    size="compact-xs"
                                    onClick={limpiarDesglose}
                                >
                                    Limpiar desglose
                                </Button>
                            )}
                            <Badge
                                color={
                                    desgloseExcedeMonto
                                        ? 'red'
                                        : montoUsuario > 0 && totalDesglose === montoUsuario
                                        ? 'green'
                                        : 'apex'
                                }
                                variant="light"
                                size="md"
                            >
                                Total Desglose: ${totalDesglose.toFixed(2)}
                                {montoUsuario > 0 && ` / $${montoUsuario.toFixed(2)}`}
                            </Badge>
                        </Group>
                    </Group>

                    {desgloseExcedeMonto && (
                        <Alert
                            icon={<IconAlertCircle size={15} />}
                            title="Desglose excede el monto inicial"
                            color="red"
                            variant="light"
                            radius="sm"
                            p="xs"
                            mb="xs"
                        >
                            <Text size="xs">
                                El total de billetes y monedas (${totalDesglose.toFixed(2)}) supera el monto inicial (${montoUsuario.toFixed(2)}). Ajusta las cantidades o haz clic en "Limpiar desglose".
                            </Text>
                        </Alert>
                    )}

                    <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Denominación</Table.Th>
                                <Table.Th style={{ width: 130, textAlign: 'center' }}>Cantidad</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {DENOMINACIONES.map((d) => {
                                const cantStr = conteoBilletes[d.valor] ?? '';
                                const cantNum = cantStr === '' ? 0 : Number(cantStr);
                                const subtotal = d.valor * cantNum;
                                const maxPerm = maxCantidadPermitida(d.valor);
                                const noPermiteMas = montoUsuario > 0 && maxPerm <= 0 && cantNum === 0;

                                return (
                                    <Table.Tr
                                        key={d.valor}
                                        style={{
                                            backgroundColor: subtotal > 0 ? '#fff9f4' : undefined,
                                            opacity: noPermiteMas ? 0.6 : 1,
                                        }}
                                    >
                                        <Table.Td fw={600}>
                                            <Group gap={6} wrap="nowrap">
                                                <span>{d.label}</span>
                                                {montoUsuario > 0 && (
                                                    <Badge
                                                        size="xs"
                                                        variant="subtle"
                                                        color={maxPerm > 0 || cantNum > 0 ? 'gray' : 'red'}
                                                        style={{ fontSize: 10 }}
                                                    >
                                                        Máx: {maxPerm}
                                                    </Badge>
                                                )}
                                            </Group>
                                        </Table.Td>
                                        <Table.Td style={{ padding: 4 }}>
                                            <NumberInput
                                                size="xs"
                                                min={0}
                                                max={montoUsuario > 0 ? maxPerm : 500}
                                                clampBehavior="strict"
                                                allowDecimal={false}
                                                placeholder="0"
                                                value={cantStr}
                                                disabled={noPermiteMas}
                                                onChange={(v) => actualizarDenominacion(d.valor, v)}
                                                styles={{ input: { textAlign: 'center' } }}
                                            />
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right', fontWeight: subtotal > 0 ? 700 : 400 }}>
                                            ${subtotal.toFixed(2)}
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Paper>
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

/* ─── Modal para ver el desglose inicial de la caja ────────────────────────── */
function ModalDetalleApertura({ apertura, opened, onClose }) {
    if (!apertura) return null;

    let desglose = null;
    try {
        if (apertura.desgloseInicio) {
            desglose = typeof apertura.desgloseInicio === 'string'
                ? JSON.parse(apertura.desgloseInicio)
                : apertura.desgloseInicio;
        }
    } catch (e) {
        desglose = null;
    }

    const tieneDesglose = desglose && typeof desglose === 'object' && Object.values(desglose).some((v) => Number(v) > 0);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <ThemeIcon color="apex" variant="light" size="md">
                        <IconCoins size={18} />
                    </ThemeIcon>
                    <Title order={5}>
                        Fondo Inicial y Desglose — #{apertura.id} ({apertura.caja?.nombre ?? 'Caja'})
                    </Title>
                </Group>
            }
            size="md"
            radius="md"
        >
            <Stack gap="md">
                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                    <SimpleGrid cols={2} spacing="xs">
                        <div>
                            <Text size="xs" c="dimmed">Caja:</Text>
                            <Text size="sm" fw={600}>{apertura.caja?.nombre ?? '—'}</Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Empleado responsable:</Text>
                            <Text size="sm" fw={600}>
                                {apertura.empleado ? `${apertura.empleado.nombre} ${apertura.empleado.apellidoPaterno}` : '—'}
                            </Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Fecha de apertura:</Text>
                            <Text size="sm" fw={600}>{formatearFechaHora(apertura.fechaApertura)}</Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Monto Inicial:</Text>
                            <Text size="md" fw={700} c="apex">
                                ${Number(apertura.montoInicial ?? 0).toFixed(2)}
                            </Text>
                        </div>
                    </SimpleGrid>
                </Paper>

                {tieneDesglose ? (
                    <Table withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Denominación</Table.Th>
                                <Table.Th style={{ textAlign: 'center', width: 90 }}>Cantidad</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {DENOMINACIONES.map((d) => {
                                const cant = Number(desglose[d.valor] ?? 0);
                                if (cant <= 0) return null;
                                const sub = d.valor * cant;
                                return (
                                    <Table.Tr key={d.valor}>
                                        <Table.Td fw={600}>{d.label}</Table.Td>
                                        <Table.Td style={{ textAlign: 'center' }}>
                                            <Badge variant="light" color="gray" size="sm">
                                                {cant}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            ${sub.toFixed(2)}
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light" radius="md">
                        Esta sesión de caja se abrió con un monto inicial registrado de <b>${Number(apertura.montoInicial ?? 0).toFixed(2)}</b> sin desglose detallado de billetes.
                    </Alert>
                )}

                {apertura.observaciones && (
                    <div>
                        <Text size="xs" c="dimmed">Observaciones:</Text>
                        <Text size="sm">{apertura.observaciones}</Text>
                    </div>
                )}

                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={onClose} size="sm">
                        Cerrar
                    </Button>
                </Group>
            </Stack>
        </Modal>
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
    const [aperturaDetalle, setAperturaDetalle] = useState(null);
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

        let desglose = null;
        try {
            if (record.desgloseInicio) {
                desglose = typeof record.desgloseInicio === 'string'
                    ? JSON.parse(record.desgloseInicio)
                    : record.desgloseInicio;
            }
        } catch (e) {}

        return {
            cajaId:         record.caja?.id     ? String(record.caja.id)     : String(record.cajaId     ?? ''),
            empleadoId:     record.empleado?.id ? String(record.empleado.id) : String(record.empleadoId ?? ''),
            montoInicial:   record.montoInicial ?? '',
            fechaApertura:  fechaForm,
            desgloseInicio: desglose,
            observaciones:  record.observaciones ?? '',
        };
    }, []);

    const mapFormToPayload = (form) => {
        let desgloseClean = null;
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object') {
            const clean = {};
            for (const [k, v] of Object.entries(form.desgloseInicio)) {
                if (v !== '' && Number(v) > 0) clean[k] = Number(v);
            }
            if (Object.keys(clean).length > 0) {
                desgloseClean = clean;
            }
        }

        return {
            cajaId:         Number(form.cajaId),
            empleadoId:     Number(form.empleadoId),
            montoInicial:   Number(form.montoInicial),
            fechaApertura:  form.fechaApertura || obtenerFechaHoyLocal(),
            desgloseInicio: desgloseClean,
            observaciones:  form.observaciones || null,
        };
    };

    const mapRecordToRow = (record) => ({
        id:           record.id,
        _recordOriginal: record,
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

    const validateForm = async (form) => {
        const errors = {};
        if (!form.cajaId) errors.cajaId = 'Selecciona una caja';
        if (!form.empleadoId) errors.empleadoId = 'Selecciona un empleado';
        if (form.montoInicial === '' || Number(form.montoInicial) < 0) {
            errors.montoInicial = 'El monto inicial no puede ser negativo';
        }
        if (Number(form.montoInicial) > 200000) {
            errors.montoInicial = 'El monto inicial no puede exceder $200,000.00';
        }
        if (!form.fechaApertura) errors.fechaApertura = 'La fecha de apertura es requerida';
        if (form.observaciones?.trim().length > 500) {
            errors.observaciones = 'Las observaciones no pueden exceder 500 caracteres';
        }

        // Validar que el desglose no supere el monto inicial si ambos están presentes
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object' && Number(form.montoInicial) > 0) {
            let totalDesglose = 0;
            for (const d of DENOMINACIONES) {
                const c = form.desgloseInicio[d.valor] === '' || form.desgloseInicio[d.valor] == null ? 0 : Number(form.desgloseInicio[d.valor]);
                totalDesglose += d.valor * c;
            }
            totalDesglose = Math.round(totalDesglose * 100) / 100;
            if (totalDesglose > Number(form.montoInicial)) {
                errors.montoInicial = `El total de billetes y monedas ($${totalDesglose.toFixed(2)}) no puede superar el monto inicial ($${Number(form.montoInicial).toFixed(2)})`;
            }
        }

        return errors;
    };

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

            <ModalDetalleApertura
                apertura={aperturaDetalle}
                opened={Boolean(aperturaDetalle)}
                onClose={() => setAperturaDetalle(null)}
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
                validateForm={validateForm}
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
                            <Tooltip label="Ver fondo y desglose inicial" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    size="lg"
                                    color="apex"
                                    aria-label="Ver desglose inicial"
                                    onClick={() => setAperturaDetalle(apertura)}
                                >
                                    <IconCoins size={18} stroke={1.8} />
                                </ActionIcon>
                            </Tooltip>

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
