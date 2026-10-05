import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Box,
    Group,
    NativeSelect,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconArrowsExchange,
    IconCash,
    IconInfoCircle,
    IconUser,
    IconWallet,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

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
            return (r.data ?? []).map((e) => ({ value: String(e.id), label: `${e.nombre} ${e.apellidoPaterno}` }));
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
    { key: 'monto',       label: 'Monto',       required: true, type: 'number' },
    { key: 'concepto',    label: 'Concepto',     required: true },
    { key: 'observaciones', label: 'Observaciones' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'apertura',  label: 'Apertura',  sortable: true, filterable: true },
    { key: 'empleado',  label: 'Empleado',  sortable: true, filterable: true },
    { key: 'tipo',      label: 'Tipo',      sortable: true, filterable: true },
    { key: 'monto',     label: 'Monto',     sortable: true, filterable: true },
    { key: 'concepto',  label: 'Concepto',  sortable: true, filterable: true },
];

const INICIAL = {
    aperturaCajaId: '',
    empleadoId: '',
    tipo: 'ENTRADA',
    monto: '',
    concepto: '',
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
function MovimientoForm({ form, errors, onChange, fieldOptions }) {
    const [resumen, setResumen] = useState(null);
    const [cargandoResumen, setCargandoResumen] = useState(false);

    useEffect(() => {
        if (!form.aperturaCajaId) {
            setResumen(null);
            return;
        }

        let isMounted = true;
        setCargandoResumen(true);
        api.movimientoCaja
            .obtenerResumenApertura(form.aperturaCajaId)
            .then((res) => {
                if (isMounted && res.responseFlag === 0) {
                    setResumen(res.data);
                }
            })
            .catch(() => {
                if (isMounted) setResumen(null);
            })
            .finally(() => {
                if (isMounted) setCargandoResumen(false);
            });

        return () => {
            isMounted = false;
        };
    }, [form.aperturaCajaId]);

    const saldoDisponible = resumen ? Number(resumen.saldoDisponible ?? 0) : null;
    const esSalida = form.tipo === 'SALIDA';
    const montoNum = Number(form.monto || 0);
    const superaSaldo = esSalida && saldoDisponible !== null && montoNum > saldoDisponible;

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
                        label="Tipo"
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
                        onChange={(e) => onChange('tipo', e.currentTarget.value)}
                    />
                    <NumberInput
                        label="Monto"
                        withAsterisk
                        prefix="$"
                        min={0.01}
                        decimalScale={2}
                        value={form.monto ?? ''}
                        error={superaSaldo ? `Supera el saldo disponible ($${saldoDisponible.toFixed(2)})` : errors.monto}
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

                    {/* Full width — concepto */}
                    <TextInput
                        label="Concepto"
                        withAsterisk
                        placeholder="Ej. Retiro parcial por seguridad / Pago de papelería"
                        value={form.concepto ?? ''}
                        error={errors.concepto}
                        size="md"
                        radius="md"
                        style={{ gridColumn: '1 / -1' }}
                        onChange={(e) => onChange('concepto', e.currentTarget.value)}
                    />

                    {/* Full width — observaciones */}
                    <Textarea
                        label="Observaciones"
                        placeholder="Observaciones adicionales"
                        value={form.observaciones ?? ''}
                        error={errors.observaciones}
                        size="md"
                        radius="md"
                        minRows={2}
                        style={{ gridColumn: '1 / -1' }}
                        onChange={(e) => onChange('observaciones', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function MovimientosCaja() {
    const mapRecordToForm = useMemo(() => (record) => ({
        aperturaCajaId: record.aperturaCaja?.id
            ? String(record.aperturaCaja.id)
            : String(record.aperturaCajaId ?? ''),
        empleadoId: record.empleado?.id
            ? String(record.empleado.id)
            : String(record.empleadoId ?? ''),
        tipo:          record.tipo          ?? 'ENTRADA',
        monto:         record.monto         ?? '',
        concepto:      record.concepto      ?? '',
        observaciones: record.observaciones ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        aperturaCajaId: Number(form.aperturaCajaId),
        empleadoId:     Number(form.empleadoId),
        tipo:           form.tipo,
        monto:          Number(form.monto),
        concepto:       form.concepto,
        observaciones:  form.observaciones || null,
    });

    const mapRecordToRow = (record) => {
        const apertura = record.aperturaCaja;
        const aperturaLabel = apertura
            ? `${apertura.caja?.nombre ?? 'Caja'} — ${apertura.fechaApertura ? new Date(apertura.fechaApertura).toLocaleDateString('es-MX') : ''}`
            : '—';
        return {
            id:       record.id,
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
        };
    };

    const validateForm = async (form) => {
        const errors = {};
        if (!form.aperturaCajaId) errors.aperturaCajaId = 'Selecciona una apertura';
        if (!form.empleadoId) errors.empleadoId = 'Selecciona un empleado';
        if (!form.monto || Number(form.monto) <= 0) errors.monto = 'El monto debe ser mayor a 0';
        if (!form.concepto?.trim()) errors.concepto = 'El concepto es requerido';

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
                // Si falla la consulta, la validación final la hace el backend
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
        />
    );
}

export default MovimientosCaja;
