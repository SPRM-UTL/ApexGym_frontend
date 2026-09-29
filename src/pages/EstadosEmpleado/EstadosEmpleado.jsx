import { useMemo } from 'react';
import {
    Box,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconBadge,
    IconFileText,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (solo para validación y payload) ───────────────────────────────── */
const CAMPOS = [
    { key: 'nombre',      label: 'Nombre del estado', required: true },
    { key: 'descripcion', label: 'Descripción',        type: 'textarea' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'nombre',      label: 'Nombre',      sortable: true,  filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '' };

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
function EstadoEmpleadoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconBadge size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información del estado</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre del estado"
                        withAsterisk
                        placeholder="Ej. Activo / Licencia / Inactivo"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        size="md" radius="md"
                        leftSection={<IconBadge size={16} stroke={1.5} />}
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <Textarea
                        label="Descripción"
                        placeholder="Descripción del estado laboral"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        size="md" radius="md"
                        minRows={3}
                        leftSection={<IconFileText size={16} stroke={1.5} />}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function EstadosEmpleado() {
    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:      record.nombre      ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
    });

    const mapRecordToRow = (record) => ({
        id:          record.id,
        nombre:      record.nombre,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Estados de empleado"
            singular="Estado de empleado"
            icon={IconBadge}
            servicio={api.estadoEmpleado}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <EstadoEmpleadoForm {...props} />}
        />
    );
}

export default EstadosEmpleado;
