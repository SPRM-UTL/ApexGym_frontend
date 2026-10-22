/**
 * Issue: [CAJA-04] Frontend: Pantalla e interfaz operativa de Movimientos de Caja #89
 * Parent: Control Operativo de Caja, Auditoria Contable y Reporte de Corte en PDF #85
 *
 * Tareas:
 * - Formulario para capturar concepto desde catálogo, tipo (entrada/salida), monto y empleado responsable.
 * - Desglose físico de billetes y monedas para ingresos y egresos.
 * - Validación de apertura abierta para validar movimientos.
 * - Inclusión de número de apertura en tabla.
 * - Visualizacion del balance de movimientos del turno en tiempo real.
 */
import { useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Group,
    NativeSelect,
    NumberInput,
    Paper,
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
    IconCash,
    IconCheck,
    IconCoins,
    IconEdit,
    IconInfoCircle,
    IconShieldCheck,
    IconTrash,
    IconUser,
    IconWallet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Catálogo oficial de tipos de concepto por movimiento ──────────────────── */
const CATALOGO_CONCEPTOS = {
    ENTRADA: [
        'Ingreso manual de efectivo',
        'Dotación de cambio / morralla inicial',
        'Cobro de servicio extraordinario',
        'Reembolso / Devolución a caja',
        'Aporte extraordinario del encargado',
        'Otro concepto de ingreso',
    ],
    SALIDA: [
        'Retiro de seguridad',
        'Pago a proveedores',
        'Compra de insumos de limpieza y mantenimiento',
        'Pago de servicios básicos (agua, luz, internet)',
        'Gasto menor / Caja chica',
        'Anticipo de sueldo / Viáticos',
        'Devolución a cliente',
        'Otro concepto de retiro',
    ],
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
        key: 'aperturaCajaId',
        label: 'Apertura de Caja',
        required: true,
        loadOptions: async () => {
            try {
                const r = await api.aperturaCaja.obtenerTodos();
                return (r?.data ?? [])
                    .filter((a) => a.estado === 'ABIERTA')
                    .map((a) => ({
                        value: String(a.id),
                        label: `#${a.id} — ${a.caja?.nombre ?? 'Caja'} — Fondo: $${Number(a.montoInicial).toFixed(2)}`,
                    }));
            } catch (err) {
                console.error('Error cargando aperturas:', err);
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
                console.error('Error cargando empleados:', err);
                return [];
            }
        },
    },
    {
        key: 'tipo',
        label: 'Tipo',
        required: true,
        options: [
            { value: 'ENTRADA', label: 'Entrada' },
            { value: 'SALIDA', label: 'Salida' },
        ],
    },
    { key: 'monto',         label: 'Monto',            required: true, type: 'number', min: 0.01, max: 50000 },
    { key: 'concepto',      label: 'Tipo de Concepto', required: true, maxLength: 255 },
    { key: 'observaciones', label: 'Observaciones',    maxLength: 500 },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'numero',    label: '#',         sortable: true, filterable: true },
    { key: 'apertura',  label: 'Apertura',  sortable: true, filterable: true },
    { key: 'empleado',  label: 'Empleado',  sortable: true, filterable: true },
    { key: 'tipo',      label: 'Tipo',      sortable: true, filterable: true },
    { key: 'monto',     label: 'Monto',     sortable: true, filterable: true },
    { key: 'concepto',  label: 'Concepto',  sortable: true, filterable: true },
    { key: 'estado',    label: 'Estado',    sortable: true, filterable: true },
];

const INICIAL = {
    aperturaCajaId: '',
    empleadoId: '',
    tipo: 'ENTRADA',
    monto: '',
    concepto: '',
    desglose: null,
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
 * Normaliza el objeto de desglose asegurando que todas las denominaciones
 * existan con valores numéricos limpios o cadena vacía, evitando undefined y NaN.
 */
function normalizarDesglose(desglose) {
    const init = {};
    for (const d of DENOMINACIONES) {
        if (desglose && typeof desglose === 'object' && desglose[d.valor] !== undefined && desglose[d.valor] !== null && desglose[d.valor] !== '') {
            const num = Number(desglose[d.valor]);
            init[d.valor] = isNaN(num) ? '' : num;
        } else {
            init[d.valor] = '';
        }
    }
    return init;
}

/* ─── Formulario personalizado ──────────────────────────────────────────────── */
function MovimientoForm({ form, errors, onChange, fieldOptions }) {
    const [resumen, setResumen] = useState(null);

    // Conteo de billetes normalizado
    const [conteoBilletes, setConteoBilletes] = useState(() => normalizarDesglose(form.desglose));

    // Mantener conteo en sincronía si cambia externamente form.desglose
    useEffect(() => {
        setConteoBilletes(normalizarDesglose(form.desglose));
    }, [form.desglose]);

    // Función segura para obtener la cantidad numérica de una denominación
    const obtenerCantidad = (val) => {
        const raw = conteoBilletes?.[val];
        if (raw === '' || raw === null || raw === undefined) return 0;
        const n = Number(raw);
        return isNaN(n) ? 0 : n;
    };

    useEffect(() => {
        if (!form.aperturaCajaId) {
            setResumen(null);
            return;
        }

        let isMounted = true;
        api.movimientoCaja
            .obtenerResumenApertura(form.aperturaCajaId)
            .then((res) => {
                if (isMounted && res.responseFlag === 0) {
                    setResumen(res.data);
                }
            })
            .catch(() => {
                if (isMounted) setResumen(null);
            });

        return () => {
            isMounted = false;
        };
    }, [form.aperturaCajaId]);

    const saldoDisponible = resumen ? Number(resumen.saldoDisponible ?? 0) : null;
    const esSalida = form.tipo === 'SALIDA';
    const montoUsuario = Number(form.monto || 0);
    const superaSaldo = esSalida && saldoDisponible !== null && montoUsuario > saldoDisponible;

    // Total acumulado actual del desglose de efectivo
    const totalDesglose = useMemo(() => {
        let total = 0;
        for (const d of DENOMINACIONES) {
            total += d.valor * obtenerCantidad(d.valor);
        }
        return Math.round(total * 100) / 100;
    }, [conteoBilletes]);

    const desgloseExcedeMonto = montoUsuario > 0 && totalDesglose > montoUsuario;

    // Calcula el subtotal de todas las demás denominaciones excepto la indicada
    const calcularTotalOtras = (valorActual) => {
        let sum = 0;
        for (const item of DENOMINACIONES) {
            if (item.valor !== valorActual) {
                sum += item.valor * obtenerCantidad(item.valor);
            }
        }
        return Math.round(sum * 100) / 100;
    };

    // Calcula la cantidad máxima permitida para una denominación específica según el monto ingresado
    const maxCantidadPermitida = (valor) => {
        if (!montoUsuario || montoUsuario <= 0 || isNaN(montoUsuario)) return 500;
        const totalOtras = calcularTotalOtras(valor);
        const restante = Math.max(0, Math.round((montoUsuario - totalOtras) * 100) / 100);
        return Math.floor(restante / valor);
    };

    // Manejar cambio en conteo de denominaciones
    const actualizarDenominacion = (valor, cantidad) => {
        let cant = 0;
        if (cantidad !== '' && cantidad !== null && cantidad !== undefined && !isNaN(Number(cantidad))) {
            cant = Math.max(0, Math.floor(Number(cantidad)));
        }

        // Si el usuario ingresó una cantidad en Monto, los billetes/monedas NO deben superar ese monto
        if (montoUsuario > 0) {
            const maxPermitido = maxCantidadPermitida(valor);
            cant = Math.min(cant, maxPermitido);
        } else {
            cant = Math.min(cant, 500);
        }

        const valToStore = (cantidad === '' || cantidad === null || cantidad === undefined) ? '' : cant;
        const nuevoConteo = { ...conteoBilletes, [valor]: valToStore };
        setConteoBilletes(nuevoConteo);

        let total = 0;
        for (const d of DENOMINACIONES) {
            const raw = nuevoConteo[d.valor];
            const c = (raw === '' || raw === null || raw === undefined) ? 0 : Number(raw) || 0;
            total += d.valor * c;
        }
        total = Math.round(total * 100) / 100;

        onChange('desglose', nuevoConteo);

        // Si el usuario NO había ingresado un monto previamente, el desglose llena el monto automáticamente.
        // Si ya había ingresado un monto, NO se sobreescribe para respetar la cantidad que puso.
        if (montoUsuario <= 0 && (total > 0 || Object.values(nuevoConteo).some((v) => v !== '' && Number(v) > 0))) {
            onChange('monto', total);
        }
    };

    const limpiarDesglose = () => {
        const init = normalizarDesglose(null);
        setConteoBilletes(init);
        onChange('desglose', null);
    };

    const opcionesConceptos = (CATALOGO_CONCEPTOS[form.tipo] || CATALOGO_CONCEPTOS.ENTRADA).map((c) => ({
        value: c,
        label: c,
    }));

    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconArrowsExchange size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Detalle del movimiento</Title>
                </div>

                {/* Banner de Saldo Disponible en Tiempo Real */}
                {resumen && (
                    <Paper
                        p="sm"
                        radius="md"
                        mb="md"
                        withBorder
                        style={{
                            backgroundColor: superaSaldo ? '#fff5f5' : '#f8f9fa',
                            borderColor: superaSaldo ? '#fa5252' : '#dee2e6',
                        }}
                    >
                        <Group justify="space-between" align="center">
                            <Group gap="xs">
                                <ThemeIcon color={superaSaldo ? 'red' : 'blue'} variant="light" radius="md">
                                    <IconWallet size={18} />
                                </ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed">Saldo disponible actual en caja</Text>
                                    <Text fw={700} size="md" c={superaSaldo ? 'red' : 'dark'}>
                                        ${saldoDisponible.toFixed(2)}
                                    </Text>
                                </div>
                            </Group>
                            <Group gap="xs">
                                <Badge variant="outline" color="gray" size="sm">Fondo: ${Number(resumen.montoInicial).toFixed(2)}</Badge>
                                <Badge variant="outline" color="green" size="sm">Entradas: +${Number(resumen.totalEntradas).toFixed(2)}</Badge>
                                <Badge variant="outline" color="red" size="sm">Salidas: -${Number(resumen.totalSalidas).toFixed(2)}</Badge>
                            </Group>
                        </Group>
                    </Paper>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    {/* Col 1 */}
                    <NativeSelect
                        label="Apertura de Caja"
                        withAsterisk
                        value={form.aperturaCajaId ?? ''}
                        error={errors.aperturaCajaId}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        data={[{ value: '', label: 'Selecciona una apertura' }, ...(fieldOptions.aperturaCajaId ?? [])]}
                        onChange={(e) => onChange('aperturaCajaId', e.currentTarget.value)}
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
                    <NativeSelect
                        label="Tipo de Movimiento"
                        withAsterisk
                        value={form.tipo ?? 'ENTRADA'}
                        error={errors.tipo}
                        size="md"
                        radius="md"
                        leftSection={<IconArrowsExchange size={16} stroke={1.5} />}
                        data={[
                            { value: 'ENTRADA', label: 'Entrada (Ingreso manual)' },
                            { value: 'SALIDA',  label: 'Salida (Retiro / Gasto menor)'  },
                        ]}
                        onChange={(e) => {
                            const nuevoTipo = e.currentTarget.value;
                            onChange('tipo', nuevoTipo);
                            onChange('concepto', '');
                        }}
                    />
                    <NumberInput
                        label="Monto"
                        withAsterisk
                        prefix="$"
                        min={0.01}
                        max={50000}
                        decimalScale={2}
                        clampBehavior="strict"
                        placeholder="Ej. $500.00 (Máx. $50,000.00)"
                        description="Límite máximo por movimiento: $50,000.00"
                        value={form.monto ?? ''}
                        error={
                            superaSaldo
                                ? `Supera el saldo disponible (${saldoDisponible.toFixed(2)})`
                                : (desgloseExcedeMonto
                                    ? `El total de billetes/monedas ($${totalDesglose.toFixed(2)}) supera este monto`
                                    : errors.monto)
                        }
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        onChange={(v) => onChange('monto', v)}
                    />

                    {/* Alerta de exceso de retiro */}
                    {superaSaldo && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Operación no permitida"
                            color="red"
                            radius="md"
                            style={{ gridColumn: '1 / -1' }}
                        >
                            No puedes retirar más dinero del que realmente hay en la caja. El saldo disponible es de <b>${saldoDisponible.toFixed(2)}</b>.
                        </Alert>
                    )}

                    {/* Full width — Tipo de Concepto (Catálogo) */}
                    <NativeSelect
                        label="Tipo de Concepto (Catálogo)"
                        withAsterisk
                        value={form.concepto ?? ''}
                        error={errors.concepto}
                        size="md"
                        radius="md"
                        leftSection={<IconInfoCircle size={16} stroke={1.5} />}
                        style={{ gridColumn: '1 / -1' }}
                        data={[
                            { value: '', label: 'Selecciona un concepto del catálogo' },
                            ...opcionesConceptos,
                            ...(form.concepto && !opcionesConceptos.some((o) => o.value === form.concepto)
                                ? [{ value: form.concepto, label: form.concepto }]
                                : []),
                        ]}
                        onChange={(e) => onChange('concepto', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>

            {/* ── Billetes de Ingreso / Egreso (Desglose de Efectivo) ── */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" color="apex">
                        <IconCoins size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>
                        Billetes y monedas de {form.tipo === 'ENTRADA' ? 'ingreso' : 'egreso'}
                    </Title>
                </div>

                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fffdfa' }}>
                    <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
                        <Text size="xs" c="dimmed">
                            {montoUsuario > 0
                                ? `Desglose de efectivo para el monto de $${montoUsuario.toFixed(2)}. La suma no puede superar el monto.`
                                : 'Captura la cantidad de billetes y monedas que componen este movimiento.'}
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
                            title="Desglose excede el monto ingresado"
                            color="red"
                            variant="light"
                            radius="sm"
                            p="xs"
                            mb="xs"
                        >
                            <Text size="xs">
                                El desglose (${totalDesglose.toFixed(2)}) supera el monto establecido (${montoUsuario.toFixed(2)}). Reduce las cantidades de billetes o limpia el desglose.
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
                                const cantNum = obtenerCantidad(d.valor);
                                const cantStr = (conteoBilletes?.[d.valor] === '' || conteoBilletes?.[d.valor] === undefined) ? '' : cantNum;
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

            {/* Full width — observaciones */}
            <Textarea
                label="Observaciones"
                placeholder="Observaciones adicionales"
                value={form.observaciones ?? ''}
                error={errors.observaciones}
                maxLength={500}
                description="Máximo 500 caracteres"
                size="md"
                radius="md"
                minRows={2}
                onChange={(e) => onChange('observaciones', e.currentTarget.value)}
            />

            {/* Banner de errores para evitar cualquier error invisible */}
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
export function MovimientosCaja() {
    const mapRecordToForm = useMemo(() => (record) => {
        let desglose = null;
        let obsLimpia = record.observaciones ? String(record.observaciones).trim() : '';

        // 1. Obtener desglose de record.desglose si existe
        if (record.desglose) {
            try {
                desglose = typeof record.desglose === 'string'
                    ? JSON.parse(record.desglose)
                    : record.desglose;
            } catch (e) {}
        }

        // 2. Si no venía en record.desglose o venía concatenado en observaciones
        if (obsLimpia && obsLimpia.includes('Desglose: {')) {
            const parts = obsLimpia.split(/\|\s*Desglose:\s*|Desglose:\s*/i);
            if (parts[1] && !desglose) {
                const match = parts[1].match(/^\{.*?\}/);
                if (match) {
                    try {
                        desglose = JSON.parse(match[0]);
                    } catch (e) {}
                }
            }
            obsLimpia = (parts[0]?.trim()) || '';
        } else if (obsLimpia.startsWith('{') && obsLimpia.endsWith('}')) {
            try {
                const parsed = JSON.parse(obsLimpia);
                if (parsed.desglose) {
                    if (!desglose) desglose = parsed.desglose;
                    obsLimpia = parsed.observaciones ?? '';
                }
            } catch (e) {}
        }

        // Limpiar cualquier residuo de formato anterior o JSON entre llaves
        obsLimpia = obsLimpia
            .replace(/\s*\|\s*Desglose:\s*\{.*?\}\s*/gi, '')
            .replace(/^Desglose:\s*\{.*?\}\s*/gi, '')
            .trim();

        return {
            aperturaCajaId: record.aperturaCaja?.id
                ? String(record.aperturaCaja.id)
                : String(record.aperturaCajaId ?? ''),
            empleadoId: record.empleado?.id
                ? String(record.empleado.id)
                : String(record.empleadoId ?? ''),
            tipo:          record.tipo          ?? 'ENTRADA',
            monto:         record.monto         ?? '',
            concepto:      record.concepto      ?? '',
            desglose:      desglose             ?? null,
            observaciones: obsLimpia,
        };
    }, []);

    const mapFormToPayload = (form) => {
        let obsFinal = form.observaciones ? String(form.observaciones).trim() : '';
        obsFinal = obsFinal
            .replace(/\s*\|\s*Desglose:\s*\{.*?\}\s*/gi, '')
            .replace(/^Desglose:\s*\{.*?\}\s*/gi, '')
            .trim();

        const desgloseClean = {};
        if (form.desglose && typeof form.desglose === 'object') {
            for (const [k, v] of Object.entries(form.desglose)) {
                if (v !== '' && v !== null && v !== undefined && Number(v) > 0) {
                    desgloseClean[k] = Number(v);
                }
            }
        }

        const tieneDesglose = Object.keys(desgloseClean).length > 0;

        return {
            aperturaCajaId: Number(form.aperturaCajaId),
            empleadoId:     Number(form.empleadoId),
            tipo:           form.tipo,
            monto:          Number(form.monto),
            concepto:       form.concepto,
            desglose:       tieneDesglose ? desgloseClean : null,
            observaciones:  obsFinal || null,
        };
    };

    const mapRecordToRow = (record) => {
        const apertura = record.aperturaCaja;
        const aperturaLabel = apertura
            ? `#${apertura.id} — ${apertura.caja?.nombre ?? 'Caja'} — ${apertura.fechaApertura ? new Date(apertura.fechaApertura).toLocaleDateString('es-MX') : ''}`
            : '—';
        const esValidado = record.estado === 'VALIDADO';

        return {
            id:       record.id,
            numero: (
                <Badge variant="light" color="gray" size="sm" radius="sm">
                    #{record.id}
                </Badge>
            ),
            apertura: aperturaLabel,
            empleado: record.empleado
                ? `${record.empleado.nombre} ${record.empleado.apellidoPaterno}`
                : '—',
            tipo: (
                <Badge color={record.tipo === 'ENTRADA' ? 'green' : 'red'} variant="light">
                    {record.tipo ?? '—'}
                </Badge>
            ),
            monto:    `$${Number(record.monto ?? 0).toFixed(2)}`,
            concepto: record.concepto ?? '—',
            estado: (
                <Badge color={esValidado ? 'green' : 'yellow'} variant="light">
                    {record.estado ?? 'PENDIENTE'}
                </Badge>
            ),
        };
    };

    const handleValidar = async (movimiento, helpers = {}) => {
        const reload = helpers?.reload;
        if (!movimiento?.id) return;
        try {
            const res = await api.movimientoCaja.validar(movimiento.id);
            if (res.responseFlag === 0) {
                notifications.show({
                    title: 'Movimiento Validado',
                    message: `El movimiento #${movimiento.id} ha sido validado correctamente.`,
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
                message: e.message || 'No se pudo validar el movimiento de caja.',
                color: 'red',
            });
        }
    };

    const validateForm = async (form) => {
        const errors = {};
        if (!form.aperturaCajaId) errors.aperturaCajaId = 'Selecciona una apertura';
        if (!form.empleadoId) errors.empleadoId = 'Selecciona un empleado';
        if (!form.monto || Number(form.monto) <= 0) errors.monto = 'El monto debe ser mayor a 0';
        if (Number(form.monto) > 50000) errors.monto = 'El monto no puede exceder el límite de $50,000.00';
        if (!form.concepto?.trim()) errors.concepto = 'El concepto es requerido';
        if (form.concepto?.trim().length > 255) errors.concepto = 'El concepto no puede exceder 255 caracteres';
        if (form.observaciones?.trim().length > 500) errors.observaciones = 'Las observaciones no pueden exceder 500 caracteres';

        // Validar que el desglose de efectivo no supere el monto ingresado
        if (form.desglose && typeof form.desglose === 'object' && Number(form.monto) > 0) {
            let totalDesglose = 0;
            for (const d of DENOMINACIONES) {
                const c = form.desglose[d.valor] === '' || form.desglose[d.valor] == null ? 0 : Number(form.desglose[d.valor]);
                totalDesglose += d.valor * c;
            }
            totalDesglose = Math.round(totalDesglose * 100) / 100;
            if (totalDesglose > Number(form.monto)) {
                errors.monto = `El total de billetes y monedas ($${totalDesglose.toFixed(2)}) no puede superar el monto ingresado ($${Number(form.monto).toFixed(2)})`;
            }
        }

        // Validar saldo si es salida
        if (form.tipo === 'SALIDA' && form.aperturaCajaId && Number(form.monto) > 0) {
            try {
                const res = await api.movimientoCaja.obtenerResumenApertura(form.aperturaCajaId);
                if (res.responseFlag === 0) {
                    const saldo = Number(res.data?.saldoDisponible ?? 0);
                    if (Number(form.monto) > saldo) {
                        errors.monto = `Saldo insuficiente en caja ($${saldo.toFixed(2)})`;
                    }
                }
            } catch (e) {
                // Validación final en backend
            }
        }

        return errors;
    };

    return (
        <CrudCatalogo
            titulo="Movimientos de Caja"
            singular="Movimiento"
            icon={IconArrowsExchange}
            servicio={api.movimientoCaja}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <MovimientoForm {...props} />}
            validateForm={validateForm}
            permitirEditar={false}
            permitirEliminar={false}
            renderAccionesFila={(fila, recordOriginal, helpers = {}) => {
                const reload = helpers?.reload;
                const openEdit = helpers?.openEdit;
                const deleteRecord = helpers?.deleteRecord;
                const mov = recordOriginal ?? fila?._recordOriginal ?? fila;
                const esValidado = mov?.estado === 'VALIDADO';
                const cajaAbierta = mov?.aperturaCaja?.estado === 'ABIERTA';

                const puedeValidar = !esValidado && cajaAbierta;
                const tooltipValidar = esValidado
                    ? 'Movimiento ya validado y auditado'
                    : (!cajaAbierta
                        ? 'No se puede validar si la caja no está abierta'
                        : 'Validar movimiento de caja');

                return (
                    <Group gap={6} wrap="nowrap">
                        {/* 1. Botón Validar Movimiento */}
                        <Tooltip label={tooltipValidar} withArrow openDelay={200}>
                            <span style={{ display: 'inline-block' }}>
                                <ActionIcon
                                    variant={esValidado ? 'subtle' : 'light'}
                                    color={puedeValidar ? 'green' : 'gray'}
                                    size="lg"
                                    disabled={!puedeValidar}
                                    onClick={() => puedeValidar && handleValidar(mov, { reload })}
                                >
                                    {esValidado ? <IconCheck size={18} stroke={2} /> : <IconShieldCheck size={18} stroke={1.8} />}
                                </ActionIcon>
                            </span>
                        </Tooltip>

                        {/* 2. Botón Editar (Deshabilitado si está validado) */}
                        <Tooltip
                            label={esValidado ? 'No se puede editar: movimiento ya validado' : 'Editar movimiento'}
                            withArrow
                            openDelay={200}
                        >
                            <span style={{ display: 'inline-block' }}>
                                <ActionIcon
                                    variant="light"
                                    color={esValidado ? 'gray' : 'blue'}
                                    size="lg"
                                    disabled={esValidado}
                                    onClick={() => !esValidado && openEdit?.()}
                                >
                                    <IconEdit size={18} stroke={1.8} />
                                </ActionIcon>
                            </span>
                        </Tooltip>

                        {/* 3. Botón Eliminar (Deshabilitado si está validado) */}
                        <Tooltip
                            label={esValidado ? 'No se puede eliminar: movimiento ya validado' : 'Eliminar movimiento'}
                            withArrow
                            openDelay={200}
                        >
                            <span style={{ display: 'inline-block' }}>
                                <ActionIcon
                                    variant="light"
                                    color={esValidado ? 'gray' : 'red'}
                                    size="lg"
                                    disabled={esValidado}
                                    onClick={() => !esValidado && deleteRecord?.()}
                                >
                                    <IconTrash size={18} stroke={1.8} />
                                </ActionIcon>
                            </span>
                        </Tooltip>
                    </Group>
                );
            }}
        />
    );
}

export default MovimientosCaja;
