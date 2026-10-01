import { useMemo } from 'react';
import {
    Box,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconBuilding,
    IconCash,
    IconMapPin,
    IconToggleRight,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (solo para validación y payload) ───────────────────────────────── */
const CAMPOS = [
    { key: 'nombre',    label: 'Nombre de la caja', required: true },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'estado',    label: 'Estado',             required: true,
      options: [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }] },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'nombre',    label: 'Nombre',    sortable: true, filterable: true },
    { key: 'ubicacion', label: 'Ubicación', sortable: true, filterable: true },
    { key: 'estado',    label: 'Estado',    sortable: true, filterable: true },
];

const INICIAL = { nombre: '', ubicacion: '', estado: 'ACTIVO' };

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
function CajaForm({ form, errors, onChange }) {
    return (
        <Stack gap="md">
            {/* Información general */}
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCash size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información de la caja</Title>
                </div>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre de la caja"
                        withAsterisk
                        placeholder="Ej. Caja Principal"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        size="md" radius="md"
                        leftSection={<IconCash size={16} stroke={1.5} />}
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
                    <TextInput
                        label="Ubicación"
                        placeholder="Ej. Recepción - Entrada principal"
                        value={form.ubicacion ?? ''}
                        error={errors.ubicacion}
                        size="md" radius="md"
                        leftSection={<IconMapPin size={16} stroke={1.5} />}
                        onChange={(e) => onChange('ubicacion', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function Cajas() {
    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:    record.nombre    ?? '',
        ubicacion: record.ubicacion ?? '',
        estado:    record.estado    ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:    form.nombre,
        ubicacion: form.ubicacion || null,
        estado:    form.estado,
    });

    const mapRecordToRow = (record) => ({
        id:        record.id,
        nombre:    record.nombre,
        ubicacion: record.ubicacion ?? '—',
        estado:    record.estado,
    });

    return (
        <CrudCatalogo
            titulo="Cajas"
            singular="Caja"
            icon={IconCash}
            servicio={api.caja}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <CajaForm {...props} />}
        />
    );
}

export default Cajas;
