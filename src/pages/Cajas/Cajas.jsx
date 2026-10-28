import { useMemo } from 'react';
import {
    Box,
    NativeSelect,
    SimpleGrid,
    Stack,
    TextInput,
} from '@mantine/core';
import { IconCashRegister } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle.jsx';

/* ─── Campos (solo para validación y payload) ───────────────────────────────── */
const CAMPOS = [
    { key: 'nombre',    label: 'Nombre de la caja', required: true, maxLength: 100 },
    { key: 'ubicacion', label: 'Ubicación', maxLength: 255 },
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

/* ─── Formulario personalizado ──────────────────────────────────────────────── */
function CajaForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Información de la caja</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre de la caja"
                        withAsterisk
                        placeholder="Ej. Caja Principal"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        description="Máximo 100 caracteres"
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <NativeSelect
                        label="Estado"
                        withAsterisk
                        value={form.estado ?? 'ACTIVO'}
                        error={errors.estado}
                        size="md"
                        radius="md"
                        data={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]}
                        onChange={(e) => onChange('estado', e.currentTarget.value)}
                    />
                </SimpleGrid>
                <Box mt="xs">
                    <TextInput
                        label="Ubicación"
                        placeholder="Ej. Recepción - Entrada principal"
                        value={form.ubicacion ?? ''}
                        error={errors.ubicacion}
                        maxLength={255}
                        description="Máximo 255 caracteres"
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('ubicacion', e.currentTarget.value)}
                    />
                </Box>
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
            icon={IconCashRegister}
            headerVariant="unified"
            tableHeaderVariant="neutral"
            formMode="drawer"
            drawerSize={560}
            servicio={api.caja}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <CajaForm {...props} />}
            pageSizeOptions={[6, 12, 18, 24]}
            initialSortBy="id"
            initialSortDirection="desc"
        />
    );
}

export default Cajas;
