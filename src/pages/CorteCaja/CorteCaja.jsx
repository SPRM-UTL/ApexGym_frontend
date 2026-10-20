/**
 * Sistema: ApexGym Frontend
 * Issue: [CAJA-05] Frontend: Validaciones, arqueo fisico y modales en pantalla de Corte de Caja #90
 * Parent: Control Operativo de Caja, Auditoria Contable y Reporte de Corte en PDF #85
 *
 * Tareas:
 * - Modificar src/pages/CorteCaja/CorteCaja.jsx para alertar si existen movimientos pendientes antes del cierre.
 * - Modales de captura para desglose de billetes y monedas.
 * - Calculo reactivo del efectivo contado frente al saldo teorico del sistema (deteccion de sobrantes y faltantes).
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
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
    Progress,
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
    IconAlertCircle,
    IconArrowsExchange,
    IconCalculator,
    IconCash,
    IconCheck,
    IconCoins,
    IconCreditCard,
    IconDeviceMobile,
    IconEye,
    IconFileDownload,
    IconInfoCircle,
    IconArrowDownRight,
    IconArrowUpRight,
    IconMinus,
    IconPlus,
    IconReceipt2,
    IconReportAnalytics,
    IconShieldCheck,
    IconTrendingUp,
    IconUser,
    IconWallet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { generarPdfCorte } from '../../scripts/generarPdfCorte.js';

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

/* ─── Estilos de sección ────────────────────────────────────────────────────── */
const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

/**
 * Distribuye automáticamente un monto en denominaciones para representar el fondo inicial.
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

/* ─── Modal 1: Detalle de Ventas y Movimientos del Turno ────────────────────── */
function ModalDetalleVentas({ opened, onClose, aperturaId, resumenApertura }) {
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
            fullScreen
            radius={0}
            zIndex={999999}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
            title={
                <Group gap="sm">
                    <ThemeIcon size="md" radius="md" variant="outline" color="white" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff' }}>
                        <IconReportAnalytics size={18} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} style={{ color: '#ffffff' }}>Detalle de Ventas y Movimientos de Caja del Turno</Title>
                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Auditoría completa de ventas por método de pago y movimientos manuales del turno</Text>
                    </div>
                </Group>
            }
        >
            <Box maw={1200} mx="auto" mt="xl" pt="md">
                <Stack gap="md">
                    {/* Tarjetas KPI Superiores */}
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                        <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fff9f5', borderColor: '#FF6A00' }}>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Ventas</Text>
                            <Text fw={800} size="xl" c="#FF6A00">${totalVentas.toFixed(2)}</Text>
                            <Text size="xs" c="dimmed" mt={2}>Turno actual</Text>
                        </Paper>
                        <Paper p="sm" radius="md" withBorder>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Transacciones</Text>
                            <Text fw={800} size="xl" c="dark">{transacciones}</Text>
                            <Text size="xs" c="dimmed" mt={2}>Tickets generados</Text>
                        </Paper>
                        <Paper p="sm" radius="md" withBorder>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Ticket Promedio</Text>
                            <Text fw={800} size="xl" c="dark">${ticketPromedio.toFixed(2)}</Text>
                            <Text size="xs" c="dimmed" mt={2}>Por cliente</Text>
                        </Paper>
                    </SimpleGrid>

                    {/* Desglose por Tipo de Pago */}
                    <Divider label="Ventas por Método de Pago" labelPosition="left" />
                    <Stack gap="sm">
                        {metodos.length > 0 ? (
                            metodos.map((m) => {
                                const { icon, color } = getMetodoIcon(m.nombre);
                                const totalNum = Number(m.total ?? 0);
                                const pct = totalVentas > 0 ? ((totalNum / totalVentas) * 100).toFixed(1) : '0.0';

                                return (
                                    <Paper key={m.metodoPagoId ?? m.nombre} p="sm" radius="md" withBorder>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap="xs">
                                                <ThemeIcon color={color} variant="light" radius="md" size="sm">
                                                    {icon}
                                                </ThemeIcon>
                                                <Text fw={600} size="sm">{m.nombre}</Text>
                                            </Group>
                                            <Group gap="xs">
                                                <Badge color={color} variant="light">{m.transacciones} transacciones</Badge>
                                                <Text fw={700} size="sm">${totalNum.toFixed(2)} ({pct}%)</Text>
                                            </Group>
                                        </Group>
                                        <Progress value={Number(pct)} color={color} size="sm" radius="xl" />
                                    </Paper>
                                );
                            })
                        ) : (
                            <Paper p="md" radius="md" withBorder style={{ textAlign: 'center' }}>
                                <Text size="sm" c="dimmed">No se han registrado ventas en esta apertura de caja.</Text>
                            </Paper>
                        )}
                    </Stack>

                    {/* ── Movimientos de Caja del Turno (Masterrows para Entradas y Salidas) ── */}
                    <Divider label="Movimientos de Caja del Turno (Ingresos y Egresos)" labelPosition="left" mt="xs" />

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                        <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#f4fbf5', borderColor: '#40c057' }}>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Entradas (+)</Text>
                            <Text fw={800} size="lg" c="green">+${totalEntradas.toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">{entradas.length} movimiento(s)</Text>
                        </Paper>
                        <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#fff5f5', borderColor: '#fa5252' }}>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Salidas (-)</Text>
                            <Text fw={800} size="lg" c="red">-${totalSalidas.toFixed(2)}</Text>
                            <Text size="xs" c="dimmed">{salidas.length} movimiento(s)</Text>
                        </Paper>
                        <Paper p="xs" radius="md" withBorder>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase">Balance Neto Movimientos</Text>
                            <Text fw={800} size="lg" c={balanceMovimientos >= 0 ? 'green' : 'red'}>
                                {balanceMovimientos >= 0 ? '+' : ''}${balanceMovimientos.toFixed(2)}
                            </Text>
                            <Text size="xs" c="dimmed">Ingresos menos Egresos</Text>
                        </Paper>
                    </SimpleGrid>

                    <Accordion variant="separated" radius="md" defaultValue={['entradas', 'salidas']} multiple>
                        {/* Masterrow 1: Entradas / Ingresos */}
                        <Accordion.Item value="entradas">
                            <Accordion.Control icon={<ThemeIcon color="green" variant="light" radius="md" size="sm"><IconCash size={16} /></ThemeIcon>}>
                                <Group justify="space-between" w="100%" pr="sm">
                                    <div>
                                        <Text fw={700} size="sm">Ingresos / Entradas de Efectivo (+)</Text>
                                        <Text size="xs" c="dimmed">{entradas.length} registro(s) capturados</Text>
                                    </div>
                                    <Badge color="green" variant="filled" size="md">
                                        +${totalEntradas.toFixed(2)}
                                    </Badge>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                {entradas.length > 0 ? (
                                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ width: 60 }}>#</Table.Th>
                                                <Table.Th>Concepto</Table.Th>
                                                <Table.Th>Responsable</Table.Th>
                                                <Table.Th>Hora</Table.Th>
                                                <Table.Th style={{ textAlign: 'right' }}>Monto (+)</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {entradas.map((m) => (
                                                <Table.Tr key={m.id}>
                                                    <Table.Td fw={700}>#{m.id}</Table.Td>
                                                    <Table.Td>{m.concepto}</Table.Td>
                                                    <Table.Td>
                                                        {m.empleado ? `${m.empleado.nombre} ${m.empleado.apellidoPaterno}` : '—'}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text fw={700} c="green">+${Number(m.monto).toFixed(2)}</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                ) : (
                                    <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center', backgroundColor: '#fcfcfc' }}>
                                        <Text size="xs" c="dimmed">No se registraron entradas de efectivo en este turno.</Text>
                                    </Paper>
                                )}
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Masterrow 2: Salidas / Egresos */}
                        <Accordion.Item value="salidas">
                            <Accordion.Control icon={<ThemeIcon color="red" variant="light" radius="md" size="sm"><IconArrowsExchange size={16} /></ThemeIcon>}>
                                <Group justify="space-between" w="100%" pr="sm">
                                    <div>
                                        <Text fw={700} size="sm">Egresos / Salidas de Efectivo (-)</Text>
                                        <Text size="xs" c="dimmed">{salidas.length} registro(s) capturados</Text>
                                    </div>
                                    <Badge color="red" variant="filled" size="md">
                                        -${totalSalidas.toFixed(2)}
                                    </Badge>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                {salidas.length > 0 ? (
                                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ width: 60 }}>#</Table.Th>
                                                <Table.Th>Concepto</Table.Th>
                                                <Table.Th>Responsable</Table.Th>
                                                <Table.Th>Hora</Table.Th>
                                                <Table.Th style={{ textAlign: 'right' }}>Monto (-)</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {salidas.map((m) => (
                                                <Table.Tr key={m.id}>
                                                    <Table.Td fw={700}>#{m.id}</Table.Td>
                                                    <Table.Td>{m.concepto}</Table.Td>
                                                    <Table.Td>
                                                        {m.empleado ? `${m.empleado.nombre} ${m.empleado.apellidoPaterno}` : '—'}
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'right' }}>
                                                        <Text fw={700} c="red">-${Number(m.monto).toFixed(2)}</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                ) : (
                                    <Paper p="sm" radius="sm" withBorder style={{ textAlign: 'center', backgroundColor: '#fcfcfc' }}>
                                        <Text size="xs" c="dimmed">No se registraron salidas de efectivo en este turno.</Text>
                                    </Paper>
                                )}
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>

                    <Group grow mt="md">
                        <Button variant="default" size="md" radius="md" onClick={onClose}>
                            Cerrar
                        </Button>
                    </Group>
                </Stack>
            </Box>
        </Modal>
    );
}

/* ─── Modal 2: Detalle y Auditoría del Corte de Caja (KPIs + Movimientos) ────── */
function ModalDetalleCorte({ corte, opened, onClose, onValidar }) {
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
        if (corte.desgloseFin) desgloseFin = JSON.parse(corte.desgloseFin);
    } catch (e) {
        desgloseFin = null;
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
                <Group justify="space-between" w="100%" pr="xl">
                    <Group gap="xs">
                        <ThemeIcon size="lg" radius="md" variant="outline" color="white" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff' }}>
                            <IconReportAnalytics size={22} stroke={1.8} />
                        </ThemeIcon>
                        <div>
                            <Title order={4} style={{ color: '#ffffff' }}>Auditoría de Corte de Caja #{corte.id}</Title>
                            <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Detalle completo de arqueo y movimientos</Text>
                        </div>
                        <Badge color={esValidado ? 'green' : 'yellow'} variant="filled" size="md">
                            {corte.estado ?? 'PENDIENTE'}
                        </Badge>
                    </Group>
                    {!esValidado && (
                        <Button
                            color="green"
                            size="xs"
                            leftSection={<IconShieldCheck size={16} />}
                            onClick={() => {
                                onValidar(corte);
                                onClose();
                            }}
                        >
                            Validar Corte
                        </Button>
                    )}
                </Group>
            }
        >
            <Box maw={1200} mx="auto" mt="xl" pt="md">
                <Stack gap="md">
                    {/* ── KPIs Principales del Corte ───────────────────────────── */}
                    <SimpleGrid cols={{ base: 2, sm: 3, md: totalVentasEfectivo > 0 ? 7 : 6 }} spacing="xs">
                        <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Fondo Inicial</Text>
                            <Text fw={800} size="md">${montoInicial.toFixed(2)}</Text>
                        </Paper>
                        <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Entradas (+)</Text>
                            <Text fw={800} size="md" c="green">+${totalEntradas.toFixed(2)}</Text>
                        </Paper>
                        <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Salidas (-)</Text>
                            <Text fw={800} size="md" c="red">-${totalSalidas.toFixed(2)}</Text>
                        </Paper>
                        {totalVentasEfectivo > 0 && (
                            <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center' }}>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ventas Ef. (+)</Text>
                                <Text fw={800} size="md" c="green">+${totalVentasEfectivo.toFixed(2)}</Text>
                            </Paper>
                        )}
                        <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center' }}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ef. Esperado</Text>
                            <Text fw={800} size="md">${efectivoEsperado.toFixed(2)}</Text>
                        </Paper>
                        <Paper p="xs" radius="md" withBorder style={{ textAlign: 'center', backgroundColor: '#fff9f5', borderColor: '#FF6A00' }}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ef. Contado</Text>
                            <Text fw={800} size="md" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                        </Paper>
                        <Paper
                            p="xs"
                            radius="md"
                            withBorder
                            style={{
                                textAlign: 'center',
                                backgroundColor: diferencia >= 0 ? '#f4fbf5' : '#fff5f5',
                                borderColor: diferencia >= 0 ? '#40c057' : '#fa5252',
                            }}
                        >
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Diferencia</Text>
                            <Text fw={800} size="md" c={diferencia >= 0 ? 'green' : 'red'}>
                                {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                            </Text>
                        </Paper>
                    </SimpleGrid>

                    {/* Info adicional */}
                    <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Caja Asignada</Text>
                                <Text fw={600} size="sm">{corte.aperturaCaja?.caja?.nombre ?? '—'}</Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Cajero Responsable</Text>
                                <Text fw={600} size="sm">
                                    {corte.empleado ? `${corte.empleado.nombre} ${corte.empleado.apellidoPaterno}` : '—'}
                                </Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={600}>Fecha y Hora de Corte</Text>
                                <Text fw={600} size="sm">
                                    {corte.fechaCorte ? new Date(corte.fechaCorte).toLocaleString('es-MX') : '—'}
                                </Text>
                            </div>
                        </SimpleGrid>
                    </Paper>

                    {/* Desglose de billetes si está disponible */}
                    {desgloseFin && (
                        <Box>
                            <div style={sectionHeader}>
                                <ThemeIcon size="sm" radius="md" variant="light" color="apex">
                                    <IconCoins size={14} />
                                </ThemeIcon>
                                <Title order={6}>Arqueo de Billetes y Monedas Registrado</Title>
                            </div>
                            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                                {Object.entries(desgloseFin).map(([valor, cant]) => {
                                    const v = Number(valor);
                                    const c = Number(cant);
                                    if (!c) return null;
                                    return (
                                        <Paper key={valor} p="xs" radius="sm" withBorder style={{ fontSize: 12 }}>
                                            <Text size="xs" fw={700}>${v >= 1 ? v : '0.50'} × {c}</Text>
                                            <Text size="xs" c="dimmed">${(v * c).toFixed(2)}</Text>
                                        </Paper>
                                    );
                                })}
                            </SimpleGrid>
                        </Box>
                    )}

                    {/* ── Tabla de Movimientos del Turno ──────────────────────── */}
                    <Box>
                        <div style={sectionHeader}>
                            <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                                <IconArrowsExchange size={14} />
                            </ThemeIcon>
                            <Title order={6}>Movimientos Manuales del Turno ({movimientos.length})</Title>
                        </div>

                        <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>#</Table.Th>
                                    <Table.Th>Tipo</Table.Th>
                                    <Table.Th>Concepto</Table.Th>
                                    <Table.Th>Monto</Table.Th>
                                    <Table.Th>Hora</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {movimientos.length > 0 ? (
                                    movimientos.map((m, idx) => (
                                        <Table.Tr key={m.id}>
                                            <Table.Td>{idx + 1}</Table.Td>
                                            <Table.Td>
                                                <Badge color={m.tipo === 'ENTRADA' ? 'green' : 'red'} size="sm">
                                                    {m.tipo}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>{m.concepto}</Table.Td>
                                            <Table.Td fw={700}>${Number(m.monto).toFixed(2)}</Table.Td>
                                            <Table.Td>
                                                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5} style={{ textAlign: 'center', color: '#868e96' }}>
                                            {cargando ? 'Cargando movimientos…' : 'No se registraron movimientos en este turno.'}
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Box>

                    {/* Acciones del Modal */}
                    <Group justify="space-between" mt="md">
                        <Tooltip
                            label={!esValidado ? 'Debe validar el corte para descargar el comprobante oficial en PDF' : 'Descargar reporte PDF oficial'}
                            withArrow
                        >
                            <span style={{ display: 'inline-block' }}>
                                <Button
                                    variant="light"
                                    color="apex"
                                    leftSection={<IconFileDownload size={16} />}
                                    disabled={!esValidado}
                                    onClick={async () => {
                                        let configuraciones = [];
                                        try {
                                            const resConfig = await api.configuracionSistema.obtenerTodos();
                                            if (resConfig.responseFlag === 0) configuraciones = resConfig.data ?? [];
                                        } catch (e) {}
                                        generarPdfCorte(corte, movimientos, desgloseFin, configuraciones);
                                    }}
                                >
                                    Descargar PDF
                                </Button>
                            </span>
                        </Tooltip>

                        <Group gap="xs">
                            {!esValidado && (
                                <Button
                                    color="green"
                                    leftSection={<IconShieldCheck size={16} />}
                                    onClick={() => {
                                        onValidar(corte);
                                        onClose();
                                    }}
                                >
                                    Validar Corte
                                </Button>
                            )}
                            <Button variant="default" onClick={onClose}>
                                Cerrar
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Box>
        </Modal>
    );
}

/* ─── Formulario de Arqueo (Billetes Inicio Izquierda / Cierre Derecha) ─────── */
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

    // Obtener desglose de inicio directamente del registro de apertura o por distribución del monto inicial
    const desgloseInicio = useMemo(() => {
        if (resumenApertura?.apertura?.desgloseInicio) {
            try {
                const parsed = typeof resumenApertura.apertura.desgloseInicio === 'string'
                    ? JSON.parse(resumenApertura.apertura.desgloseInicio)
                    : resumenApertura.apertura.desgloseInicio;
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {}
        }
        const monto = resumenApertura
            ? Number(resumenApertura.montoInicial ?? resumenApertura.apertura?.montoInicial ?? 0)
            : 0;
        return desglosarMonto(monto);
    }, [resumenApertura]);

    // Sincronizar desgloseInicio en el form cuando esté disponible
    useEffect(() => {
        if (desgloseInicio) {
            onChange('desgloseInicio', desgloseInicio);
        }
    }, [desgloseInicio]);

    // Recalcular efectivo contado a partir del conteo de cierre
    const actualizarConteoCierre = (valor, cantidad) => {
        let cant = 0;
        if (cantidad !== '' && !isNaN(Number(cantidad))) {
            cant = Math.max(0, Math.min(1000, Math.floor(Number(cantidad))));
        }
        const valToStore = cantidad === '' ? '' : cant;
        const nuevoConteo = { ...conteoCierre, [valor]: valToStore };
        setConteoCierre(nuevoConteo);

        // Sumar total
        let total = 0;
        for (const d of DENOMINACIONES) {
            const c = nuevoConteo[d.valor] === '' ? 0 : Number(nuevoConteo[d.valor]);
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
                aperturaId={form.aperturaCajaId}
                resumenApertura={resumenApertura}
            />

            {/* Alerta de movimientos pendientes de validación */}
            {resumenApertura?.movimientosPendientes > 0 && (
                <Alert
                    color="red"
                    variant="filled"
                    icon={<IconAlertCircle size={20} />}
                    title="Movimientos de caja pendientes de validación"
                >
                    Existen <b>{resumenApertura.movimientosPendientes} movimiento(s)</b> de este turno en estado PENDIENTE.
                    Por políticas de control financiero, debe validar todos los movimientos en el módulo de <b>Movimientos de Caja</b> antes de realizar el corte.
                </Alert>
            )}

            {/* Cabecera y botón Ver Detalle de Ventas */}
            <Box>
                <Group justify="space-between" align="center" style={sectionHeader}>
                    <Group gap="xs">
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconCalculator size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos del arqueo</Title>
                    </Group>
                    <Button
                        variant="light"
                        color="apex"
                        size="xs"
                        radius="md"
                        leftSection={<IconReportAnalytics size={16} />}
                        onClick={() => setModalVentasAbierto(true)}
                    >
                        Ver detalle de ventas
                    </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <NativeSelect
                        label="Apertura de Caja"
                        withAsterisk
                        value={form.aperturaCajaId ?? ''}
                        error={errors.aperturaCajaId}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
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
            </Box>

            {/* ── ARQUEO DE BILLETES: Izquierda (Inicio) vs Derecha (Cierre) ── */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" color="apex">
                        <IconCoins size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Conteo y Arqueo de Efectivo</Title>
                </div>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    {/* ── Columna Izquierda: Billetes de Inicio del Día ── */}
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
                                    <Table.Th style={{ textAlign: 'center' }}>Cantidad</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {DENOMINACIONES.map((d) => {
                                    const cant = desgloseInicio[d.valor] ?? 0;
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

                        <Paper p="xs" radius="md" mt="md" withBorder style={{ backgroundColor: '#e8f4fd' }}>
                            <Group justify="space-between">
                                <Text fw={700} size="xs" c="blue">TOTAL FONDO INICIAL</Text>
                                <Text fw={800} size="sm" c="blue">${fondoInicial.toFixed(2)}</Text>
                            </Group>
                        </Paper>
                    </Paper>

                    {/* ── Columna Derecha: Billetes de Fin del Día ── */}
                    <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fffdfa', borderColor: '#ffd8a8' }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <ThemeIcon size="sm" radius="md" variant="light" color="apex">
                                    <IconCalculator size={14} />
                                </ThemeIcon>
                                <Text fw={700} size="sm" c="#FF6A00">
                                    Billetes con los que acaba el día
                                </Text>
                            </Group>
                            <Badge color="apex" variant="filled">
                                Arqueo Final
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
                                    const cantStr = conteoCierre[d.valor] ?? '';
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
                                                    onChange={(v) => actualizarConteoCierre(d.valor, v)}
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

                        {/* Totales y Cálculo de Diferencia en Vivo con Desglose Completo */}
                        <Paper p="sm" radius="md" mt="md" withBorder style={{ backgroundColor: '#fff9f5', borderColor: '#FF6A00' }}>
                            <Stack gap={6}>
                                <Text fw={700} size="xs" c="dimmed" tt="uppercase">
                                    Balance Teórico del Turno
                                </Text>
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
                                {errors.efectivoContado && (
                                    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="filled" p="xs" radius="sm">
                                        <Text size="xs" fw={700}>{errors.efectivoContado}</Text>
                                    </Alert>
                                )}
                                <Group justify="space-between">
                                    <Text fw={700} size="sm" c="#FF6A00">EFECTIVO CONTADO (FÍSICO):</Text>
                                    <Text fw={800} size="md" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                                </Group>
                                <Divider my={2} />
                                <Group justify="space-between">
                                    <Text fw={700} size="xs" c={Math.abs(diferencia) < 0.01 ? 'blue' : (diferencia > 0 ? 'green' : 'red')}>
                                        {Math.abs(diferencia) < 0.01
                                            ? 'Caja Cuadrada (Sin diferencia):'
                                            : (diferencia > 0 ? 'Sobrante en Caja (+):' : 'Faltante en Caja (-):')}
                                    </Text>
                                    <Text fw={800} size="sm" c={Math.abs(diferencia) < 0.01 ? 'blue' : (diferencia > 0 ? 'green' : 'red')}>
                                        {diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)}
                                    </Text>
                                </Group>

                                {Math.abs(diferencia) > 0.01 && (
                                    <Alert
                                        icon={<IconAlertCircle size={16} />}
                                        color={diferencia < 0 ? 'red' : 'yellow'}
                                        variant="light"
                                        p="xs"
                                        radius="sm"
                                    >
                                        <Text size="xs" fw={600}>
                                            {diferencia < 0
                                                ? `Se detectó un faltante de $${Math.abs(diferencia).toFixed(2)}. Es obligatorio justificar el motivo en el campo de observaciones.`
                                                : `Se detectó un sobrante de $${diferencia.toFixed(2)}. Es obligatorio justificar el motivo en el campo de observaciones.`}
                                        </Text>
                                    </Alert>
                                )}
                            </Stack>
                        </Paper>
                    </Paper>
                </SimpleGrid>
            </Box>

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

            {/* Banner de errores visibles para evitar cualquier error oculto */}
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

/* ─── Componente Principal ──────────────────────────────────────────────────── */
export function CorteCaja() {
    const [corteSeleccionado, setCorteSeleccionado] = useState(null);
    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

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
            errors.efectivoContado = 'El efectivo contado debe ser mayor o igual a 0';
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
            } catch (e) {
                // Validación respaldada en backend
            }
        }

        if (form.observaciones?.trim().length > 500) {
            errors.observaciones = 'Las observaciones no pueden exceder 500 caracteres';
        }

        return errors;
    };

    return (
        <>
            <ModalDetalleCorte
                corte={corteSeleccionado}
                opened={modalDetalleAbierto}
                onClose={() => setModalDetalleAbierto(false)}
                onValidar={(corte) => handleValidar(corte, { reload: () => window.location.reload() })}
            />

            <CrudCatalogo
                titulo="Corte de Caja"
                singular="Corte"
                icon={IconCalculator}
                servicio={api.corteCaja}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={INICIAL}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderForm={(props) => <CorteForm {...props} />}
                validateForm={validateForm}
                permitirEditar={false}
                permitirEliminar={false}
                renderAccionesFila={(fila, recordOriginal, helpers = {}) => {
                    const reload = helpers?.reload;
                    const corte = recordOriginal ?? fila?._recordOriginal ?? fila;
                    const esValidado = corte?.estado === 'VALIDADO';

                    return (
                        <Group gap={6} wrap="nowrap">
                            {/* 1. Ver Detalle con KPIs y Movimientos */}
                            <Tooltip label="Ver detalle y auditoría" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    onClick={() => {
                                        setCorteSeleccionado(corte);
                                        setModalDetalleAbierto(true);
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

                            {/* 3. Descargar PDF (Solo si el corte está VALIDADO) */}
                            <Tooltip
                                label={!esValidado ? 'Debe validar el corte para descargar el comprobante en PDF' : 'Descargar comprobante en PDF'}
                                withArrow
                                openDelay={200}
                            >
                                <span style={{ display: 'inline-block' }}>
                                    <ActionIcon
                                        variant="light"
                                        color={esValidado ? 'apex' : 'gray'}
                                        size="lg"
                                        disabled={!esValidado}
                                        onClick={async () => {
                                            if (!esValidado) return;
                                            let movs = [];
                                            const aperturaId = corte?.aperturaCajaId ?? corte?.aperturaCaja?.id;
                                            if (aperturaId) {
                                                try {
                                                    const r = await api.movimientoCaja.obtenerPorApertura(aperturaId);
                                                    if (r.responseFlag === 0) movs = r.data ?? [];
                                                } catch (e) {}
                                            }

                                            let desglose = null;
                                            try {
                                                if (corte?.desgloseFin) {
                                                    desglose = typeof corte.desgloseFin === 'string'
                                                        ? JSON.parse(corte.desgloseFin)
                                                        : corte.desgloseFin;
                                                }
                                            } catch (e) {}

                                            let configuraciones = [];
                                            try {
                                                const resConfig = await api.configuracionSistema.obtenerTodos();
                                                if (resConfig.responseFlag === 0) configuraciones = resConfig.data ?? [];
                                            } catch (e) {}

                                            generarPdfCorte(corte, movs, desglose, configuraciones);
                                        }}
                                    >
                                        <IconFileDownload size={18} stroke={1.8} />
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

export default CorteCaja;
