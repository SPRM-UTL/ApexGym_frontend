/**
 * Sistema: ApexGym Frontend
 * Issue: [CAJA-05] Frontend: Validaciones, arqueo fisico y modales en pantalla de Corte de Caja #90
 * Parent: Control Operativo de Caja, Auditoria Contable y Reporte de Corte en PDF #85
 *
 * Módulo rediseñado con Drawer moderno de creación y detalle según especificación visual.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    ActionIcon,
    Alert,
    Badge,
    Button,
    Divider,
    Drawer,
    Group,
    Menu,
    Modal,
    NativeSelect,
    NumberInput,
    Paper,
    Progress,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    Textarea,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconArrowsExchange,
    IconCalculator,
    IconCalendar,
    IconCash,
    IconCheck,
    IconCoins,
    IconCopy,
    IconCreditCard,
    IconDeviceMobile,
    IconEye,
    IconFileCheck,
    IconFileDownload,
    IconFileText,
    IconReceiptOff,
    IconReportAnalytics,
    IconScale,
    IconShieldCheck,
    IconUser,
    IconWallet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { generarPdfCorte } from '../../scripts/generarPdfCorte.js';
import { DENOMINACIONES, desglosarMonto } from '../../scripts/cajaUtils.js';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';
import classes from './CorteCaja.module.css';

/* ─── Campos (para validación y payload) ────────────────────────────────────── */
const CAMPOS = [
    {
        key: 'aperturaCajaId',
        label: 'Apertura de Caja',
        required: true,
        loadOptions: async () => {
            const r = await api.aperturaCaja.obtenerTodos();
            return (r.data ?? [])
                .filter((a) => a.estado === 'ABIERTA')
                .map((a) => ({
                    value: String(a.id),
                    label: `${a.caja?.nombre ?? 'Caja'} — Fondo: $${Number(a.montoInicial).toFixed(2)}`,
                }));
        },
    },
    {
        key: 'empleadoId',
        label: 'Empleado',
        required: true,
        loadOptions: async () => {
            const r = await api.empleado.obtenerTodos();
            return (r.data ?? []).map((e) => ({
                value: String(e.id),
                label: `${e.nombre} ${e.apellidoPaterno}`,
            }));
        },
    },
    { key: 'efectivoContado', label: 'Efectivo Contado', required: true, type: 'number', min: 0, max: 200000 },
    { key: 'observaciones',   label: 'Observaciones', maxLength: 500 },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'numero',          label: '#',                sortable: true, filterable: true },
    { key: 'apertura',        label: 'Caja',             sortable: true, filterable: true },
    { key: 'empleado',        label: 'Cajero / Empleado', sortable: true, filterable: true },
    { key: 'fechaCorte',      label: 'Fecha Corte',       sortable: true, filterable: true },
    { key: 'fondoInicial',    label: 'Fondo Inicial',     sortable: true, filterable: true },
    { key: 'entradas',        label: 'Entradas',          sortable: true, filterable: true },
    { key: 'salidas',         label: 'Salidas',           sortable: true, filterable: true },
    { key: 'efectivoContado', label: 'Efectivo Contado',  sortable: true, filterable: true },
    { key: 'diferencia',      label: 'Diferencia',        sortable: true, filterable: true },
    { key: 'estado',          label: 'Estado Auditoría',  sortable: true, filterable: true },
];

const INICIAL = {
    aperturaCajaId: '',
    empleadoId: '',
    efectivoContado: 0,
    observaciones: '',
};

/* ─── Modal Auxiliar: Detalle de Ventas y Movimientos del Turno ────────────── */
function ModalDetalleVentas({ opened, onClose, resumenApertura }) {
    const totales = resumenApertura?.totales;
    const totalVentas = totales ? Number(totales.totalVentas ?? 0) : 0;
    const transacciones = totales ? Number(totales.transaccionesVentas ?? 0) : 0;
    const ticketPromedio = totales ? Number(totales.ticketPromedio ?? 0) : 0;
    const metodos = totales?.ventasPorMetodoPago ?? [];

    const movimientos = resumenApertura?.movimientos ?? [];
    const entradas = movimientos.filter((m) => m.tipo === 'ENTRADA');
    const salidas = movimientos.filter((m) => m.tipo === 'SALIDA');
    const totalEntradas = Number(resumenApertura?.totalEntradas ?? 0);
    const totalSalidas = Number(resumenApertura?.totalSalidas ?? 0);
    const balanceMovimientos = totalEntradas - totalSalidas;

    const getMetodoIcon = (nombre = '') => {
        const n = nombre.toLowerCase();
        if (n.includes('efectivo')) return { icon: <IconCash size={16} />, color: 'green' };
        if (n.includes('deb') || n.includes('déb')) return { icon: <IconCreditCard size={16} />, color: 'blue' };
        if (n.includes('cred') || n.includes('créd')) return { icon: <IconCreditCard size={16} />, color: 'indigo' };
        if (n.includes('transf') || n.includes('spei')) return { icon: <IconDeviceMobile size={16} />, color: 'cyan' };
        return { icon: <IconWallet size={16} />, color: 'gray' };
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size={740}
            radius="lg"
            zIndex={1000000}
            title={
                <Group gap="sm">
                    <ThemeIcon size={38} radius="md" variant="light" color="orange" style={{ backgroundColor: '#FFF4EC', color: '#FF6A00' }}>
                        <IconReportAnalytics size={22} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} fw={700} c="#1E293B">Detalle de Ventas y Movimientos</Title>
                        <Text size="xs" c="dimmed">Auditoría del turno en curso y flujo de efectivo</Text>
                    </div>
                </Group>
            }
            styles={{
                header: {
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '16px 20px',
                },
                title: {
                    color: '#1E293B',
                },
                close: {
                    color: '#64748B',
                    '&:hover': {
                        backgroundColor: '#F1F5F9',
                    },
                },
                body: {
                    padding: '20px',
                    backgroundColor: 'var(--ag-color-surface, #ffffff)',
                },
            }}
        >
            <Stack gap="md">
                {/* ─── Card 1: Ventas del Turno ─── */}
                <SectionCard
                    icon={<IconReportAnalytics size={22} stroke={1.8} />}
                    iconBg="#FFF4EC"
                    iconColor="#FF6A00"
                    title="Ventas del Turno"
                    subtitle="Métricas de ventas y cobros procesados en este turno"
                    rightAmount={`$${totalVentas.toFixed(2)}`}
                    rightAmountColor="#FF6A00"
                    collapsible={true}
                    defaultOpen={true}
                >
                    <Stack gap="sm">
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#FFF4EC', borderColor: '#FFD8A8' }}>
                                <Text size="xs" c="#FF6A00" fw={700} tt="uppercase">Total Ventas</Text>
                                <Text fw={800} size="xl" c="#FF6A00">$${totalVentas.toFixed(2)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Transacciones</Text>
                                <Text fw={800} size="xl" c="#1E293B">{transacciones}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Ticket Promedio</Text>
                                <Text fw={800} size="xl" c="#1E293B">$${ticketPromedio.toFixed(2)}</Text>
                            </Paper>
                        </SimpleGrid>

                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mt="xs">
                            Ventas por Método de Pago
                        </Text>
                        {metodos.length > 0 ? (
                            <Stack gap="xs">
                                {metodos.map((m) => {
                                    const { icon, color } = getMetodoIcon(m.nombre);
                                    const totalNum = Number(m.total ?? 0);
                                    const pct = totalVentas > 0 ? ((totalNum / totalVentas) * 100).toFixed(1) : '0.0';

                                    return (
                                        <Paper key={m.metodoPagoId ?? m.nombre} p="xs" radius="md" withBorder style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                                            <Group justify="space-between" mb={4}>
                                                <Group gap="xs">
                                                    <ThemeIcon color={color} variant="light" radius="md" size="sm">
                                                        {icon}
                                                    </ThemeIcon>
                                                    <Text fw={600} size="xs" c="#1E293B">{m.nombre}</Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Badge color={color} variant="light" size="xs">{m.transacciones} ops</Badge>
                                                    <Text fw={700} size="xs">$${totalNum.toFixed(2)} ({pct}%)</Text>
                                                </Group>
                                            </Group>
                                            <Progress value={Number(pct)} color={color} size="xs" radius="xl" />
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        ) : (
                            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', textAlign: 'center' }}>
                                <ThemeIcon size={36} radius="xl" variant="light" color="gray" mx="auto" mb="xs">
                                    <IconReceiptOff size={18} />
                                </ThemeIcon>
                                <Text size="xs" fw={600} c="#475569">Sin ventas registradas</Text>
                                <Text size="xs" c="dimmed">No se han registrado ventas ni transacciones en esta apertura.</Text>
                            </Paper>
                        )}
                    </Stack>
                </SectionCard>

                {/* ─── Card 2: Movimientos Manuales del Turno ─── */}
                <SectionCard
                    icon={<IconArrowsExchange size={22} stroke={1.8} />}
                    iconBg="#FFF4EC"
                    iconColor="#FF6A00"
                    title="Movimientos Manuales del Turno"
                    subtitle="Entradas y salidas manuales de efectivo registradas"
                    rightAmount={`${balanceMovimientos >= 0 ? '+' : ''}$${balanceMovimientos.toFixed(2)}`}
                    rightAmountColor={balanceMovimientos >= 0 ? '#2B8A3E' : '#E03131'}
                    collapsible={true}
                    defaultOpen={true}
                >
                    <Stack gap="sm">
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#EBFBEE', borderColor: '#B7EBD0' }}>
                                <Text size="xs" c="#2B8A3E" fw={700} tt="uppercase">Total Entradas (+)</Text>
                                <Text fw={800} size="md" c="#2B8A3E">+$${totalEntradas.toFixed(2)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#FFF5F5', borderColor: '#FAD1CE' }}>
                                <Text size="xs" c="#E03131" fw={700} tt="uppercase">Total Salidas (-)</Text>
                                <Text fw={800} size="md" c="#E03131">-$${totalSalidas.toFixed(2)}</Text>
                            </Paper>
                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Balance Neto</Text>
                                <Text fw={800} size="md" c={balanceMovimientos >= 0 ? '#2B8A3E' : '#E03131'}>
                                    {balanceMovimientos >= 0 ? '+' : ''}$${balanceMovimientos.toFixed(2)}
                                </Text>
                            </Paper>
                        </SimpleGrid>

                        <Accordion variant="separated" radius="md" defaultValue={['entradas', 'salidas']} multiple>
                            <Accordion.Item value="entradas" style={{ borderColor: '#E2E8F0' }}>
                                <Accordion.Control icon={<ThemeIcon color="green" variant="light" radius="md" size="sm"><IconCash size={14} /></ThemeIcon>}>
                                    <Group justify="space-between" w="100%" pr="sm">
                                        <Text fw={600} size="xs" c="#1E293B">Ingresos de Efectivo (+)</Text>
                                        <Badge color="green" variant="light" size="xs">+$${totalEntradas.toFixed(2)}</Badge>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {entradas.length > 0 ? (
                                        <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                                            <Table.Thead>
                                                <Table.Tr style={{ backgroundColor: '#F8FAFC' }}>
                                                    <Table.Th style={{ width: 60 }}>#</Table.Th>
                                                    <Table.Th>Concepto</Table.Th>
                                                    <Table.Th style={{ textAlign: 'right', width: 120 }}>Monto</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {entradas.map((m) => (
                                                    <Table.Tr key={m.id}>
                                                        <Table.Td fw={600}>#{m.id}</Table.Td>
                                                        <Table.Td>{m.concepto}</Table.Td>
                                                        <Table.Td style={{ textAlign: 'right' }}>
                                                            <Text fw={700} size="xs" c="green">+$${Number(m.monto).toFixed(2)}</Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    ) : (
                                        <Text size="xs" c="dimmed" ta="center" py="xs">Sin entradas registradas.</Text>
                                    )}
                                </Accordion.Panel>
                            </Accordion.Item>

                            <Accordion.Item value="salidas" style={{ borderColor: '#E2E8F0' }}>
                                <Accordion.Control icon={<ThemeIcon color="red" variant="light" radius="md" size="sm"><IconArrowsExchange size={14} /></ThemeIcon>}>
                                    <Group justify="space-between" w="100%" pr="sm">
                                        <Text fw={600} size="xs" c="#1E293B">Egresos de Efectivo (-)</Text>
                                        <Badge color="red" variant="light" size="xs">-$${totalSalidas.toFixed(2)}</Badge>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    {salidas.length > 0 ? (
                                        <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                                            <Table.Thead>
                                                <Table.Tr style={{ backgroundColor: '#F8FAFC' }}>
                                                    <Table.Th style={{ width: 60 }}>#</Table.Th>
                                                    <Table.Th>Concepto</Table.Th>
                                                    <Table.Th style={{ textAlign: 'right', width: 120 }}>Monto</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {salidas.map((m) => (
                                                    <Table.Tr key={m.id}>
                                                        <Table.Td fw={600}>#{m.id}</Table.Td>
                                                        <Table.Td>{m.concepto}</Table.Td>
                                                        <Table.Td style={{ textAlign: 'right' }}>
                                                            <Text fw={700} size="xs" c="red">-$${Number(m.monto).toFixed(2)}</Text>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    ) : (
                                        <Text size="xs" c="dimmed" ta="center" py="xs">Sin salidas registradas.</Text>
                                    )}
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                </SectionCard>

                {/* Footer inferior */}
                <Group
                    justify="flex-end"
                    pt="md"
                    style={{
                        borderTop: '1px solid #E2E8F0',
                        marginTop: 4,
                    }}
                >
                    <Button
                        variant="default"
                        radius="md"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={onClose}
                    >
                        Volver al corte
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

/* ─── Formulario de Arqueo (Drawer de Creación con Cards) ──────────────────── */
function CorteForm({ form, errors, onChange, fieldOptions }) {
    const [modalVentasAbierto, setModalVentasAbierto] = useState(false);
    const [resumenApertura, setResumenApertura] = useState(null);

    // Estado local para conteo de billetes de cierre
    const [conteoCierre, setConteoCierre] = useState(() => {
        if (form.desgloseFin && typeof form.desgloseFin === 'object') {
            return form.desgloseFin;
        }
        const init = {};
        for (const d of DENOMINACIONES) init[d.valor] = '';
        return init;
    });

    // Cargar datos de la apertura cuando cambia
    useEffect(() => {
        if (!form.aperturaCajaId) {
            setResumenApertura(null);
            return;
        }

        api.movimientoCaja
            .obtenerResumenApertura(form.aperturaCajaId)
            .then((r) => {
                if (r.responseFlag === 0) setResumenApertura(r.data);
            })
            .catch(() => setResumenApertura(null));
    }, [form.aperturaCajaId]);

    // Desglose de inicio del turno
    const desgloseInicio = useMemo(() => {
        if (resumenApertura?.apertura?.desgloseInicio) {
            try {
                const parsed = typeof resumenApertura.apertura.desgloseInicio === 'string'
                    ? JSON.parse(resumenApertura.apertura.desgloseInicio)
                    : resumenApertura.apertura.desgloseInicio;
                if (parsed && typeof parsed === 'object') return parsed;
            } catch {
                // Continuar con fallback
            }
        }
        const monto = resumenApertura
            ? Number(resumenApertura.montoInicial ?? resumenApertura.apertura?.montoInicial ?? 0)
            : 0;
        return desglosarMonto(monto);
    }, [resumenApertura]);

    useEffect(() => {
        if (desgloseInicio) {
            onChange('desgloseInicio', desgloseInicio);
        }
    }, [desgloseInicio, onChange]);

    // Actualizar conteo de denominación y recalcular total
    const actualizarConteoCierre = (valor, cantidad) => {
        let cant = 0;
        if (cantidad !== '' && !isNaN(Number(cantidad))) {
            cant = Math.max(0, Math.min(1000, Math.floor(Number(cantidad))));
        }
        const valToStore = cantidad === '' ? '' : cant;
        const nuevoConteo = { ...conteoCierre, [valor]: valToStore };
        setConteoCierre(nuevoConteo);

        let total = 0;
        for (const d of DENOMINACIONES) {
            const raw = nuevoConteo[d.valor];
            const c = (raw === '' || raw === null || raw === undefined) ? 0 : Number(raw) || 0;
            total += d.valor * c;
        }
        total = Math.round(total * 100) / 100;
        total = Math.min(total, 200000);
        onChange('efectivoContado', total);
        onChange('desgloseFin', nuevoConteo);
        onChange('desgloseInicio', desgloseInicio);
    };

    const fondoInicial = resumenApertura
        ? Number(resumenApertura.montoInicial ?? resumenApertura.apertura?.montoInicial ?? 0)
        : 0;
    const totalEntradas = resumenApertura ? Number(resumenApertura.totalEntradas ?? 0) : 0;
    const totalSalidas = resumenApertura ? Number(resumenApertura.totalSalidas ?? 0) : 0;
    const totalVentasEfectivo = resumenApertura ? Number(resumenApertura.totalVentasEfectivo ?? 0) : 0;
    const efectivoEsperado = resumenApertura?.saldoDisponible !== undefined
        ? Number(resumenApertura.saldoDisponible)
        : (fondoInicial + totalEntradas - totalSalidas + totalVentasEfectivo);
    const efectivoContado = Number(form.efectivoContado || 0);
    const diferencia = efectivoContado - efectivoEsperado;

    return (
        <Stack gap="md">
            <ModalDetalleVentas
                opened={modalVentasAbierto}
                onClose={() => setModalVentasAbierto(false)}
                resumenApertura={resumenApertura}
            />

            {/* Alerta de movimientos pendientes */}
            {resumenApertura?.movimientosPendientes > 0 && (
                <Alert
                    color="red"
                    variant="filled"
                    radius="md"
                    icon={<IconAlertCircle size={20} />}
                    title="Movimientos de caja pendientes de validación"
                >
                    Existen <b>{resumenApertura.movimientosPendientes} movimiento(s)</b> de este turno en estado PENDIENTE.
                    Debe validarlos antes de realizar el corte.
                </Alert>
            )}

            {/* ── Card 1: Datos del arqueo ── */}
            <SectionCard
                icon={<IconFileText size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Datos del arqueo"
                subtitle="Selecciona la apertura y el empleado que realiza el corte de caja."
                collapsible={false}
            >
                <Stack gap="sm">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <NativeSelect
                            label="Apertura de Caja"
                            withAsterisk
                            value={form.aperturaCajaId ?? ''}
                            error={errors.aperturaCajaId}
                            size="md"
                            radius="md"
                            leftSection={<IconCalendar size={16} stroke={1.5} />}
                            data={[{ value: '', label: 'Selecciona una apertura activa' }, ...(fieldOptions.aperturaCajaId ?? [])]}
                            onChange={(e) => onChange('aperturaCajaId', e.currentTarget.value)}
                        />
                        <NativeSelect
                            label="Empleado que realiza el corte"
                            withAsterisk
                            value={form.empleadoId ?? ''}
                            error={errors.empleadoId}
                            size="md"
                            radius="md"
                            leftSection={<IconUser size={16} stroke={1.5} />}
                            data={[{ value: '', label: 'Selecciona un empleado' }, ...(fieldOptions.empleadoId ?? [])]}
                            onChange={(e) => onChange('empleadoId', e.currentTarget.value)}
                        />
                    </SimpleGrid>

                    <Group justify="flex-start" mt="xs">
                        <Button
                            variant="light"
                            color="orange"
                            size="xs"
                            radius="md"
                            leftSection={<IconReportAnalytics size={16} />}
                            onClick={() => setModalVentasAbierto(true)}
                            disabled={!form.aperturaCajaId}
                        >
                            Ver detalle de ventas
                        </Button>
                    </Group>
                </Stack>
            </SectionCard>

            {/* ── Card 2: Conteo y Arqueo de Efectivo ── */}
            <SectionCard
                icon={<IconCash size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Conteo y Arqueo de Efectivo"
                subtitle="Desglose por denominación de billetes y monedas"
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
                                const cantStr = conteoCierre[d.valor] ?? '';
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
                                                onChange={(v) => actualizarConteoCierre(d.valor, v)}
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
                            <Text fw={700} size="xs" c="#FF6A00">TOTAL EFECTIVO CONTADO:</Text>
                            <Text fw={800} size="md" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                        </Group>
                    </Paper>
                </Stack>
            </SectionCard>

            {/* ── Card 3: Balance teórico del turno ── */}
            <SectionCard
                icon={<IconScale size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Balance teórico del turno"
                subtitle="Diferencia entre el efectivo esperado y el contado"
                rightAmount={`$${Math.abs(diferencia).toFixed(2)}`}
                rightAmountColor={Math.abs(diferencia) < 0.01 ? '#2B8A3E' : (diferencia > 0 ? '#2B8A3E' : '#FF6A00')}
                collapsible={true}
                defaultOpen={true}
            >
                <Stack gap={6}>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Fondo Inicial de Caja:</Text>
                        <Text fw={600} size="xs">${fondoInicial.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">(+) Entradas registradas:</Text>
                        <Text fw={600} size="xs" c="green">+${totalEntradas.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">(-) Salidas autorizadas:</Text>
                        <Text fw={600} size="xs" c="red">-${totalSalidas.toFixed(2)}</Text>
                    </Group>
                    {totalVentasEfectivo > 0 && (
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">(+) Ventas en Efectivo:</Text>
                            <Text fw={600} size="xs" c="green">+${totalVentasEfectivo.toFixed(2)}</Text>
                        </Group>
                    )}
                    <Divider my={2} />
                    <Group justify="space-between">
                        <Text fw={700} size="xs">(=) Efectivo Teórico Esperado:</Text>
                        <Text fw={800} size="xs">${efectivoEsperado.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text fw={700} size="xs" c="#FF6A00">EFECTIVO CONTADO (FÍSICO):</Text>
                        <Text fw={800} size="sm" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                    </Group>
                    <Divider my={2} />
                    <Group justify="space-between">
                        <Text fw={700} size="xs" c={Math.abs(diferencia) < 0.01 ? 'green' : (diferencia > 0 ? 'green' : 'red')}>
                            {Math.abs(diferencia) < 0.01
                                ? 'Caja Cuadrada (Sin diferencia):'
                                : (diferencia > 0 ? 'Sobrante en Caja (+):' : 'Faltante en Caja (-):')}
                        </Text>
                        <Text fw={800} size="sm" c={Math.abs(diferencia) < 0.01 ? 'green' : (diferencia > 0 ? 'green' : 'red')}>
                            {diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)}
                        </Text>
                    </Group>

                    {Math.abs(diferencia) > 0.01 && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            color={diferencia < 0 ? 'red' : 'yellow'}
                            variant="light"
                            p="xs"
                            radius="md"
                            mt="xs"
                        >
                            <Text size="xs" fw={600}>
                                {diferencia < 0
                                    ? `Se detectó un faltante de $${Math.abs(diferencia).toFixed(2)}. Es obligatorio justificar el motivo en el campo de observaciones.`
                                    : `Se detectó un sobrante de $${diferencia.toFixed(2)}. Es obligatorio justificar el motivo en el campo de observaciones.`}
                            </Text>
                        </Alert>
                    )}
                </Stack>
            </SectionCard>

            {/* Observaciones */}
            <Textarea
                label="Observaciones del corte"
                placeholder="Notas o justificación de diferencias (obligatorio si hay faltante o sobrante)"
                value={form.observaciones ?? ''}
                error={errors.observaciones}
                maxLength={500}
                description="Máximo 500 caracteres"
                size="md"
                radius="md"
                minRows={2}
                onChange={(e) => onChange('observaciones', e.currentTarget.value)}
            />

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

/* ─── Drawer de Detalle y Auditoría del Corte de Caja ──────────────────────── */
function DrawerDetalleCorte({ corte, opened, onClose, onValidar, onDescargarPdf }) {
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando] = useState(false);

    const aperturaId = corte?.aperturaCajaId ?? corte?.aperturaCaja?.id;

    useEffect(() => {
        if (!aperturaId || !opened) return;
        setCargando(true);
        api.movimientoCaja
            .obtenerPorApertura(aperturaId)
            .then((r) => {
                if (r.responseFlag === 0) setMovimientos(r.data ?? []);
            })
            .catch(() => setMovimientos([]))
            .finally(() => setCargando(false));
    }, [aperturaId, opened]);

    if (!corte) return null;

    const montoInicial = Number(corte.aperturaCaja?.montoInicial ?? 0);
    const totalEntradas = Number(corte.totalEntradas ?? 0);
    const totalSalidas = Number(corte.totalSalidas ?? 0);
    const totalVentasEfectivo = Number(corte.totalVentasEfectivo ?? 0);
    const efectivoEsperado = montoInicial + totalEntradas - totalSalidas + totalVentasEfectivo;
    const efectivoContado = Number(corte.efectivoContado ?? 0);
    const diferencia = Number(corte.diferencia ?? (efectivoContado - efectivoEsperado));
    const esValidado = corte.estado === 'VALIDADO';

    let desgloseFin = null;
    try {
        if (corte.desgloseFin) {
            desgloseFin = typeof corte.desgloseFin === 'string'
                ? JSON.parse(corte.desgloseFin)
                : corte.desgloseFin;
        }
    } catch {
        desgloseFin = null;
    }

    let desgloseIni = null;
    try {
        if (corte.desgloseInicio) {
            desgloseIni = typeof corte.desgloseInicio === 'string'
                ? JSON.parse(corte.desgloseInicio)
                : corte.desgloseInicio;
        }
    } catch {
        desgloseIni = null;
    }

    // Totales de movimientos
    const entradas = movimientos.filter((m) => m.tipo === 'ENTRADA');
    const salidas = movimientos.filter((m) => m.tipo === 'SALIDA');

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
                        <IconReportAnalytics size={22} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} fw={700} c="#1E293B">Detalle del corte #{corte.id}</Title>
                        <Text size="xs" c="dimmed">Detalle completo de arqueo y movimientos</Text>
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
                        Fecha de corte: {corte.fechaCorte ? new Date(corte.fechaCorte).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconUser size={13} />} size="md" radius="sm">
                        Empleado: {corte.empleado ? `${corte.empleado.nombre} ${corte.empleado.apellidoPaterno}` : '—'}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconCash size={13} />} size="md" radius="sm">
                        Apertura: {corte.aperturaCaja?.caja?.nombre ?? 'Caja'} — Fondo: ${montoInicial.toFixed(2)}
                    </Badge>
                    <Badge color={esValidado ? 'green' : 'yellow'} variant="light" size="md" radius="sm">
                        {corte.estado ?? 'PENDIENTE'}
                    </Badge>
                </Group>

                {/* Tabs de navegación */}
                <Tabs defaultValue="resumen" color="orange">
                    <Tabs.List mb="md">
                        <Tabs.Tab value="resumen">Resumen</Tabs.Tab>
                        <Tabs.Tab value="efectivo">Efectivo</Tabs.Tab>
                        <Tabs.Tab value="billetes">Billetes y Monedas</Tabs.Tab>
                        <Tabs.Tab value="movimientos">Movimientos ({movimientos.length})</Tabs.Tab>
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
                                rightAmount={`$${montoInicial.toFixed(2)}`}
                                rightAmountColor="#1C7ED6"
                                collapsible={false}
                            />

                            {/* Card 2: Conteo final de efectivo */}
                            <SectionCard
                                icon={<IconCash size={22} stroke={1.8} />}
                                iconBg="#EBFBEE"
                                iconColor="#2B8A3E"
                                title="Conteo final de efectivo"
                                subtitle="Efectivo físico reportado en el arqueo"
                                rightAmount={`$${efectivoContado.toFixed(2)}`}
                                rightAmountColor="#2B8A3E"
                                collapsible={true}
                                defaultOpen={true}
                            >
                                {desgloseFin && Object.values(desgloseFin).some((v) => Number(v) > 0) ? (
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
                                                const cant = Number(desgloseFin[d.valor] ?? 0);
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
                                ) : (
                                    <Text size="xs" c="dimmed" ta="center">Sin desglose capturado.</Text>
                                )}
                            </SectionCard>

                            {/* Card 3: Balance teórico del turno */}
                            <SectionCard
                                icon={<IconScale size={22} stroke={1.8} />}
                                iconBg="#FFF4EC"
                                iconColor="#FF6A00"
                                title="Balance teórico del turno"
                                subtitle="Diferencia entre el efectivo esperado y el contado"
                                rightAmount={`$${Math.abs(diferencia).toFixed(2)}`}
                                rightAmountColor={Math.abs(diferencia) < 0.01 ? '#2B8A3E' : (diferencia > 0 ? '#2B8A3E' : '#FF6A00')}
                                collapsible={true}
                                defaultOpen={true}
                            >
                                <Stack gap={6}>
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Fondo Inicial de Caja:</Text>
                                        <Text fw={600} size="xs">${montoInicial.toFixed(2)}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">(+) Entradas registradas:</Text>
                                        <Text fw={600} size="xs" c="green">+${totalEntradas.toFixed(2)}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">(-) Salidas autorizadas:</Text>
                                        <Text fw={600} size="xs" c="red">-${totalSalidas.toFixed(2)}</Text>
                                    </Group>
                                    {totalVentasEfectivo > 0 && (
                                        <Group justify="space-between">
                                            <Text size="xs" c="dimmed">(+) Ventas en Efectivo:</Text>
                                            <Text fw={600} size="xs" c="green">+${totalVentasEfectivo.toFixed(2)}</Text>
                                        </Group>
                                    )}
                                    <Divider my={2} />
                                    <Group justify="space-between">
                                        <Text fw={700} size="xs">(=) Efectivo Teórico Esperado:</Text>
                                        <Text fw={800} size="xs">${efectivoEsperado.toFixed(2)}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text fw={700} size="xs" c="#FF6A00">Efectivo Contado (Físico):</Text>
                                        <Text fw={800} size="sm" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my={2} />
                                    <Group justify="space-between">
                                        <Text fw={700} size="xs" c={Math.abs(diferencia) < 0.01 ? 'green' : (diferencia > 0 ? 'green' : 'red')}>
                                            {Math.abs(diferencia) < 0.01
                                                ? 'Caja Cuadrada (Sin diferencia):'
                                                : (diferencia > 0 ? 'Sobrante (+):' : 'Faltante (-):')}
                                        </Text>
                                        <Text fw={800} size="sm" c={Math.abs(diferencia) < 0.01 ? 'green' : (diferencia > 0 ? 'green' : 'red')}>
                                            {diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)}
                                        </Text>
                                    </Group>
                                </Stack>
                            </SectionCard>

                            {/* Observaciones */}
                            {corte.observaciones && (
                                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC' }}>
                                    <Text size="xs" c="dimmed" fw={600} mb={2}>Observaciones registradas:</Text>
                                    <Text size="sm">{corte.observaciones}</Text>
                                </Paper>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    {/* ── Tab: Efectivo (Resumen detallado de flujo) ── */}
                    <Tabs.Panel value="efectivo">
                        <Stack gap="md">
                            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                                <Paper p="xs" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={600}>Fondo Inicial</Text>
                                    <Text fw={800} size="md">${montoInicial.toFixed(2)}</Text>
                                </Paper>
                                <Paper p="xs" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={600}>Entradas (+)</Text>
                                    <Text fw={800} size="md" c="green">+${totalEntradas.toFixed(2)}</Text>
                                </Paper>
                                <Paper p="xs" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={600}>Salidas (-)</Text>
                                    <Text fw={800} size="md" c="red">-${totalSalidas.toFixed(2)}</Text>
                                </Paper>
                                {totalVentasEfectivo > 0 && (
                                    <Paper p="xs" radius="md" withBorder>
                                        <Text size="xs" c="dimmed" fw={600}>Ventas Ef. (+)</Text>
                                        <Text fw={800} size="md" c="green">+${totalVentasEfectivo.toFixed(2)}</Text>
                                    </Paper>
                                )}
                                <Paper p="xs" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={600}>Ef. Esperado</Text>
                                    <Text fw={800} size="md">${efectivoEsperado.toFixed(2)}</Text>
                                </Paper>
                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#FFF4EC', borderColor: '#FF6A00' }}>
                                    <Text size="xs" c="dimmed" fw={600}>Ef. Contado</Text>
                                    <Text fw={800} size="md" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                                </Paper>
                            </SimpleGrid>

                            <Paper p="sm" radius="md" withBorder style={{ backgroundColor: diferencia >= 0 ? '#F4FBF5' : '#FFF5F5' }}>
                                <Group justify="space-between">
                                    <Text fw={700} size="sm">Diferencia Neta de Arqueo:</Text>
                                    <Text fw={800} size="lg" c={diferencia >= 0 ? 'green' : 'red'}>
                                        {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                                    </Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>

                    {/* ── Tab: Billetes y Monedas (Comparativa Inicio vs Cierre) ── */}
                    <Tabs.Panel value="billetes">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {/* Billetes Inicio */}
                            <Paper p="sm" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700} size="xs" c="blue" tt="uppercase">Billetes al Inicio</Text>
                                    <Badge color="blue" variant="light" size="xs">${montoInicial.toFixed(2)}</Badge>
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
                                        {DENOMINACIONES.map((d) => {
                                            const cant = Number(desgloseIni?.[d.valor] ?? 0);
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

                            {/* Billetes Cierre */}
                            <Paper p="sm" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700} size="xs" c="#FF6A00" tt="uppercase">Billetes al Cierre</Text>
                                    <Badge color="orange" variant="light" size="xs">${efectivoContado.toFixed(2)}</Badge>
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
                                        {DENOMINACIONES.map((d) => {
                                            const cant = Number(desgloseFin?.[d.valor] ?? 0);
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

                    {/* ── Tab: Movimientos Manuales del Turno ── */}
                    <Tabs.Panel value="movimientos">
                        <Stack gap="sm">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#F4FBF5' }}>
                                    <Text size="xs" c="dimmed">Ingresos ({entradas.length})</Text>
                                    <Text fw={800} size="sm" c="green">+${totalEntradas.toFixed(2)}</Text>
                                </Paper>
                                <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#FFF5F5' }}>
                                    <Text size="xs" c="dimmed">Egresos ({salidas.length})</Text>
                                    <Text fw={800} size="sm" c="red">-${totalSalidas.toFixed(2)}</Text>
                                </Paper>
                            </SimpleGrid>

                            <Table striped highlightOnHover withTableBorder style={{ fontSize: 12 }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>#</Table.Th>
                                        <Table.Th>Tipo</Table.Th>
                                        <Table.Th>Concepto</Table.Th>
                                        <Table.Th>Hora</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Monto</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {movimientos.length > 0 ? (
                                        movimientos.map((m, idx) => (
                                            <Table.Tr key={m.id}>
                                                <Table.Td>{idx + 1}</Table.Td>
                                                <Table.Td>
                                                    <Badge color={m.tipo === 'ENTRADA' ? 'green' : 'red'} size="xs">
                                                        {m.tipo}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>{m.concepto}</Table.Td>
                                                <Table.Td>
                                                    {(m.createdAt || m.created_at) ? new Date(m.createdAt || m.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }} fw={700}>
                                                    <Text size="xs" c={m.tipo === 'ENTRADA' ? 'green' : 'red'} fw={700}>
                                                        {m.tipo === 'ENTRADA' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                                                    </Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={5} style={{ textAlign: 'center', color: '#868e96' }}>
                                                {cargando ? 'Cargando movimientos…' : 'No se registraron movimientos manuales.'}
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </div>

            {/* Footer sticky del Drawer */}
            <Group
                justify="space-between"
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
                <Group gap="xs">
                    {!esValidado && (
                        <Button
                            color="green"
                            radius="md"
                            leftSection={<IconShieldCheck size={16} />}
                            onClick={() => {
                                onValidar(corte);
                                onClose();
                            }}
                        >
                            Validar corte
                        </Button>
                    )}
                    <Button
                        color="orange"
                        radius="md"
                        leftSection={<IconFileDownload size={16} />}
                        onClick={() => onDescargarPdf(corte, false)}
                    >
                        Descargar PDF
                    </Button>
                </Group>
            </Group>
        </Drawer>
    );
}

/* ─── Componente Principal ──────────────────────────────────────────────────── */
export function CorteCaja() {
    const [corteSeleccionado, setCorteSeleccionado] = useState(null);
    const [drawerDetalleAbierto, setDrawerDetalleAbierto] = useState(false);

    const mapRecordToForm = useMemo(() => (record) => ({
        aperturaCajaId: record.aperturaCaja?.id
            ? String(record.aperturaCaja.id)
            : String(record.aperturaCajaId ?? ''),
        empleadoId: record.empleado?.id
            ? String(record.empleado.id)
            : String(record.empleadoId ?? ''),
        efectivoContado: record.efectivoContado ?? 0,
        observaciones:   record.observaciones   ?? '',
        desgloseInicio:  record.desgloseInicio  ?? null,
        desgloseFin:     record.desgloseFin     ?? null,
    }), []);

    const mapFormToPayload = (form) => ({
        aperturaCajaId:  Number(form.aperturaCajaId),
        empleadoId:      Number(form.empleadoId),
        efectivoContado: Number(form.efectivoContado),
        desgloseInicio:  form.desgloseInicio ?? null,
        desgloseFin:     form.desgloseFin    ?? null,
        observaciones:   form.observaciones  || null,
    });

    const mapRecordToRow = (record) => {
        const diferencia = Number(record.diferencia ?? 0);
        const esValidado = record.estado === 'VALIDADO';

        return {
            id:              record.id,
            numero: (
                <Badge variant="light" color="gray" size="sm" radius="sm">
                    #{record.id}
                </Badge>
            ),
            apertura:        record.aperturaCaja?.caja?.nombre ?? '—',
            empleado:        record.empleado
                ? `${record.empleado.nombre} ${record.empleado.apellidoPaterno}`
                : '—',
            fechaCorte:      record.fechaCorte
                ? new Date(record.fechaCorte).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                : '—',
            fondoInicial:    `$${Number(record.aperturaCaja?.montoInicial ?? 0).toFixed(2)}`,
            entradas:        `+$${Number(record.totalEntradas ?? 0).toFixed(2)}`,
            salidas:         `-$${Number(record.totalSalidas ?? 0).toFixed(2)}`,
            efectivoContado: `$${Number(record.efectivoContado ?? 0).toFixed(2)}`,
            diferencia: (
                <Text fw={700} c={diferencia >= 0 ? 'green' : 'red'}>
                    {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                </Text>
            ),
            estado: (
                <Badge color={esValidado ? 'green' : 'yellow'} variant="light">
                    {record.estado ?? 'PENDIENTE'}
                </Badge>
            ),
        };
    };

    const handleDescargarPdf = async (corte, esReimpresion = false) => {
        if (!corte) return;
        let movs = [];
        const aperturaId = corte?.aperturaCajaId ?? corte?.aperturaCaja?.id;
        if (aperturaId) {
            try {
                const r = await api.movimientoCaja.obtenerPorApertura(aperturaId);
                if (r.responseFlag === 0) movs = r.data ?? [];
            } catch {
                movs = [];
            }
        }

        let desglose = null;
        try {
            if (corte?.desgloseFin) {
                desglose = typeof corte.desgloseFin === 'string'
                    ? JSON.parse(corte.desgloseFin)
                    : corte.desgloseFin;
            }
        } catch {
            desglose = null;
        }

        let configuraciones = [];
        try {
            const resConfig = await api.configuracionSistema.obtenerTodos();
            if (resConfig.responseFlag === 0) configuraciones = resConfig.data ?? [];
        } catch {
            configuraciones = [];
        }

        generarPdfCorte(corte, movs, desglose, configuraciones, { esReimpresion });
    };

    const handleValidar = async (corte, helpers = {}) => {
        const reload = helpers?.reload;
        if (!corte?.id) return;
        try {
            const res = await api.corteCaja.validar(corte.id);
            if (res.responseFlag === 0) {
                notifications.show({
                    title: 'Corte Validado',
                    message: `El corte #${corte.id} ha sido validado y auditado correctamente.`,
                    color: 'green',
                    icon: <IconShieldCheck size={18} />,
                });
                if (typeof reload === 'function') {
                    reload();
                }
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            notifications.show({
                title: 'Error al validar',
                message: e.message || 'No se pudo validar el corte de caja.',
                color: 'red',
            });
        }
    };

    const validateForm = async (form) => {
        const errors = {};
        if (!form.aperturaCajaId) errors.aperturaCajaId = 'Selecciona una apertura de caja';
        if (!form.empleadoId) errors.empleadoId = 'Selecciona un empleado';
        if (form.efectivoContado === undefined || form.efectivoContado === null || Number(form.efectivoContado) < 0) {
            errors.efectivoContado = 'El efectivo contado debe ser mayor o igual a 0';
        }
        if (Number(form.efectivoContado) > 200000) {
            errors.efectivoContado = 'El efectivo contado físico no puede exceder el límite de $200,000.00';
        }

        // Validación de movimientos pendientes y balance contable
        if (form.aperturaCajaId) {
            try {
                const res = await api.movimientoCaja.obtenerResumenApertura(form.aperturaCajaId);
                if (res.responseFlag === 0 && res.data) {
                    const data = res.data;
                    const movPendientes = Number(data.movimientosPendientes ?? 0);
                    if (movPendientes > 0) {
                        errors.aperturaCajaId = `No se puede realizar el corte: existen ${movPendientes} movimiento(s) pendientes de validar en este turno.`;
                    }

                    const fondo = Number(data.montoInicial ?? data.apertura?.montoInicial ?? 0);
                    const entradas = Number(data.totalEntradas ?? 0);
                    const salidas = Number(data.totalSalidas ?? 0);
                    const ventasEf = Number(data.totalVentasEfectivo ?? 0);
                    const esperado = data.saldoDisponible !== undefined
                        ? Number(data.saldoDisponible)
                        : (fondo + entradas - salidas + ventasEf);
                    const contado = Number(form.efectivoContado || 0);
                    const diff = contado - esperado;

                    // Si hay dinero teórico esperado en caja pero el usuario dejó el conteo en 0 sin contar
                    if (esperado > 0 && contado === 0) {
                        const tieneConteo = form.desgloseFin && Object.values(form.desgloseFin).some((v) => v !== '' && Number(v) > 0);
                        if (!tieneConteo) {
                            errors.efectivoContado = `Debe realizar el conteo físico de billetes y monedas. El saldo teórico esperado en caja es de $${esperado.toFixed(2)}.`;
                        }
                    }

                    // Justificación obligatoria si hay diferencia
                    if (Math.abs(diff) > 0.01) {
                        if (!form.observaciones || !form.observaciones.trim()) {
                            errors.observaciones = `Existe una diferencia de ${diff < 0 ? 'faltante' : 'sobrante'} ($${Math.abs(diff).toFixed(2)}). Debe ingresar obligatoriamente una justificación detallada en las observaciones.`;
                        }
                    }
                }
            } catch {
                // Validación respaldada en backend
            }
        }

        if (form.observaciones?.trim().length > 500) {
            errors.observaciones = 'Las observaciones no pueden exceder 500 caracteres';
        }

        return errors;
    };

    return (
        <div className={classes.corteCajaWrapper}>
            <DrawerDetalleCorte
                corte={corteSeleccionado}
                opened={drawerDetalleAbierto}
                onClose={() => setDrawerDetalleAbierto(false)}
                onValidar={(corte) => handleValidar(corte, { reload: () => window.location.reload() })}
                onDescargarPdf={handleDescargarPdf}
            />

            <CrudCatalogo
                titulo="Corte de Caja"
                singular="Corte"
                icon={IconCalculator}
                headerVariant="unified"
                tableHeaderVariant="neutral"
                formMode="drawer"
                drawerSize={740}
                servicio={api.corteCaja}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={INICIAL}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderForm={(props) => <CorteForm {...props} />}
                validateForm={validateForm}
                pageSizeOptions={[5, 10, 15, 20]}
                initialSortBy="numero"
                initialSortDirection="desc"
                permitirEditar={false}
                permitirEliminar={false}
                renderAccionesFila={(fila, recordOriginal, helpers = {}) => {
                    const reload = helpers?.reload;
                    const corte = recordOriginal ?? fila?._recordOriginal ?? fila;
                    const esValidado = corte?.estado === 'VALIDADO';

                    return (
                        <Group gap={6} wrap="nowrap">
                            {/* 1. Ver Detalle y Auditoría en Drawer */}
                            <Tooltip label="Ver detalle y auditoría" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    onClick={() => {
                                        setCorteSeleccionado(corte);
                                        setDrawerDetalleAbierto(true);
                                    }}
                                >
                                    <IconEye size={18} stroke={1.8} />
                                </ActionIcon>
                            </Tooltip>

                            {/* 2. Validar Corte */}
                            <Tooltip
                                label={esValidado ? 'Corte ya validado' : 'Validar corte de caja'}
                                withArrow
                                openDelay={200}
                            >
                                <span style={{ display: 'inline-block' }}>
                                    <ActionIcon
                                        variant={esValidado ? 'subtle' : 'light'}
                                        color={esValidado ? 'gray' : 'green'}
                                        size="lg"
                                        disabled={esValidado}
                                        onClick={() => handleValidar(corte, { reload })}
                                    >
                                        {esValidado ? <IconCheck size={18} stroke={2} /> : <IconShieldCheck size={18} stroke={1.8} />}
                                    </ActionIcon>
                                </span>
                            </Tooltip>

                            {/* 3. Descargar PDF con menú de Original vs Copia */}
                            <Menu
                                shadow="md"
                                width={240}
                                position="bottom-end"
                                radius="md"
                                withArrow
                                withinPortal
                                disabled={!esValidado}
                            >
                                <Menu.Target>
                                    <Tooltip
                                        label={!esValidado ? 'Debe validar el corte para descargar el comprobante en PDF' : 'Descargar comprobante en PDF'}
                                        withArrow
                                        openDelay={200}
                                    >
                                        <ActionIcon
                                            variant="light"
                                            color={esValidado ? 'orange' : 'gray'}
                                            size="lg"
                                            disabled={!esValidado}
                                        >
                                            <IconFileDownload size={18} stroke={1.8} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Formato de Comprobante</Menu.Label>
                                    <Menu.Item
                                        leftSection={<IconFileCheck size={16} stroke={1.8} color="#FF6A00" />}
                                        onClick={() => handleDescargarPdf(corte, false)}
                                    >
                                        Original (Sin marca de agua)
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconCopy size={16} stroke={1.8} color="#868e96" />}
                                        onClick={() => handleDescargarPdf(corte, true)}
                                    >
                                        Copia / Reimpresión
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    );
                }}
            />
        </div>
    );
}

export default CorteCaja;
