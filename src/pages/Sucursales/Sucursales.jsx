import { useMemo } from 'react';
import {
    Box,
    NativeSelect,
    SimpleGrid,
    Stack,
    TextInput,
} from '@mantine/core';
import { IconBuildingStore } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle.jsx';
import { useSucursal } from '../../context/SucursalContext.jsx';

/* ─── Campos (para validación y payload) ─────────────────────────────────────── */
const CAMPOS = [
    { key: 'nombre',       label: 'Nombre de la sucursal', required: true, maxLength: 100 },
    { key: 'codigo',       label: 'Código',                maxLength: 20 },
    { key: 'telefono',     label: 'Teléfono',              maxLength: 30 },
    { key: 'email',        label: 'Correo Electrónico',    maxLength: 191 },
    { key: 'direccion',    label: 'Dirección',             maxLength: 255 },
    { key: 'ciudad',       label: 'Ciudad',                maxLength: 100 },
    { key: 'estado',       label: 'Estado',                maxLength: 100 },
    { key: 'codigoPostal', label: 'Código Postal',         maxLength: 10 },
    {
        key: 'activo',
        label: 'Estado',
        required: true,
        options: [
            { value: 'true', label: 'Activa' },
            { value: 'false', label: 'Inactiva' },
        ],
    },
];

/* ─── Columnas de la tabla ──────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'codigo',       label: 'Código',    sortable: true, filterable: true },
    { key: 'nombre',       label: 'Nombre',    sortable: true, filterable: true },
    { key: 'ciudad',       label: 'Ciudad',    sortable: true, filterable: true },
    { key: 'telefono',     label: 'Teléfono',  sortable: false, filterable: true },
    { key: 'estadoActual', label: 'Estado',    sortable: true, filterable: true },
];

const INICIAL = {
    nombre: '',
    codigo: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    activo: 'true',
};

/* ─── Formulario para el Drawer ─────────────────────────────────────────────── */
function SucursalForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Identificación de la sucursal</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre de la sucursal"
                        withAsterisk
                        placeholder="Ej. Sucursal Matriz / Sucursal Norte"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        description="Máximo 100 caracteres"
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Código de sucursal"
                        placeholder="Ej. SUC-01"
                        value={form.codigo ?? ''}
                        error={errors.codigo}
                        maxLength={20}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('codigo', e.currentTarget.value.toUpperCase())}
                    />
                </SimpleGrid>
            </Box>

            <Box>
                <SectionTitle>Contacto</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Teléfono"
                        placeholder="Ej. 477-123-4567"
                        value={form.telefono ?? ''}
                        error={errors.telefono}
                        maxLength={30}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('telefono', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Correo electrónico"
                        placeholder="Ej. sucursal@apexgym.com"
                        value={form.email ?? ''}
                        error={errors.email}
                        maxLength={191}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('email', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>

            <Box>
                <SectionTitle>Ubicación</SectionTitle>
                <TextInput
                    label="Dirección"
                    placeholder="Ej. Blvd. Aeropuerto #102, Col. Delta"
                    value={form.direccion ?? ''}
                    error={errors.direccion}
                    maxLength={255}
                    size="md"
                    radius="md"
                    mb="xs"
                    onChange={(e) => onChange('direccion', e.currentTarget.value)}
                />
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Ciudad"
                        placeholder="Ej. León"
                        value={form.ciudad ?? ''}
                        error={errors.ciudad}
                        maxLength={100}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('ciudad', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Estado"
                        placeholder="Ej. Guanajuato"
                        value={form.estado ?? ''}
                        error={errors.estado}
                        maxLength={100}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('estado', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Código Postal"
                        placeholder="Ej. 37000"
                        value={form.codigoPostal ?? ''}
                        error={errors.codigoPostal}
                        maxLength={10}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('codigoPostal', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>

            <Box>
                <SectionTitle>Estatus operativo</SectionTitle>
                <NativeSelect
                    label="Estatus"
                    withAsterisk
                    value={String(form.activo ?? 'true')}
                    error={errors.activo}
                    size="md"
                    radius="md"
                    data={[
                        { value: 'true', label: 'Activa' },
                        { value: 'false', label: 'Inactiva' },
                    ]}
                    onChange={(e) => onChange('activo', e.currentTarget.value)}
                />
            </Box>
        </Stack>
    );
}

/* ─── Componente Principal ──────────────────────────────────────────────────── */
export function Sucursales() {
    const { recargarSucursales } = useSucursal();

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:       record.nombre       ?? '',
        codigo:       record.codigo       ?? '',
        telefono:     record.telefono     ?? '',
        email:        record.email        ?? '',
        direccion:    record.direccion    ?? '',
        ciudad:       record.ciudad       ?? '',
        estado:       record.estado       ?? '',
        codigoPostal: record.codigoPostal ?? '',
        activo:       record.activo !== false ? 'true' : 'false',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:       form.nombre ? String(form.nombre).trim() : '',
        codigo:       form.codigo ? String(form.codigo).trim().toUpperCase() : null,
        telefono:     form.telefono ? String(form.telefono).trim() : null,
        email:        form.email ? String(form.email).trim() : null,
        direccion:    form.direccion ? String(form.direccion).trim() : null,
        ciudad:       form.ciudad ? String(form.ciudad).trim() : null,
        estado:       form.estado ? String(form.estado).trim() : null,
        codigoPostal: form.codigoPostal ? String(form.codigoPostal).trim() : null,
        activo:       form.activo === 'true' || form.activo === true,
    });

    const mapRecordToRow = (record) => ({
        id:           record.id,
        codigo:       record.codigo || `SUC-${record.id}`,
        nombre:       record.nombre,
        ciudad:       record.ciudad ? `${record.ciudad}${record.estado ? `, ${record.estado}` : ''}` : '—',
        telefono:     record.telefono || '—',
        estadoActual: record.activo !== false ? 'Activa' : 'Inactiva',
    });

    return (
        <CrudCatalogo
            titulo="Sucursales"
            singular="Sucursal"
            icon={IconBuildingStore}
            headerVariant="unified"
            tableHeaderVariant="neutral"
            formMode="drawer"
            drawerSize={640}
            servicio={api.sucursal}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <SucursalForm {...props} />}
            pageSizeOptions={[6, 12, 18, 24]}
            initialSortBy="id"
            initialSortDirection="asc"
            onSuccess={() => {
                recargarSucursales();
            }}
        />
    );
}

export default Sucursales;
