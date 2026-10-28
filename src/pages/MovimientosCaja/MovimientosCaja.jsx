/**
 * Issue: [CAJA-04] Frontend: Pantalla e interfaz operativa de Movimientos de Caja #89
 * Parent: Control Operativo de Caja, Auditoria Contable y Reporte de Corte en PDF #85
 *
 * Módulo rediseñado con Drawer moderno de creación y detalle según especificación visual.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Divider,
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
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconArrowsExchange,
    IconCalendar,
    IconCash,
    IconCheck,
    IconCoins,
    IconEye,
    IconInfoCircle,
    IconRefresh,
    IconShieldCheck,
    IconUser,
    IconWallet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';
import { DENOMINACIONES, desglosarMonto, formatearFechaHora } from '../../scripts/cajaUtils.js';

/* ─── Catálogo oficial de tipos de concepto por movimiento ────────────────── */
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

/* ─── Campos (para validación y payload) ─────────────────────────────────── */
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
    { key: 'concepto',      label: 'Concepto',         required: true, maxLength: 255 },
    { key: 'observaciones', label: 'Observaciones',    maxLength: 500 },
];

/* ─── Columnas de la tabla ───────────────────────────────────────────────── */
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

/* ─── Formulario de Registro (Drawer con SectionCards) ───────────────────── */
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

    // Totales calculados del desglose
    const { totalDesglose, totalBilletes, totalMonedas } = useMemo(() => {
        let total = 0;
        let billetes = 0;
        let monedas = 0;
        for (const d of DENOMINACIONES) {
            const raw = conteoBilletes?.[d.valor];
            const cant = (raw === '' || raw === null || raw === undefined || isNaN(Number(raw))) ? 0 : Number(raw);
            const sub = d.valor * cant;
            total += sub;
            if (d.tipo === 'billete') billetes += sub;
            else monedas += sub;
        }
        return {
            totalDesglose: Math.round(total * 100) / 100,
            totalBilletes: Math.round(billetes * 100) / 100,
            totalMonedas: Math.round(monedas * 100) / 100,
        };
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
            {/* ─── Card 1: Detalle del movimiento ─── */}
            <SectionCard
                icon={<IconArrowsExchange size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Detalle del movimiento"
                subtitle="Selecciona la apertura, empleado responsable, tipo de movimiento y monto."
                collapsible={false}
            >
                <Stack gap="sm">
                    {/* Banner de Saldo Disponible en Tiempo Real */}
                    {resumen && (
                        <Paper
                            p="sm"
                            radius="md"
                            withBorder
                            style={{
                                backgroundColor: superaSaldo ? '#fff5f5' : '#f8f9fa',
                                borderColor: superaSaldo ? '#fa5252' : '#dee2e6',
                            }}
                        >
                            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
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
                        {/* Apertura de Caja */}
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

                        {/* Empleado */}
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

                        {/* Tipo de Movimiento */}
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
                                { value: 'SALIDA',  label: 'Salida (Retiro / Gasto menor)' },
                            ]}
                            onChange={(e) => {
                                const nuevoTipo = e.currentTarget.value;
                                onChange('tipo', nuevoTipo);
                                onChange('concepto', '');
                            }}
                        />

                        {/* Monto */}
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
                                    ? `Supera el saldo disponible ($${saldoDisponible.toFixed(2)})`
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

                        {/* Concepto */}
                        <NativeSelect
                            label="Concepto"
                            withAsterisk
                            value={form.concepto ?? ''}
                            error={errors.concepto}
                            size="md"
                            radius="md"
                            leftSection={<IconInfoCircle size={16} stroke={1.5} />}
                            style={{ gridColumn: '1 / -1' }}
                            data={[
                                { value: '', label: 'Selecciona un concepto' },
                                ...opcionesConceptos,
                                ...(form.concepto && !opcionesConceptos.some((o) => o.value === form.concepto)
                                    ? [{ value: form.concepto, label: form.concepto }]
                                    : []),
                            ]}
                            onChange={(e) => onChange('concepto', e.currentTarget.value)}
                        />

                        {/* Observaciones */}
                        <Textarea
                            label="Observaciones"
                            placeholder="Observaciones adicionales del movimiento"
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
                </Stack>
            </SectionCard>

            {/* ─── Card 2: Billetes y monedas de Ingreso / Egreso ─── */}
            <SectionCard
                icon={<IconCash size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title={`Billetes y monedas de ${esSalida ? 'egreso' : 'ingreso'}`}
                subtitle="Desglose por denominación de billetes y monedas para este movimiento"
                rightAmount={`$${totalDesglose.toFixed(2)}`}
                rightAmountColor="#FF6A00"
                collapsible={true}
                defaultOpen={true}
            >
                <Stack gap="sm">
                    <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
                        <Text size="xs" c="dimmed">
                            {montoUsuario > 0
                                ? `Desglose de efectivo para el monto de $${montoUsuario.toFixed(2)}. La suma no puede superar el monto.`
                                : 'Captura la cantidad de billetes y monedas que componen este movimiento.'}
                        </Text>
                        <Badge
                            color={
                                desgloseExcedeMonto
                                    ? 'red'
                                    : montoUsuario > 0 && totalDesglose === montoUsuario
                                    ? 'green'
                                    : 'orange'
                            }
                            variant="light"
                            size="md"
                        >
                            Total Desglose: ${totalDesglose.toFixed(2)}
                            {montoUsuario > 0 && ` / $${montoUsuario.toFixed(2)}`}
                        </Badge>
                    </Group>

                    {desgloseExcedeMonto && (
                        <Alert
                            icon={<IconAlertCircle size={15} />}
                            title="Desglose excede el monto ingresado"
                            color="red"
                            variant="light"
                            radius="sm"
                            p="xs"
                        >
                            <Text size="xs">
                                El desglose (${totalDesglose.toFixed(2)}) supera el monto establecido (${montoUsuario.toFixed(2)}). Reduce las cantidades de billetes o limpia el desglose.
                            </Text>
                        </Alert>
                    )}

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
                                        <Table.Td fw={600} style={{ color: '#1E293B' }}>
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
                                                styles={{ input: { textAlign: 'center', fontWeight: 600 } }}
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

                    <Paper p="xs" radius="md" withBorder style={{ backgroundColor: '#FFF4EC', borderColor: '#FFD8A8' }}>
                        <Group justify="space-between" align="center">
                            <Text fw={700} size="xs" c="#FF6A00">TOTAL DESGLOSE ({esSalida ? 'EGRESO' : 'INGRESO'}):</Text>
                            <Text fw={800} size="md" c="#FF6A00">${totalDesglose.toFixed(2)}</Text>
                        </Group>
                    </Paper>
                </Stack>
            </SectionCard>

            {/* ─── Card 3: Resumen del Desglose ─── */}
            <SectionCard
                icon={<IconCoins size={22} stroke={1.8} />}
                iconBg="#E7F5FF"
                iconColor="#1C7ED6"
                title="Resumen del Desglose"
                subtitle="Composición del efectivo registrado para este movimiento"
                rightAmount={`$${totalDesglose.toFixed(2)}`}
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
                    {totalDesglose > 0 && (
                        <Group justify="flex-end" mt="xs">
                            <Button
                                variant="light"
                                color="red"
                                size="xs"
                                radius="md"
                                leftSection={<IconRefresh size={14} />}
                                onClick={limpiarDesglose}
                            >
                                Limpiar desglose
                            </Button>
                        </Group>
                    )}
                </Stack>
            </SectionCard>

            {/* Aviso informativo de inmutabilidad */}
            <Alert
                icon={<IconInfoCircle size={18} />}
                color="blue"
                variant="light"
                radius="md"
            >
                <Text size="xs">
                    <b>Nota de control contable:</b> Una vez registrado el movimiento no se podrá editar ni eliminar. En caso de haberse equivocado, deberás abrir otro movimiento y corregir ese movimiento en ese nuevo.
                </Text>
            </Alert>

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

/* ─── Drawer para Detalle de Movimiento de Caja (Idéntico a Apertura y Corte) ─── */
function DrawerDetalleMovimiento({ movimiento, opened, onClose, onValidar }) {
    const montoTotal = Number(movimiento?.monto ?? 0);
    const esEntrada = movimiento?.tipo === 'ENTRADA';
    const esValidado = movimiento?.estado === 'VALIDADO';
    const cajaAbierta = movimiento?.aperturaCaja?.estado === 'ABIERTA';
    const puedeValidar = !esValidado && cajaAbierta;

    const desglose = useMemo(() => {
        if (!movimiento?.desglose) return null;
        try {
            return typeof movimiento.desglose === 'string'
                ? JSON.parse(movimiento.desglose)
                : movimiento.desglose;
        } catch {
            return null;
        }
    }, [movimiento?.desglose]);

    // Totales calculados del desglose (con fallback automático para movimientos sin desglose previo)
    const desgloseFinal = useMemo(() => {
        if (desglose && typeof desglose === 'object' && Object.values(desglose).some((v) => Number(v) > 0)) {
            return desglose;
        }
        return desglosarMonto(montoTotal);
    }, [desglose, montoTotal]);

    if (!movimiento) return null;

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
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size={740}
            zIndex={999999}
            title={
                <Group gap="sm">
                    <ThemeIcon size={38} radius="md" variant="light" color="orange" style={{ backgroundColor: '#FFF4EC', color: '#FF6A00' }}>
                        <IconArrowsExchange size={22} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={4} fw={700} c="#1E293B">Detalle de Movimiento de Caja #{movimiento.id}</Title>
                        <Text size="xs" c="dimmed">Información completa de la transacción y desglose de efectivo</Text>
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
                        Fecha: {formatearFechaHora(movimiento.createdAt)}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconUser size={13} />} size="md" radius="sm">
                        Empleado: {movimiento.empleado ? `${movimiento.empleado.nombre} ${movimiento.empleado.apellidoPaterno}` : '—'}
                    </Badge>
                    <Badge variant="light" color="gray" leftSection={<IconCash size={13} />} size="md" radius="sm">
                        Apertura: {movimiento.aperturaCaja ? `#${movimiento.aperturaCaja.id} — ${movimiento.aperturaCaja.caja?.nombre ?? 'Caja'}` : '—'}
                    </Badge>
                    <Badge color={esEntrada ? 'green' : 'red'} variant="light" size="md" radius="sm">
                        {movimiento.tipo ?? '—'}
                    </Badge>
                    <Badge color={esValidado ? 'green' : 'yellow'} variant="light" size="md" radius="sm">
                        {movimiento.estado ?? 'PENDIENTE'}
                    </Badge>
                </Group>

                {/* Tabs de navegación */}
                <Tabs defaultValue="resumen" color="orange">
                    <Tabs.List mb="md">
                        <Tabs.Tab value="resumen">Resumen</Tabs.Tab>
                        <Tabs.Tab value="billetes">Billetes y Monedas</Tabs.Tab>
                    </Tabs.List>

                    {/* ─── Tab: Resumen ─── */}
                    <Tabs.Panel value="resumen">
                        <Stack gap="md">
                            {/* Card 1: Monto y Concepto */}
                            <SectionCard
                                icon={<IconArrowsExchange size={22} stroke={1.8} />}
                                iconBg={esEntrada ? '#EBFBEE' : '#FFF5F5'}
                                iconColor={esEntrada ? '#2B8A3E' : '#E03131'}
                                title={movimiento.concepto ?? 'Concepto no especificado'}
                                subtitle={`Movimiento de ${esEntrada ? 'ingreso' : 'egreso'} registrado`}
                                rightAmount={`${esEntrada ? '+' : '-'}$${montoTotal.toFixed(2)}`}
                                rightAmountColor={esEntrada ? '#2B8A3E' : '#E03131'}
                                collapsible={false}
                            />

                            {/* Card 2: Conteo de efectivo registrado */}
                            <SectionCard
                                icon={<IconCash size={22} stroke={1.8} />}
                                iconBg="#FFF4EC"
                                iconColor="#FF6A00"
                                title={`Conteo de efectivo (${esEntrada ? 'ingreso' : 'egreso'})`}
                                subtitle="Desglose físico registrado en este movimiento"
                                rightAmount={`$${montoTotal.toFixed(2)}`}
                                rightAmountColor="#FF6A00"
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

                            {/* Card 3: Resumen de Composición */}
                            <SectionCard
                                icon={<IconCoins size={22} stroke={1.8} />}
                                iconBg="#E7F5FF"
                                iconColor="#1C7ED6"
                                title="Resumen del Movimiento"
                                subtitle="Composición del efectivo y piezas físicas"
                                collapsible={true}
                                defaultOpen={true}
                            >
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Total en Billetes:</Text>
                                        <Text fw={700} size="xs">${totalBilletes.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my={2} />
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Total en Monedas:</Text>
                                        <Text fw={700} size="xs">${totalMonedas.toFixed(2)}</Text>
                                    </Group>
                                    <Divider my={2} />
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed">Piezas físicas totales:</Text>
                                        <Text fw={700} size="xs">{totalPiezas} piezas</Text>
                                    </Group>
                                </Stack>
                            </SectionCard>

                            {/* Observaciones registradas */}
                            {movimiento.observaciones && (
                                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#F8FAFC' }}>
                                    <Text size="xs" c="dimmed" fw={600} mb={2}>Observaciones registradas:</Text>
                                    <Text size="sm">{movimiento.observaciones}</Text>
                                </Paper>
                            )}

                            {/* Alerta de Auditoría */}
                            <Alert
                                icon={<IconInfoCircle size={18} />}
                                color="blue"
                                variant="light"
                                radius="md"
                            >
                                <Text size="xs">
                                    Por control de auditoría contable, los movimientos registrados no se pueden editar ni eliminar. <b>En caso de haberse equivocado, debes abrir otro movimiento</b> y corregir ese movimiento en ese nuevo registro especificando el motivo en las observaciones.
                                </Text>
                            </Alert>
                        </Stack>
                    </Tabs.Panel>

                    {/* ─── Tab: Billetes y Monedas ─── */}
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

                {puedeValidar && (
                    <Button
                        color="green"
                        radius="md"
                        leftSection={<IconShieldCheck size={18} />}
                        onClick={() => {
                            onValidar?.(movimiento);
                            onClose();
                        }}
                    >
                        Validar Movimiento
                    </Button>
                )}
            </Group>
        </Drawer>
    );
}

/* ─── Componente principal ───────────────────────────────────────────────── */
export function MovimientosCaja() {
    const [movimientoDetalle, setMovimientoDetalle] = useState(null);
    const recargarTablaRef = useRef(null);

    const mapRecordToForm = useMemo(() => (record) => {
        let desglose = null;
        let obsLimpia = record.observaciones ? String(record.observaciones).trim() : '';

        // 1. Obtener desglose de record.desglose si existe
        if (record.desglose) {
            try {
                desglose = typeof record.desglose === 'string'
                    ? JSON.parse(record.desglose)
                    : record.desglose;
            } catch {
                desglose = null;
            }
        }

        // 2. Si no venía en record.desglose o venía concatenado en observaciones
        if (obsLimpia && obsLimpia.includes('Desglose: {')) {
            const parts = obsLimpia.split(/\|\s*Desglose:\s*|Desglose:\s*/i);
            if (parts[1] && !desglose) {
                const match = parts[1].match(/^\{.*?\}/);
                if (match) {
                    try {
                        desglose = JSON.parse(match[0]);
                    } catch {
                        desglose = null;
                    }
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
            } catch {
                desglose = null;
            }
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
        const reload = helpers?.reload || recargarTablaRef.current;
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
            } catch {
                // Validación final en backend
            }
        }

        return errors;
    };

    return (
        <>
            <CrudCatalogo
                titulo="Movimientos de Caja"
                singular="Movimiento"
                icon={IconArrowsExchange}
                headerVariant="unified"
                tableHeaderVariant="neutral"
                formMode="drawer"
                drawerSize={740}
                servicio={api.movimientoCaja}
                columnas={COLUMNAS}
                campos={CAMPOS}
                valoresIniciales={INICIAL}
                mapRecordToForm={mapRecordToForm}
                mapFormToPayload={mapFormToPayload}
                mapRecordToRow={mapRecordToRow}
                renderForm={(props) => <MovimientoForm {...props} />}
                validateForm={validateForm}
                pageSizeOptions={[6, 12, 18, 24]}
                initialSortBy="numero"
                initialSortDirection="desc"
                permitirEditar={false}
                permitirEliminar={false}
                renderAccionesFila={(fila, recordOriginal, helpers = {}) => {
                    const reload = helpers?.reload;
                    if (helpers?.reload) {
                        recargarTablaRef.current = helpers.reload;
                    }
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
                            {/* 1. Botón Ver Detalle del Movimiento */}
                            <Tooltip label="Ver detalle del movimiento" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    aria-label="Ver detalle del movimiento"
                                    onClick={() => setMovimientoDetalle(mov)}
                                >
                                    <IconEye size={18} stroke={1.8} />
                                </ActionIcon>
                            </Tooltip>

                            {/* 2. Botón Validar Movimiento */}
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
                        </Group>
                    );
                }}
            />

            <DrawerDetalleMovimiento
                movimiento={movimientoDetalle}
                opened={Boolean(movimientoDetalle)}
                onClose={() => setMovimientoDetalle(null)}
                onValidar={handleValidar}
            />
        </>
    );
}

export default MovimientosCaja;
