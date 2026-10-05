/**
 * Sistema: ApexGym Frontend
 * Modificación: 01/10/2026 - Emmanuelle Hernández Oropeza
 * Descripción: Control operativo de caja: arqueo de billetes interactivo en 2 columnas,
 *              modal de detalle de ventas, KPIs y movimientos de corte, validación de corte,
 *              generación de reporte PDF de auditoría y restricciones de edición/eliminación.
 */
import { useEffect, useMemo, useState } from 'react';
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
    { key: 'efectivoContado', label: 'Efectivo Contado', required: true, type: 'number' },
    { key: 'observaciones',   label: 'Observaciones' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
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

/* ─── Modal 1: Detalle de Ventas del Turno (Puro Diseño) ─────────────────────── */
function ModalDetalleVentas({ opened, onClose, aperturaId }) {
    const totalVentas = 15840.0;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size="md" radius="md" style={{ backgroundColor: '#fff0e6', color: '#FF6A00' }}>
                        <IconReportAnalytics size={18} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Detalle de Ventas y Métodos de Pago del Turno</Title>
                </Group>
            }
            size="lg"
            radius="md"
        >
            <Stack gap="md">
                {/* Tarjetas KPI Superiores */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fff9f5', borderColor: '#FF6A00' }}>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Ventas</Text>
                        <Text fw={800} size="xl" c="#FF6A00">$15,840.00</Text>
                        <Text size="xs" c="dimmed" mt={2}>Turno actual</Text>
                    </Paper>
                    <Paper p="sm" radius="md" withBorder>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">Transacciones</Text>
                        <Text fw={800} size="xl" c="dark">38</Text>
                        <Text size="xs" c="dimmed" mt={2}>Tickets generados</Text>
                    </Paper>
                    <Paper p="sm" radius="md" withBorder>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">Ticket Promedio</Text>
                        <Text fw={800} size="xl" c="dark">$416.84</Text>
                        <Text size="xs" c="dimmed" mt={2}>Por cliente</Text>
                    </Paper>
                </SimpleGrid>

                <Divider label="Desglose por Tipo de Pago" labelPosition="left" />

                {/* Métodos de Pago */}
                <Stack gap="sm">
                    {/* Efectivo */}
                    <Paper p="sm" radius="md" withBorder>
                        <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                                <ThemeIcon color="green" variant="light" radius="md" size="sm">
                                    <IconCash size={16} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Efectivo en Caja</Text>
                            </Group>
                            <Group gap="xs">
                                <Badge color="green" variant="light">24 transacciones</Badge>
                                <Text fw={700} size="sm">$9,240.00 (58.3%)</Text>
                            </Group>
                        </Group>
                        <Progress value={58.3} color="green" size="sm" radius="xl" />
                    </Paper>

                    {/* Tarjeta Débito */}
                    <Paper p="sm" radius="md" withBorder>
                        <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                                <ThemeIcon color="blue" variant="light" radius="md" size="sm">
                                    <IconCreditCard size={16} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Tarjeta de Débito (Terminal)</Text>
                            </Group>
                            <Group gap="xs">
                                <Badge color="blue" variant="light">8 transacciones</Badge>
                                <Text fw={700} size="sm">$3,900.00 (24.6%)</Text>
                            </Group>
                        </Group>
                        <Progress value={24.6} color="blue" size="sm" radius="xl" />
                    </Paper>

                    {/* Tarjeta Crédito */}
                    <Paper p="sm" radius="md" withBorder>
                        <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                                <ThemeIcon color="indigo" variant="light" radius="md" size="sm">
                                    <IconCreditCard size={16} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Tarjeta de Crédito</Text>
                            </Group>
                            <Group gap="xs">
                                <Badge color="indigo" variant="light">4 transacciones</Badge>
                                <Text fw={700} size="sm">$1,850.00 (11.7%)</Text>
                            </Group>
                        </Group>
                        <Progress value={11.7} color="indigo" size="sm" radius="xl" />
                    </Paper>

                    {/* Transferencia */}
                    <Paper p="sm" radius="md" withBorder>
                        <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                                <ThemeIcon color="cyan" variant="light" radius="md" size="sm">
                                    <IconDeviceMobile size={16} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Transferencia / SPEI</Text>
                            </Group>
                            <Group gap="xs">
                                <Badge color="cyan" variant="light">2 transacciones</Badge>
                                <Text fw={700} size="sm">$850.00 (5.4%)</Text>
                            </Group>
                        </Group>
                        <Progress value={5.4} color="cyan" size="sm" radius="xl" />
                    </Paper>
                </Stack>

                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={onClose}>
                        Cerrar
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

/* ─── Modal 2: Detalle y Auditoría del Corte de Caja (KPIs + Movimientos) ────── */
function ModalDetalleCorte({ corte, opened, onClose, onValidar }) {
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!corte?.aperturaCajaId || !opened) return;
        setCargando(true);
        api.movimientoCaja
            .obtenerPorApertura(corte.aperturaCajaId)
            .then((r) => {
                if (r.responseFlag === 0) setMovimientos(r.data ?? []);
            })
            .catch(() => setMovimientos([]))
            .finally(() => setCargando(false));
    }, [corte?.aperturaCajaId, opened]);

    if (!corte) return null;

    const montoInicial = Number(corte.aperturaCaja?.montoInicial ?? 0);
    const totalEntradas = Number(corte.totalEntradas ?? 0);
    const totalSalidas = Number(corte.totalSalidas ?? 0);
    const efectivoEsperado = montoInicial + totalEntradas - totalSalidas;
    const efectivoContado = Number(corte.efectivoContado ?? 0);
    const diferencia = Number(corte.diferencia ?? 0);
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
            size="xl"
            radius="md"
            title={
                <Group gap="xs">
                    <ThemeIcon size="md" radius="md" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconReportAnalytics size={18} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={4}>Auditoría de Corte de Caja #{corte.id}</Title>
                    <Badge color={esValidado ? 'green' : 'yellow'} variant="filled" size="md">
                        {corte.estado ?? 'PENDIENTE'}
                    </Badge>
                </Group>
            }
        >
            <Stack gap="md">
                {/* ── KPIs Principales del Corte ───────────────────────────── */}
                <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="xs">
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
                    <Button
                        variant="light"
                        color="apex"
                        leftSection={<IconFileDownload size={16} />}
                        onClick={() => generarPdfCorte(corte, movimientos, desgloseFin)}
                    >
                        Descargar PDF
                    </Button>

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
        </Modal>
    );
}

/* ─── Formulario de Arqueo (Billetes Inicio Izquierda / Cierre Derecha) ─────── */
function CorteForm({ form, errors, onChange, fieldOptions }) {
    const [modalVentasAbierto, setModalVentasAbierto] = useState(false);
    const [resumenApertura, setResumenApertura] = useState(null);

    // Estado local para conteo de billetes de cierre
    const [conteoCierre, setConteoCierre] = useState(() => {
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

    // Calcular desglose de inicio a partir del monto inicial
    const desgloseInicio = useMemo(() => {
        const monto = resumenApertura ? Number(resumenApertura.montoInicial ?? 0) : 0;
        return desglosarMonto(monto);
    }, [resumenApertura]);

    // Recalcular efectivo contado a partir del conteo de cierre
    const actualizarConteoCierre = (valor, cantidad) => {
        const cant = cantidad === '' || isNaN(Number(cantidad)) ? 0 : Math.max(0, Math.floor(Number(cantidad)));
        const nuevoConteo = { ...conteoCierre, [valor]: cantidad };
        setConteoCierre(nuevoConteo);

        // Sumar total
        let total = 0;
        for (const d of DENOMINACIONES) {
            const c = nuevoConteo[d.valor] === '' ? 0 : Number(nuevoConteo[d.valor]);
            total += d.valor * c;
        }
        total = Math.round(total * 100) / 100;
        onChange('efectivoContado', total);
        onChange('desgloseFin', nuevoConteo);
        onChange('desgloseInicio', desgloseInicio);
    };

    const fondoInicial = resumenApertura ? Number(resumenApertura.montoInicial ?? 0) : 0;
    const totalEntradas = resumenApertura ? Number(resumenApertura.totalEntradas ?? 0) : 0;
    const totalSalidas = resumenApertura ? Number(resumenApertura.totalSalidas ?? 0) : 0;
    const efectivoEsperado = fondoInicial + totalEntradas - totalSalidas;
    const efectivoContado = Number(form.efectivoContado || 0);
    const diferencia = efectivoContado - efectivoEsperado;

    return (
        <Stack gap="md">
            <ModalDetalleVentas
                opened={modalVentasAbierto}
                onClose={() => setModalVentasAbierto(false)}
                aperturaId={form.aperturaCajaId}
            />

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
                            <Text fw={700} size="sm" c="dimmed">
                                💵 Billetes de inicio (Fondo del día)
                            </Text>
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
                            <Text fw={700} size="sm" c="#FF6A00">
                                🧮 Billetes con los que acaba el día
                            </Text>
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

                        {/* Totales y Cálculo de Diferencia en Vivo */}
                        <Paper p="xs" radius="md" mt="md" withBorder style={{ backgroundColor: '#fff9f5', borderColor: '#FF6A00' }}>
                            <Stack gap={4}>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed">Efectivo Teórico Esperado:</Text>
                                    <Text fw={600} size="xs">${efectivoEsperado.toFixed(2)}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text fw={700} size="sm" c="#FF6A00">EFECTIVO CONTADO:</Text>
                                    <Text fw={800} size="md" c="#FF6A00">${efectivoContado.toFixed(2)}</Text>
                                </Group>
                                <Divider my={2} />
                                <Group justify="space-between">
                                    <Text fw={700} size="xs" c={diferencia >= 0 ? 'green' : 'red'}>
                                        {diferencia >= 0 ? 'Sobrante / Cuadrado:' : 'Faltante en Caja:'}
                                    </Text>
                                    <Text fw={800} size="sm" c={diferencia >= 0 ? 'green' : 'red'}>
                                        {diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)}
                                    </Text>
                                </Group>
                            </Stack>
                        </Paper>
                    </Paper>
                </SimpleGrid>
            </Box>

            {/* Observaciones */}
            <Textarea
                label="Observaciones del corte"
                placeholder="Notas o incidencias del turno (opcional)"
                value={form.observaciones ?? ''}
                error={errors.observaciones}
                size="md"
                radius="md"
                minRows={2}
                onChange={(e) => onChange('observaciones', e.currentTarget.value)}
            />
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

    const handleValidar = async (corte, { reload }) => {
        try {
            const res = await api.corteCaja.validar(corte.id);
            if (res.responseFlag === 0) {
                notifications.show({
                    title: 'Corte Validado',
                    message: `El corte #${corte.id} ha sido validado y auditado correctamente.`,
                    color: 'green',
                    icon: <IconShieldCheck size={18} />,
                });
                reload?.();
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
                permitirEditar={false}
                permitirEliminar={false}
                renderAccionesFila={(fila, recordOriginal, { reload }) => {
                    const esValidado = recordOriginal?.estado === 'VALIDADO';

                    return (
                        <Group gap={6} wrap="nowrap">
                            {/* 1. Ver Detalle con KPIs y Movimientos */}
                            <Tooltip label="Ver detalle y auditoría" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    onClick={() => {
                                        setCorteSeleccionado(recordOriginal);
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
                                <ActionIcon
                                    variant={esValidado ? 'subtle' : 'light'}
                                    color={esValidado ? 'gray' : 'green'}
                                    size="lg"
                                    disabled={esValidado}
                                    onClick={() => handleValidar(recordOriginal, { reload })}
                                >
                                    {esValidado ? <IconCheck size={18} stroke={2} /> : <IconShieldCheck size={18} stroke={1.8} />}
                                </ActionIcon>
                            </Tooltip>

                            {/* 3. Descargar PDF */}
                            <Tooltip label="Descargar comprobante en PDF" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="apex"
                                    size="lg"
                                    onClick={async () => {
                                        let movs = [];
                                        try {
                                            const r = await api.movimientoCaja.obtenerPorApertura(recordOriginal.aperturaCajaId);
                                            if (r.responseFlag === 0) movs = r.data ?? [];
                                        } catch (e) {}

                                        let desglose = null;
                                        try {
                                            if (recordOriginal.desgloseFin) desglose = JSON.parse(recordOriginal.desgloseFin);
                                        } catch (e) {}

                                        generarPdfCorte(recordOriginal, movs, desglose);
                                    }}
                                >
                                    <IconFileDownload size={18} stroke={1.8} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    );
                }}
            />
        </>
    );
}

export default CorteCaja;
