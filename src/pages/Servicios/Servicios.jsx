import { useMemo } from 'react';
import {
    Box,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    TextInput,
    Textarea,
} from '@mantine/core';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle.jsx';
import { IconDumbbell } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

/* ─── Campos (para validación y payload) ─────────────────────────────────────── */
const CAMPOS = [
    { key: 'nombre', label: 'Nombre del Servicio', required: true, maxLength: 100 },
    { key: 'precio', label: 'Precio ($)', type: 'number', required: true, min: 0, decimalScale: 2, step: 1 },
    { 
        key: 'estado', 
        label: 'Estado', 
        type: 'select', 
        required: true, 
        options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' }
        ] 
    },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS_SERVICIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { 
        key: 'precio', 
        label: 'Precio', 
        sortable: true, 
        filterable: false,
        render: (row) => `$${Number(row.precio || 0).toFixed(2)}` 
    },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true }
];

const INICIAL = { nombre: '', precio: '', estado: 'ACTIVO', descripcion: '' };



/* ─── Formulario personalizado ──────────────────────────────────────────────── */
function ServicioForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Información del servicio</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre del servicio"
                        withAsterisk
                        placeholder="Ej. Entrenamiento Personalizado"
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
                        data={[
                            { value: 'ACTIVO', label: 'Activo' },
                            { value: 'INACTIVO', label: 'Inactivo' },
                        ]}
                        onChange={(e) => onChange('estado', e.currentTarget.value)}
                    />
                </SimpleGrid>
                <Box mt="xs">
                    <NumberInput
                        label="Precio ($)"
                        withAsterisk
                        placeholder="0.00"
                        value={form.precio ?? ''}
                        error={errors.precio}
                        min={0}
                        decimalScale={2}
                        size="md"
                        radius="md"
                        onChange={(val) => onChange('precio', val)}
                    />
                </Box>
                <Box mt="xs">
                    <Textarea
                        label="Descripción"
                        placeholder="Detalles o especificaciones del servicio"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        minRows={3}
                        autosize
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </Box>
            </Box>
        </Stack>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function Servicios() {
    cambioNombreWeb('Servicios');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        precio: record.precio ?? '',
        estado: record.estado ?? 'ACTIVO',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        precio: Number(form.precio),
        estado: form.estado || 'ACTIVO',
        descripcion: form.descripcion || null
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        precio: record.precio,
        estado: record.estado,
        descripcion: record.descripcion
    });

    return (
        <CrudCatalogo
            titulo="Servicios"
            singular="Servicio"
            icon={IconDumbbell}
            headerVariant="unified"
            tableHeaderVariant="neutral"
            formMode="drawer"
            drawerSize={560}
            servicio={api.servicio}
            columnas={COLUMNAS_SERVICIOS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <ServicioForm {...props} />}
            pageSizeOptions={[6, 12, 18, 24]}
            initialSortBy="id"
            initialSortDirection="desc"
        />
    );
}

export default Servicios;
