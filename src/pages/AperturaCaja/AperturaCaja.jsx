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
    IconCalendar,
    IconCash,
    IconUser,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (para validación y payload) ────────────────────────────────────── */
const CAMPOS = [
    {
        key: 'cajaId',
        label: 'Caja',
        required: true,
        loadOptions: async () => {
            const [cajasRes, aperturasRes] = await Promise.all([
                api.caja.obtenerTodos(),
                api.aperturaCaja.obtenerTodos(),
            ]);
            const cajasAbiertas = new Set(
                (aperturasRes.data ?? [])
                    .filter((a) => a.estado === 'ABIERTA')
                    .map((a) => a.cajaId)
            );
            return (cajasRes.data ?? []).map((c) => ({
                value: String(c.id),
                label: cajasAbiertas.has(c.id) ? `${c.nombre} (Ya abierta)` : c.nombre,
                disabled: cajasAbiertas.has(c.id),
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
    { key: 'montoInicial', label: 'Monto Inicial', required: true, type: 'number' },
    { key: 'fechaApertura', label: 'Fecha de Apertura', required: true, type: 'date' },
    { key: 'observaciones', label: 'Observaciones' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
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
    fechaApertura: '',
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
                        label="Monto Inicial"
                        withAsterisk
                        prefix="$"
                        min={0}
                        decimalScale={2}
                        value={form.montoInicial ?? ''}
                        error={errors.montoInicial}
                        size="md"
                        radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
                        onChange={(v) => onChange('montoInicial', v)}
                    />
                    <TextInput
                        label="Fecha de Apertura"
                        withAsterisk
                        type="date"
                        value={form.fechaApertura ?? ''}
                        error={errors.fechaApertura}
                        size="md"
                        radius="md"
                        leftSection={<IconCalendar size={16} stroke={1.5} />}
                        onChange={(e) => onChange('fechaApertura', e.currentTarget.value)}
                    />
                    {/* Full width observaciones */}
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
export function AperturaCaja() {
    const mapRecordToForm = useMemo(() => (record) => ({
        cajaId:       record.caja?.id     ? String(record.caja.id)     : String(record.cajaId     ?? ''),
        empleadoId:   record.empleado?.id ? String(record.empleado.id) : String(record.empleadoId ?? ''),
        montoInicial: record.montoInicial ?? '',
        fechaApertura: record.fechaApertura
            ? new Date(record.fechaApertura).toISOString().split('T')[0]
            : '',
        observaciones: record.observaciones ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        cajaId:       Number(form.cajaId),
        empleadoId:   Number(form.empleadoId),
        montoInicial: Number(form.montoInicial),
        fechaApertura: form.fechaApertura || null,
        observaciones: form.observaciones || null,
    });

    const mapRecordToRow = (record) => ({
        id:           record.id,
        caja:         record.caja?.nombre ?? '—',
        empleado:     record.empleado
            ? `${record.empleado.nombre} ${record.empleado.apellidoPaterno}`
            : '—',
        montoInicial: `$${Number(record.montoInicial ?? 0).toFixed(2)}`,
        fechaApertura: record.fechaApertura
            ? new Date(record.fechaApertura).toLocaleDateString('es-MX')
            : '—',
        estado: (
            <Badge color={record.estado === 'ABIERTA' ? 'green' : 'red'} variant="light">
                {record.estado ?? '—'}
            </Badge>
        ),
    });

    return (
        <CrudCatalogo
            titulo="Apertura de Caja"
            singular="Apertura"
            icon={IconCash}
            servicio={api.aperturaCaja}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <AperturaForm {...props} />}
        />
    );
}

export default AperturaCaja;
