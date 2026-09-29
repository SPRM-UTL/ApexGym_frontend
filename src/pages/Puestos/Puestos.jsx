import { useMemo } from 'react';
import {
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
    IconBriefcase,
    IconCurrencyDollar,
    IconFileText,
    IconId,
    IconToggleRight,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (solo para validación y payload) ───────────────────────────────── */
const CAMPOS = [
    { key: 'areaTrabajoId', label: 'Área de trabajo', required: true,
      loadOptions: async () => {
          const r = await api.areaTrabajo.obtenerTodos();
          return (r.data ?? []).map((a) => ({ value: String(a.id), label: a.nombre }));
      },
    },
    { key: 'nombre',      label: 'Nombre del puesto', required: true },
    { key: 'salarioBase', label: 'Salario Base',       required: true, type: 'number' },
    { key: 'estado',      label: 'Estado',             required: true,
      options: [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }] },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'nombre',      label: 'Nombre del puesto', sortable: true,  filterable: true },
    { key: 'areaTrabajo', label: 'Área de trabajo',   sortable: true,  filterable: true },
    { key: 'salarioBase', label: 'Salario Base',       sortable: true,  filterable: true },
    { key: 'estado',      label: 'Estado',             sortable: true,  filterable: true },
    { key: 'descripcion', label: 'Descripción',        sortable: false, filterable: true },
];

const INICIAL = { areaTrabajoId: '', nombre: '', descripcion: '', salarioBase: 0, estado: 'ACTIVO' };

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
function PuestoForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconId size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información del puesto</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <NativeSelect
                        label="Área de trabajo"
                        withAsterisk
                        value={form.areaTrabajoId ?? ''}
                        error={errors.areaTrabajoId}
                        size="md" radius="md"
                        leftSection={<IconBriefcase size={16} stroke={1.5} />}
                        data={[{ value: '', label: 'Selecciona área de trabajo' }, ...(fieldOptions.areaTrabajoId ?? [])]}
                        onChange={(e) => onChange('areaTrabajoId', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Nombre del puesto"
                        withAsterisk
                        placeholder="Ej. Recepcionista / Entrenador"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        size="md" radius="md"
                        leftSection={<IconId size={16} stroke={1.5} />}
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <NumberInput
                        label="Salario Base"
                        withAsterisk
                        placeholder="0.00"
                        value={form.salarioBase ?? 0}
                        error={errors.salarioBase}
                        size="md" radius="md"
                        min={0}
                        step={100}
                        decimalScale={2}
                        leftSection={<IconCurrencyDollar size={16} stroke={1.5} />}
                        onChange={(v) => onChange('salarioBase', v)}
                    />
                    <NativeSelect
                        label="Estado"
                        withAsterisk
                        value={form.estado ?? 'ACTIVO'}
                        error={errors.estado}
                        size="md" radius="md"
                        leftSection={<IconToggleRight size={16} stroke={1.5} />}
                        data={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]}
                        onChange={(e) => onChange('estado', e.currentTarget.value)}
                    />
                    <Textarea
                        label="Descripción"
                        placeholder="Descripción del puesto de trabajo"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        size="md" radius="md"
                        minRows={3}
                        leftSection={<IconFileText size={16} stroke={1.5} />}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                        style={{ gridColumn: '1 / -1' }}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function Puestos() {
    const mapRecordToForm = useMemo(() => (record) => ({
        areaTrabajoId: record.areaTrabajo?.id ? String(record.areaTrabajo.id) : String(record.areaTrabajoId ?? ''),
        nombre:        record.nombre      ?? '',
        descripcion:   record.descripcion ?? '',
        salarioBase:   record.salarioBase ?? 0,
        estado:        record.estado      ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        areaTrabajoId: form.areaTrabajoId ? Number(form.areaTrabajoId) : null,
        nombre:        form.nombre,
        descripcion:   form.descripcion || null,
        salarioBase:   Number(form.salarioBase),
        estado:        form.estado,
    });

    const mapRecordToRow = (record) => ({
        id:          record.id,
        nombre:      record.nombre,
        areaTrabajo: record.areaTrabajo?.nombre ?? 'Sin área',
        salarioBase: record.salarioBase !== undefined ? `$${Number(record.salarioBase).toFixed(2)}` : '—',
        estado:      record.estado,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Puestos"
            singular="Puesto"
            icon={IconId}
            servicio={api.puesto}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <PuestoForm {...props} />}
        />
    );
}

export default Puestos;
