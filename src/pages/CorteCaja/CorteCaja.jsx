import { useMemo } from 'react';
import {
    Box,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconCalculator,
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
    { key: 'efectivoContado', label: 'Efectivo Contado', required: true, type: 'number' },
    { key: 'observaciones',   label: 'Observaciones' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'apertura',        label: 'Apertura',         sortable: true, filterable: true },
    { key: 'empleado',        label: 'Empleado',          sortable: true, filterable: true },
    { key: 'fechaCorte',      label: 'Fecha de Corte',    sortable: true, filterable: true },
    { key: 'efectivoContado', label: 'Efectivo Contado',  sortable: true, filterable: true },
    { key: 'totalEntradas',   label: 'Total Entradas',    sortable: true, filterable: true },
    { key: 'totalSalidas',    label: 'Total Salidas',     sortable: true, filterable: true },
    { key: 'diferencia',      label: 'Diferencia',        sortable: true, filterable: true },
];

const INICIAL = {
    aperturaCajaId: '',
    empleadoId: '',
    efectivoContado: '',
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
function CorteForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCalculator size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Datos del arqueo</Title>
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
                    <NumberInput
                        label="Efectivo Contado"
                        withAsterisk
                        prefix="$"
                        min={0}
                        decimalScale={2}
                        value={form.efectivoContado ?? ''}
                        error={errors.efectivoContado}
                        size="md"
                        radius="md"
                        leftSection={<IconCalculator size={16} stroke={1.5} />}
                        onChange={(v) => onChange('efectivoContado', v)}
                    />
                    {/* Full width — observaciones */}
                    <Textarea
                        label="Observaciones"
                        placeholder="Observaciones del arqueo"
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
export function CorteCaja() {
    const mapRecordToForm = useMemo(() => (record) => ({
        aperturaCajaId: record.aperturaCaja?.id
            ? String(record.aperturaCaja.id)
            : String(record.aperturaCajaId ?? ''),
        empleadoId: record.empleado?.id
            ? String(record.empleado.id)
            : String(record.empleadoId ?? ''),
        efectivoContado: record.efectivoContado ?? '',
        observaciones:   record.observaciones   ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        aperturaCajaId:  Number(form.aperturaCajaId),
        empleadoId:      Number(form.empleadoId),
        efectivoContado: Number(form.efectivoContado),
        observaciones:   form.observaciones || null,
    });

    const mapRecordToRow = (record) => {
        const diferencia = Number(record.diferencia ?? 0);
        return {
            id:             record.id,
            apertura:       record.aperturaCaja?.caja?.nombre ?? '—',
            empleado:       record.empleado
                ? `${record.empleado.nombre} ${record.empleado.apellidoPaterno}`
                : '—',
            fechaCorte:     record.fechaCorte
                ? new Date(record.fechaCorte).toLocaleDateString('es-MX')
                : '—',
            efectivoContado: `$${Number(record.efectivoContado ?? 0).toFixed(2)}`,
            totalEntradas:   `$${Number(record.totalEntradas   ?? 0).toFixed(2)}`,
            totalSalidas:    `$${Number(record.totalSalidas    ?? 0).toFixed(2)}`,
            diferencia: (
                <Text fw={600} c={diferencia >= 0 ? 'green' : 'red'}>
                    {diferencia >= 0 ? '+' : ''}{diferencia.toFixed(2)}
                </Text>
            ),
        };
    };

    return (
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
        />
    );
}

export default CorteCaja;
