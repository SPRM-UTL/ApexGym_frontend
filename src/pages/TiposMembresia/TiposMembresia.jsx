import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconCertificate,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { FInput, FSelect, FTextarea, SectionTitle } from '../../components/Controles/ControlesComponent.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre de Membresía', required: true },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'duracionDias', label: 'Duración (Días)', required: true, type: 'number', min: 1 },
    { key: 'precio', label: 'Precio', required: true, type: 'number', min: 0 },
    { key: 'estado', label: 'Estado', required: true }
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'duracionDias', label: 'Duración (días)', sortable: true, filterable: false },
    { key: 'precio', label: 'Precio ($)', sortable: true, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', duracionDias: '', precio: '', estado: 'ACTIVO' };

function TipoMembresiaForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos de la membresía</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Nombre de Membresía"
                        required
                        placeholder="Ej. Mensualidad Básica"
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />
                    <FInput
                        label="Duración (Días)"
                        required
                        type="number"
                        placeholder="Ej. 30"
                        value={form.duracionDias}
                        error={errors.duracionDias}
                        onChange={(v) => onChange('duracionDias', v)}
                    />
                    <FInput
                        label="Precio"
                        required
                        type="number"
                        placeholder="Ej. 499.00"
                        value={form.precio}
                        error={errors.precio}
                        onChange={(v) => onChange('precio', v)}
                    />
                    <FSelect
                        label="Estado"
                        required
                        placeholder="Selecciona estado"
                        options={[
                            { value: 'ACTIVO', label: 'Activo' },
                            { value: 'INACTIVO', label: 'Inactivo' },
                        ]}
                        value={form.estado}
                        error={errors.estado}
                        onChange={(v) => onChange('estado', v)}
                    />
                </SimpleGrid>
                <Box mt="md">
                    <FTextarea
                        label="Descripción"
                        placeholder="Breve descripción del plan"
                        value={form.descripcion}
                        error={errors.descripcion}
                        onChange={(v) => onChange('descripcion', v)}
                    />
                </Box>
            </Box>
        </Stack>
    );
}

export function TiposMembresia() {
    cambioNombreWeb('Tipos de Membresía');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        duracionDias: record.duracionDias ?? '',
        precio: record.precio ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
        duracionDias: Number(form.duracionDias),
        precio: Number(form.precio),
        estado: form.estado,
    });

    const colorEstado = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad')) return 'red';
        if (e.includes('suspendid') || e.includes('pendiente') || e.includes('vencid')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const estadoNombre = record.estado ?? '—';
        return {
            id: record.id,
            nombre: record.nombre,
            duracionDias: record.duracionDias,
            precio: record.precio !== undefined && record.precio !== null ? `$${Number(record.precio).toFixed(2)}` : '—',
            descripcion: record.descripcion ?? '—',
            estado: (
                <Badge
                    size="sm"
                    variant="light"
                    color={colorEstado(estadoNombre)}
                    radius="sm"
                    fw={700}
                >
                    {estadoNombre.toUpperCase()}
                </Badge>
            ),
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Tipo de Membresía" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        size="md"
                        radius="md"
                        onClick={() => openEdit(fila)}
                    >
                        <IconEdit size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}
            {setPendingDelete && (
                <Tooltip label="Eliminar Tipo de Membresía" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="red"
                        size="md"
                        radius="md"
                        onClick={() => setPendingDelete(fila)}
                    >
                        <IconTrash size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );

    return (
        <CrudCatalogo
            titulo="Tipos de Membresía"
            singular="Tipo de membresía"
            icon={IconCertificate}
            servicio={api.tipoMembresia}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <TipoMembresiaForm {...props} />}
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            formMode="drawer"
            drawerSize={560}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default TiposMembresia;
