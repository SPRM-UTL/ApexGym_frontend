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

/**
 * Distribuye automáticamente un monto en denominaciones para representar el fondo inicial
 * cuando no se capturó un desglose individual en aperturas previas.
 */
function desglosarMonto(montoTotal) {
    let restante = Number(montoTotal) || 0;
    const resultado = {};
    for (const d of DENOMINACIONES) {
        if (restante >= d.valor) {
            const cant = Math.floor(restante / d.valor);
            resultado[d.valor] = cant;
            restante = Math.round((restante - cant * d.valor) * 100) / 100;
        } else {
            resultado[d.valor] = 0;
        }
    }
    return resultado;
}

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
    montoInicial: 0,
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
    // Conteo de billetes y monedas (idéntico al patrón de Corte de Caja)
    const [conteoInicio, setConteoInicio] = useState(() => {
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object') {
            return form.desgloseInicio;
        }
        const init = {};
        for (const d of DENOMINACIONES) init[d.valor] = '';
        return init;
    });

    useEffect(() => {
        if (form.desgloseInicio && typeof form.desgloseInicio === 'object') {
            setConteoInicio(form.desgloseInicio);
        } else if (!form.desgloseInicio) {
            const init = {};
            for (const d of DENOMINACIONES) init[d.valor] = '';
            setConteoInicio(init);
        }
    }, [form.desgloseInicio]);

    // Totales calculados en tiempo real
    const { totalFondo, totalBilletes, totalMonedas, totalPiezas } = useMemo(() => {
        let fondo = 0;
        let billetes = 0;
        let monedas = 0;
        let piezas = 0;

        for (const d of DENOMINACIONES) {
            const c = conteoInicio[d.valor] === '' ? 0 : Number(conteoInicio[d.valor]);
            const sub = d.valor * c;
            fondo += sub;
            piezas += c;
            if (d.tipo === 'billete') billetes += sub;
            else monedas += sub;
        }

        return {
            totalFondo: Math.round(fondo * 100) / 100,
            totalBilletes: Math.round(billetes * 100) / 100,
            totalMonedas: Math.round(monedas * 100) / 100,
            totalPiezas: piezas,
        };
    }, [conteoInicio]);

    const actualizarConteoInicio = (valor, cantidad) => {
        let cant = 0;
        if (cantidad !== '' && !isNaN(Number(cantidad))) {
            cant = Math.max(0, Math.min(1000, Math.floor(Number(cantidad))));
        }
        const valToStore = cantidad === '' ? '' : cant;
        const nuevoConteo = { ...conteoInicio, [valor]: valToStore };
        setConteoInicio(nuevoConteo);

        let total = 0;
        for (const d of DENOMINACIONES) {
            const c = nuevoConteo[d.valor] === '' ? 0 : Number(nuevoConteo[d.valor]);
            total += d.valor * c;
        }
        total = Math.round(total * 100) / 100;
        total = Math.min(total, 200000);

        onChange('montoInicial', total);
        onChange('desgloseInicio', nuevoConteo);
    };

    const limpiarConteo = () => {
        const init = {};
        for (const d of DENOMINACIONES) init[d.valor] = '';
        setConteoInicio(init);
        onChange('montoInicial', 0);
        onChange('desgloseInicio', null);
    };

    const nombreCajaSeleccionada = useMemo(() => {
        const opciones = fieldOptions?.cajaId ?? [];
        return opciones.find((o) => o.value === String(form.cajaId))?.label ?? '';
    }, [fieldOptions?.cajaId, form.cajaId]);

    const nombreEmpleadoSeleccionado = useMemo(() => {
        const opciones = fieldOptions?.empleadoId ?? [];
        return opciones.find((o) => o.value === String(form.empleadoId))?.label ?? '';
    }, [fieldOptions?.empleadoId, form.empleadoId]);

    return (
        <Stack gap="md">
            {/* ── Sección 1: Datos de la apertura ── */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCash size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Datos de la apertura</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
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
                        onChange={(e) => onChange('observaciones', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>

            {/* ── Sección 2: Conteo y Arqueo de Efectivo (Diseño exacto de Corte de Caja) ── */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" color="apex">
                        <IconCoins size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Conteo y Arqueo de Efectivo</Title>
                </div>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    {/* ── Columna 1: Captura de Billetes de Inicio del Día ── */}
                    <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fffdfa', borderColor: '#ffd8a8' }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <ThemeIcon size="sm" radius="md" variant="light" color="apex">
                                    <IconCash size={14} />
                                </ThemeIcon>
                                <Text fw={700} size="sm" c="#FF6A00">
                                    Billetes de inicio (Fondo del día)
                                </Text>
                            </Group>
                            <Badge color="apex" variant="filled">
                                Fondo: ${totalFondo.toFixed(2)}
                            </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mb="md">
                            Ingresa la cantidad física contada de cada denominación.
                        </Text>

                        <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Denominación</Table.Th>
                                    <Table.Th style={{ width: 100, textAlign: 'center' }}>Cantidad</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {DENOMINACIONES.map((d) => {
                                    const cantStr = conteoInicio[d.valor] ?? '';
                                    const cantNum = cantStr === '' ? 0 : Number(cantStr);
                                    const subtotal = d.valor * cantNum;

                                    return (
                                        <Table.Tr key={d.valor}>
                                            <Table.Td fw={600}>{d.label}</Table.Td>
                                            <Table.Td style={{ padding: 4 }}>
                                                <NumberInput
                                                    size="xs"
                                                    min={0}
                                                    max={1000}
                                                    clampBehavior="strict"
                                                    allowDecimal={false}
                                                    placeholder="0"
                                                    value={cantStr}
                                                    onChange={(v) => actualizarConteoInicio(d.valor, v)}
                                                    styles={{ input: { textAlign: 'center' } }}
                                                />
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                ${subtotal.toFixed(2)}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>

                        {/* Barra Total Fondo Inicial (exacta a Corte de Caja) */}
                        <Paper p="xs" radius="md" mt="md" withBorder style={{ backgroundColor: '#e8f4fd', borderColor: '#b6dbf9' }}>
                            <Group justify="space-between">
                                <Text fw={700} size="xs" c="blue">TOTAL FONDO INICIAL</Text>
                                <Text fw={800} size="sm" c="blue">${totalFondo.toFixed(2)}</Text>
                            </Group>
                        </Paper>
                    </Paper>

                    {/* ── Columna 2: Resumen y Desglose de Apertura ── */}
                    <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fdfdfe' }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                                    <IconCoins size={14} />
                                </ThemeIcon>
                                <Text fw={700} size="sm" c="dimmed">
                                    Resumen del Fondo
                                </Text>
                            </Group>
                            {totalFondo > 0 && (
                                <Button
                                    variant="subtle"
                                    color="gray"
                                    size="compact-xs"
                                    onClick={limpiarConteo}
                                >
                                    Limpiar conteo
                                </Button>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" mb="md">
                            Composición y balance físico del fondo inicial.
                        </Text>

                        <Stack gap="sm">
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                                <Group justify="space-between" mb="xs">
                                    <Text size="xs" c="dimmed">Total en Billetes:</Text>
                                    <Text size="sm" fw={700}>${totalBilletes.toFixed(2)}</Text>
                                </Group>
                                <Divider my="xs" />
                                <Group justify="space-between" mb="xs">
                                    <Text size="xs" c="dimmed">Total en Monedas:</Text>
                                    <Text size="sm" fw={700}>${totalMonedas.toFixed(2)}</Text>
                                </Group>
                                <Divider my="xs" />
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">Piezas físicas totales:</Text>
                                    <Text size="sm" fw={700}>{totalPiezas} piezas</Text>
                                </Group>
                            </Paper>

                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                                <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
                                    Datos de la Sesión
                                </Text>
                                <Group justify="space-between" mb={4}>
                                    <Text size="xs" c="dimmed">Caja asignada:</Text>
                                    <Text size="xs" fw={600}>{nombreCajaSeleccionada || '—'}</Text>
                                </Group>
                                <Group justify="space-between" mb={4}>
                                    <Text size="xs" c="dimmed">Cajero responsable:</Text>
                                    <Text size="xs" fw={600}>{nombreEmpleadoSeleccionado || '—'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">Fecha programada:</Text>
                                    <Text size="xs" fw={600}>{form.fechaApertura || obtenerFechaHoyLocal()}</Text>
                                </Group>
                            </Paper>

                            <Paper p="sm" radius="md" mt="auto" withBorder style={{ backgroundColor: '#e8f4fd', borderColor: '#b6dbf9' }}>
                                <Group justify="space-between" align="center">
                                    <div>
                                        <Text fw={700} size="xs" c="blue">TOTAL FONDO INICIAL</Text>
                                        <Text size="10px" c="dimmed">Monto con el que abrirá la caja</Text>
                                    </div>
                                    <Text fw={800} size="lg" c="blue">${totalFondo.toFixed(2)}</Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Paper>
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

/* ─── Modal para ver el desglose inicial de la caja (Idéntico a Corte de Caja) ─── */
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

    const fondoInicial = Number(apertura.montoInicial ?? 0);
    const esAbierta = apertura.estado === 'ABIERTA';

    // Totales calculados del desglose (con fallback automático para aperturas sin desglose previo)
    const desgloseFinal = useMemo(() => {
        if (desglose && typeof desglose === 'object' && Object.values(desglose).some((v) => Number(v) > 0)) {
            return desglose;
        }
        return desglosarMonto(fondoInicial);
    }, [desglose, fondoInicial]);

    let totalBilletes = 0;
    let totalMonedas = 0;
    let totalPiezas = 0;
    for (const d of DENOMINACIONES) {
        const cant = Number(desgloseFinal[d.valor] ?? 0);
        const sub = d.valor * cant;
        totalPiezas += cant;
        if (d.tipo === 'billete') totalBilletes += sub;
        else totalMonedas += sub;
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            fullScreen
            radius={0}
            zIndex={999999}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
            title={
                <Group gap="xs">
                    <ThemeIcon size="lg" radius="md" variant="outline" color="white" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff' }}>
                        <IconCash size={22} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} style={{ color: '#ffffff' }}>
                            Detalle de Apertura de Caja #{apertura.id} — {apertura.caja?.nombre ?? 'Caja'}
                        </Title>
                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Fondo inicial y desglose físico con el que aperturó la caja
                        </Text>
                    </div>
                </Group>
            }
        >
            <Box maw={1200} mx="auto" mt="xl" pt="md">
                <Stack gap="md">
                    {/* Info adicional idéntica a Corte de Caja */}
                    <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="xs">
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Caja Asignada</Text>
                                <Text fw={600} size="sm">{apertura.caja?.nombre ?? '—'}</Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Cajero Responsable</Text>
                                <Text fw={600} size="sm">
                                    {apertura.empleado ? `${apertura.empleado.nombre} ${apertura.empleado.apellidoPaterno}` : '—'}
                                </Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Fecha y Hora de Apertura</Text>
                                <Text fw={600} size="sm">
                                    {formatearFechaHora(apertura.fechaApertura)}
                                </Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Estado de la Sesión</Text>
                                <Badge color={esAbierta ? 'green' : 'red'} variant="light" size="sm">
                                    {apertura.estado ?? 'ABIERTA'}
                                </Badge>
                            </div>
                        </SimpleGrid>
                    </Paper>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                        {/* ── Columna 1: Card de Billetes de Inicio del Día (Exactamente idéntica a Corte de Caja) ── */}
                        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fdfdfe' }}>
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs">
                                    <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                                        <IconCash size={14} />
                                    </ThemeIcon>
                                    <Text fw={700} size="sm" c="dimmed">
                                        Billetes de inicio (Fondo del día)
                                    </Text>
                                </Group>
                                <Badge color="blue" variant="light">
                                    Fondo: ${fondoInicial.toFixed(2)}
                                </Badge>
                            </Group>
                            <Text size="xs" c="dimmed" mb="md">
                                Desglose con el que se aperturó la caja física.
                            </Text>

                            <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Denominación</Table.Th>
                                        <Table.Th style={{ textAlign: 'center', width: 100 }}>Cantidad</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {DENOMINACIONES.map((d) => {
                                        const cant = Number(desgloseFinal[d.valor] ?? 0);
                                        return (
                                            <Table.Tr key={d.valor}>
                                                <Table.Td fw={600}>{d.label}</Table.Td>
                                                <Table.Td style={{ textAlign: 'center' }}>{cant}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>
                                                    ${(d.valor * cant).toFixed(2)}
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>

                            <Paper p="xs" radius="md" mt="md" withBorder style={{ backgroundColor: '#e8f4fd', borderColor: '#b6dbf9' }}>
                                <Group justify="space-between">
                                    <Text fw={700} size="xs" c="blue">TOTAL FONDO INICIAL</Text>
                                    <Text fw={800} size="sm" c="blue">${fondoInicial.toFixed(2)}</Text>
                                </Group>
                            </Paper>
                        </Paper>

                        {/* ── Columna 2: Resumen del Fondo ── */}
                        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fdfdfe' }}>
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs">
                                    <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                                        <IconCoins size={14} />
                                    </ThemeIcon>
                                    <Text fw={700} size="sm" c="dimmed">
                                        Resumen del Fondo
                                    </Text>
                                </Group>
                            </Group>
                            <Text size="xs" c="dimmed" mb="md">
                                Composición y balance físico del fondo inicial.
                            </Text>

                            <Stack gap="sm">
                                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                                    <Group justify="space-between" mb="xs">
                                        <Text size="xs" c="dimmed">Total en Billetes:</Text>
                                        <Text size="sm" fw={700}>${totalBilletes.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my="xs" />
                                    <Group justify="space-between" mb="xs">
                                        <Text size="xs" c="dimmed">Total en Monedas:</Text>
                                        <Text size="sm" fw={700}>${totalMonedas.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my="xs" />
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Piezas físicas totales:</Text>
                                        <Text size="sm" fw={700}>{totalPiezas} piezas</Text>
                                    </Group>
                                </Paper>

                                {apertura.observaciones && (
                                    <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                                        <Text size="xs" c="dimmed" fw={600} mb={4}>Observaciones registradas:</Text>
                                        <Text size="sm">{apertura.observaciones}</Text>
                                    </Paper>
                                )}

                                <Paper p="sm" radius="md" mt="auto" withBorder style={{ backgroundColor: '#e8f4fd', borderColor: '#b6dbf9' }}>
                                    <Group justify="space-between" align="center">
                                        <div>
                                            <Text fw={700} size="xs" c="blue">TOTAL FONDO INICIAL</Text>
                                            <Text size="10px" c="dimmed">Fondo físico con el que abrió la caja</Text>
                                        </div>
                                        <Text fw={800} size="lg" c="blue">${fondoInicial.toFixed(2)}</Text>
                                    </Group>
                                </Paper>
                            </Stack>
                        </Paper>
                    </SimpleGrid>

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose} size="md" radius="md">
                            Cerrar
                        </Button>
                    </Group>
                </Stack>
            </Box>
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
            montoInicial:   record.montoInicial ?? 0,
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
            montoInicial:   Number(form.montoInicial || 0),
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
        if (form.montoInicial === undefined || form.montoInicial === null || Number(form.montoInicial) < 0) {
            errors.montoInicial = 'El monto inicial debe ser mayor o igual a 0';
        }
        if (Number(form.montoInicial) > 200000) {
            errors.montoInicial = 'El monto inicial no puede exceder $200,000.00';
        }
        if (!form.fechaApertura) errors.fechaApertura = 'La fecha de apertura es requerida';
        if (form.observaciones?.trim().length > 500) {
            errors.observaciones = 'Las observaciones no pueden exceder 500 caracteres';
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
                    // - Si está cerrada: no puede eliminarse.
                    // - Si está abierta: solo puede cancelarse.
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
                                    color="blue"
                                    aria-label="Ver desglose inicial"
                                    onClick={() => setAperturaDetalle(apertura)}
                                >
                                    <IconEye size={18} stroke={1.8} />
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
