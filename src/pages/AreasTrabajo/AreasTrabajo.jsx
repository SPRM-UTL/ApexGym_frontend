import { useMemo } from 'react';
import {
    Box,
    NativeSelect,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconBriefcase,
    IconFileText,
    IconToggleRight,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (solo para validación y payload) ───────────────────────────────── */
const CAMPOS = [
    { key: 'nombre',      label: 'Nombre del área', required: true, maxLength: 100 },
    { key: 'descripcion', label: 'Descripción',      type: 'textarea', maxLength: 500 },
    { key: 'estado',      label: 'Estado',           required: true,
      options: [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }] },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'nombre',      label: 'Nombre',      sortable: true,  filterable: true },
    { key: 'estado',      label: 'Estado',      sortable: true,  filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', estado: 'ACTIVO' };

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
function AreaTrabajoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconBriefcase size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información del área</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre del área"
                        withAsterisk
                        placeholder="Ej. Recepción / Mantenimiento"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        description="Máximo 100 caracteres"
                        size="md" radius="md"
                        leftSection={<IconBriefcase size={16} stroke={1.5} />}
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
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
                        placeholder="Descripción breve del área de trabajo"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        maxLength={500}
                        description="Máximo 500 caracteres"
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
export function AreasTrabajo() {
    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:      record.nombre      ?? '',
        descripcion: record.descripcion ?? '',
        estado:      record.estado      ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
        estado:      form.estado,
    });

    const mapRecordToRow = (record) => ({
        id:          record.id,
        nombre:      record.nombre,
        estado:      record.estado,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Áreas de trabajo"
            singular="Área de trabajo"
            icon={IconBriefcase}
            servicio={api.areaTrabajo}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <AreaTrabajoForm {...props} />}
        />
    );
}

export default AreasTrabajo;
