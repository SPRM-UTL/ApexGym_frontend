/**
 * Sistema: ApexGym Frontend
 * Modulo: Apertura de Caja
 *
 * Módulo rediseñado con Drawer moderno de creación y detalle según especificación visual.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Drawer,
    Group,
    NativeSelect,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconCalendar,
    IconCash,
    IconCoins,
    IconEdit,
    IconEye,
    IconFileText,
    IconRefresh,
    IconTrash,
    IconUser,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
import { obtenerUsuarioActual } from '../../scripts/constantes.js';
import { DENOMINACIONES, desglosarMonto, formatearFechaHora } from '../../scripts/cajaUtils.js';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';

/* ─── Obtener fecha y hora local en formato YYYY-MM-DDTHH:mm ───────────────── */
const obtenerFechaHoraActualLocal = () => {
    const d = new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const horas = String(d.getHours()).padStart(2, '0');
    const minutos = String(d.getMinutes()).padStart(2, '0');
    return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
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
    { key: 'fechaApertura', label: 'Fecha y Hora de Apertura', required: true },
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
    fechaApertura: '',
    desgloseInicio: null,
    observaciones: '',
};

/* ─── Formulario de Apertura (Drawer con Cards) ────────────────────────────── */
function AperturaForm({ form, errors, onChange, fieldOptions }) {
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
    const { totalFondo, totalBilletes, totalMonedas } = useMemo(() => {
        let fondo = 0;
        let billetes = 0;
        let monedas = 0;

        for (const d of DENOMINACIONES) {
            const raw = conteoInicio[d.valor];
            const c = (raw === '' || raw === null || raw === undefined) ? 0 : Number(raw) || 0;
            const sub = d.valor * c;
            fondo += sub;
            if (d.tipo === 'billete') billetes += sub;
            else monedas += sub;
        }

        return {
            totalFondo: Math.round(fondo * 100) / 100,
            totalBilletes: Math.round(billetes * 100) / 100,
            totalMonedas: Math.round(monedas * 100) / 100,
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
            const raw = nuevoConteo[d.valor];
            const c = (raw === '' || raw === null || raw === undefined) ? 0 : Number(raw) || 0;
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

    return (
        <Stack gap="md">
            {/* ── Card 1: Datos de la apertura ── */}
            <SectionCard
                icon={<IconFileText size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Datos de la apertura"
                subtitle="Selecciona la caja, el empleado responsable y la fecha de apertura."
                collapsible={false}
            >
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
                        label="Fecha y Hora de Apertura"
                        withAsterisk
                        type="datetime-local"
                        value={form.fechaApertura || obtenerFechaHoraActualLocal()}
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
            </SectionCard>

            {/* ── Card 2: Conteo y Arqueo de Efectivo ── */}
            <SectionCard
                icon={<IconCash size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Conteo y Arqueo de Efectivo"
                subtitle="Desglose por denominación de billetes y monedas del fondo inicial"
                collapsible={true}
                defaultOpen={true}
            >
                <Stack gap="sm">
                    <Table withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr style={{ backgroundColor: '#F8FAFC' }}>
                                <Table.Th>Denominación</Table.Th>
                                <Table.Th style={{ width: 120, textAlign: 'center' }}>Cantidad</Table.Th>
                                <Table.Th style={{ textAlign: 'right', width: 140 }}>Subtotal</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {DENOMINACIONES.map((d) => {
                                const cantStr = conteoInicio[d.valor] ?? '';
                                const cantNum = cantStr === '' ? 0 : Number(cantStr);
                                const subtotal = d.valor * cantNum;

                                return (
                                    <Table.Tr key={d.valor}>
                                        <Table.Td fw={600} style={{ color: '#1E293B' }}>{d.label}</Table.Td>
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
                                                styles={{ input: { textAlign: 'center', fontWeight: 600 } }}
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

                    <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#FFF4EC', borderColor: '#FFD8A8' }}>
                        <Group justify="space-between" align="center">
                            <Text fw={700} size="xs" c="#FF6A00">TOTAL FONDO INICIAL (FÍSICO):</Text>
                            <Text fw={800} size="md" c="#FF6A00">${totalFondo.toFixed(2)}</Text>
                        </Group>
                    </Paper>
                </Stack>
            </SectionCard>

            {/* ── Card 3: Resumen del Fondo Inicial ── */}
            <SectionCard
                icon={<IconCoins size={22} stroke={1.8} />}
                iconBg="#E7F5FF"
                iconColor="#1C7ED6"
                title="Resumen del Fondo Inicial"
                subtitle="Composición del fondo físico de apertura"
                rightAmount={`$${totalFondo.toFixed(2)}`}
                rightAmountColor="#1C7ED6"
                collapsible={true}
                defaultOpen={true}
            >
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Total en Billetes:</Text>
                        <Text fw={700} size="xs">${totalBilletes.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Total en Monedas:</Text>
                        <Text fw={700} size="xs">${totalMonedas.toFixed(2)}</Text>
                    </Group>
                    {totalFondo > 0 && (
                        <Group justify="flex-end" mt="xs">
                            <Button
                                variant="light"
                                color="red"
                                size="xs"
                                radius="md"
                                leftSection={<IconRefresh size={14} />}
                                onClick={limpiarConteo}
                            >
                                Limpiar conteo
                            </Button>
                        </Group>
                    )}
                </Stack>
            </SectionCard>

            {/* Banner de errores si los hay */}
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
                            .filter(([, msg]) => Boolean(msg))
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

/* ─── Drawer para Detalle de la Apertura de Caja ───────────────────────────── */
function DrawerDetalleApertura({ apertura, opened, onClose }) {
    const fondoInicial = Number(apertura?.montoInicial ?? 0);
    const esAbierta = apertura?.estado === 'ABIERTA';

    const desglose = useMemo(() => {
        if (!apertura?.desgloseInicio) return null;
        try {
            return typeof apertura.desgloseInicio === 'string'
                ? JSON.parse(apertura.desgloseInicio)
                : apertura.desgloseInicio;
        } catch {
            return null;
        }
    }, [apertura?.desgloseInicio]);

    // Fallback automático para aperturas previas
    const desgloseFinal = useMemo(() => {
        if (desglose && typeof desglose === 'object' && Object.values(desglose).some((v) => Number(v) > 0)) {
            return desglose;
        }
        return desglosarMonto(fondoInicial);
    }, [desglose, fondoInicial]);

    if (!apertura) return null;

    let totalBilletes = 0;
    let totalMonedas = 0;
    for (const d of DENOMINACIONES) {
        const cant = Number(desgloseFinal[d.valor] ?? 0);
        const sub = d.valor * cant;
        if (d.tipo === 'billete') totalBilletes += sub;
        else totalMonedas += sub;
    }

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size={740}
            zIndex={999999}
            title={
                <Group gap="sm">
                    <ThemeIcon size={38} radius="md" variant="light" color="orange" style={{ backgroundColor: '#FFF4EC', color: '#FF6A00' }}>
                        <IconCash size={22} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} fw={700} c="#1E293B">Detalle de Apertura de Caja #{apertura.id}</Title>
                        <Text size="xs" c="dimmed">Fondo inicial y desglose físico de apertura</Text>
                    </div>
                </Group>
            }
            styles={{
                header: { borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 0 },
                body: { display: 'flex', flexDirection: 'column', padding: '16px 20px', minHeight: 'calc(100vh - 80px)' },
            }}
        >
            <div style={{ flex: 1, paddingBottom: 16 }}>
                {/* Header chips */}
                <Group gap="xs" wrap="wrap" mb="md">
                    <Badge variant="light" color="gray" leftSection={<IconCalendar size={13} />} size="md" radius="sm">
                        Fecha: {formatearFechaHora(apertura.fechaApertura)}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconUser size={13} />} size="md" radius="sm">
                        Empleado: {apertura.empleado ? `${apertura.empleado.nombre} ${apertura.empleado.apellidoPaterno}` : '—'}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconCash size={13} />} size="md" radius="sm">
                        Caja: {apertura.caja?.nombre ?? 'Caja'}
                    </Badge>
                    <Badge color={esAbierta ? 'green' : 'gray'} variant="light" size="md" radius="sm">
                        {apertura.estado ?? 'ABIERTA'}
                    </Badge>
                </Group>

                {/* Tabs de navegación */}
                <Tabs defaultValue="resumen" color="orange">
                    <Tabs.List mb="md">
                        <Tabs.Tab value="resumen">Resumen</Tabs.Tab>
                        <Tabs.Tab value="billetes">Billetes y Monedas</Tabs.Tab>
                    </Tabs.List>

                    {/* ── Tab: Resumen ── */}
                    <Tabs.Panel value="resumen">
                        <Stack gap="md">
                            {/* Card 1: Fondo Inicial */}
                            <SectionCard
                                icon={<IconCoins size={22} stroke={1.8} />}
                                iconBg="#E7F5FF"
                                iconColor="#1C7ED6"
                                title="Fondo inicial"
                                subtitle="Monto asignado al inicio del turno"
                                rightAmount={`$${fondoInicial.toFixed(2)}`}
                                rightAmountColor="#1C7ED6"
                                collapsible={false}
                            />

                            {/* Card 2: Conteo final de efectivo */}
                            <SectionCard
                                icon={<IconCash size={22} stroke={1.8} />}
                                iconBg="#EBFBEE"
                                iconColor="#2B8A3E"
                                title="Conteo de efectivo inicial"
                                subtitle="Desglose físico registrado en la apertura"
                                rightAmount={`$${fondoInicial.toFixed(2)}`}
                                rightAmountColor="#2B8A3E"
                                collapsible={true}
                                defaultOpen={true}
                            >
                                <Table withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                                    <Table.Thead>
                                        <Table.Tr style={{ backgroundColor: '#F8FAFC' }}>
                                            <Table.Th>Denominación</Table.Th>
                                            <Table.Th style={{ textAlign: 'center', width: 100 }}>Cantidad</Table.Th>
                                            <Table.Th style={{ textAlign: 'right', width: 120 }}>Subtotal</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {DENOMINACIONES.map((d) => {
                                            const cant = Number(desgloseFinal[d.valor] ?? 0);
                                            if (cant === 0) return null;
                                            return (
                                                <Table.Tr key={d.valor}>
                                                    <Table.Td fw={600}>{d.label}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>{cant}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        ${(d.valor * cant).toFixed(2)}
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </SectionCard>

                            {/* Observaciones */}
                            {apertura.observaciones && (
                                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC' }}>
                                    <Text size="xs" c="dimmed" fw={600} mb={2}>Observaciones registradas:</Text>
                                    <Text size="sm">{apertura.observaciones}</Text>
                                </Paper>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    {/* ── Tab: Billetes y Monedas ── */}
                    <Tabs.Panel value="billetes">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {/* Billetes */}
                            <Paper p="sm" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700} size="xs" c="blue" tt="uppercase">Billetes</Text>
                                    <Badge color="blue" variant="light" size="xs">${totalBilletes.toFixed(2)}</Badge>
                                </Group>
                                <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Denom.</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>Cant.</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {DENOMINACIONES.filter((d) => d.tipo === 'billete').map((d) => {
                                            const cant = Number(desgloseFinal[d.valor] ?? 0);
                                            return (
                                                <Table.Tr key={d.valor}>
                                                    <Table.Td fw={600}>{d.label}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>{cant}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>${(d.valor * cant).toFixed(2)}</Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </Paper>

                            {/* Monedas */}
                            <Paper p="sm" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700} size="xs" c="#FF6A00" tt="uppercase">Monedas</Text>
                                    <Badge color="orange" variant="light" size="xs">${totalMonedas.toFixed(2)}</Badge>
                                </Group>
                                <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Denom.</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>Cant.</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {DENOMINACIONES.filter((d) => d.tipo === 'moneda').map((d) => {
                                            const cant = Number(desgloseFinal[d.valor] ?? 0);
                                            return (
                                                <Table.Tr key={d.valor}>
                                                    <Table.Td fw={600}>{d.label}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>{cant}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>${(d.valor * cant).toFixed(2)}</Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </Paper>
                        </SimpleGrid>
                    </Tabs.Panel>
                </Tabs>
            </div>

            {/* Footer sticky del Drawer */}
            <Group
                justify="flex-start"
                pt="md"
                style={{
                    borderTop: '1px solid #E2E8F0',
                    backgroundColor: 'var(--ag-color-surface, #ffffff)',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                }}
            >
                <Button
                    variant="default"
                    radius="md"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={onClose}
                >
                    Volver
                </Button>
            </Group>
        </Drawer>
    );
}

/* ─── Componente Principal ──────────────────────────────────────────────────── */
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
        let fechaForm = obtenerFechaHoraActualLocal();
        if (record.fechaApertura) {
            const d = new Date(record.fechaApertura);
            if (!isNaN(d.getTime())) {
                const anio = d.getFullYear();
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const dia = String(d.getDate()).padStart(2, '0');
                const horas = String(d.getHours()).padStart(2, '0');
                const minutos = String(d.getMinutes()).padStart(2, '0');
                fechaForm = `${anio}-${mes}-${dia}T${horas}:${minutos}`;
            }
        }

        let desglose = null;
        try {
            if (record.desgloseInicio) {
                desglose = typeof record.desgloseInicio === 'string'
                    ? JSON.parse(record.desgloseInicio)
                    : record.desgloseInicio;
            }
        } catch {
            desglose = null;
        }

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

        let fechaEnvio;
        if (form.fechaApertura) {
            const d = new Date(form.fechaApertura);
            fechaEnvio = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
        } else {
            fechaEnvio = new Date().toISOString();
        }

        return {
            cajaId:         Number(form.cajaId),
            empleadoId:     Number(form.empleadoId),
            montoInicial:   Number(form.montoInicial || 0),
            fechaApertura:  fechaEnvio,
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

            <DrawerDetalleApertura
                apertura={aperturaDetalle}
                opened={Boolean(aperturaDetalle)}
                onClose={() => setAperturaDetalle(null)}
            />

            <CrudCatalogo
                titulo="Apertura de Caja"
                singular="Apertura"
                icon={IconCash}
                headerVariant="unified"
                tableHeaderVariant="neutral"
                formMode="drawer"
                drawerSize={740}
                servicio={api.aperturaCaja}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={{ ...INICIAL, fechaApertura: obtenerFechaHoraActualLocal() }}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderForm={(props) => <AperturaForm {...props} />}
                validateForm={validateForm}
                pageSizeOptions={[6, 12, 18, 24]}
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

                    const puedeEditar = esAbierta && esAdminOSupervisor;
                    const tooltipEdicion = esCerrada
                        ? 'No se puede editar una apertura que ya ha sido cerrada'
                        : (!esAdminOSupervisor
                            ? 'Una apertura abierta no puede modificarse salvo que cuente con permisos de supervisor o administrador'
                            : 'Editar apertura de caja');

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
