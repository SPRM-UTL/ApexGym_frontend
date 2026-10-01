import { useMemo } from 'react';
import {
    Badge,
    Box,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconArrowsExchange,
    IconCash,
    IconUser,
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
                    label: `${a.caja?.nombre ?? 'Caja'} - $${Number(a.montoInicial).toFixed(2)}`,
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
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconArrowsExchange size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Detalle del movimiento</Title>
                </div>
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
                            { value: 'ENTRADA', label: 'Entrada' },
                            { value: 'SALIDA',  label: 'Salida'  },
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
                        error={errors.monto}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        onChange={(v) => onChange('monto', v)}
                    />
                    {/* Full width — concepto */}
                    <TextInput
                        label="Concepto"
                        withAsterisk
                        placeholder="Describe el movimiento"
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
        />
    );
}

export default MovimientosCaja;
