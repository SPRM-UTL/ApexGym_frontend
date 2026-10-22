import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconBadge,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre',      label: 'Nombre del estado', required: true, maxLength: 100 },
    { key: 'descripcion', label: 'Descripción',        type: 'textarea', maxLength: 500 },
];

const COLUMNAS = [
    { key: 'nombre',      label: 'Nombre',      sortable: true,  filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '' };

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

function EstadoEmpleadoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos del estado</SectionTitle>
                <SimpleGrid cols={1} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre del estado"
                        withAsterisk
                        placeholder="Ej. Activo / Licencia / Inactivo"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <Textarea
                        label="Descripción"
                        placeholder="Breve descripción del estado laboral"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        maxLength={500}
                        size="md"
                        radius="md"
                        minRows={3}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

export function EstadosEmpleado() {
    cambioNombreWeb('Estados de Empleado');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:      record.nombre      ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
    });

    const colorEstadoEmpleado = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad') || e.includes('despedid')) return 'red';
        if (e.includes('suspendid') || e.includes('licencia') || e.includes('vacacion') || e.includes('permiso') || e.includes('incapacidad') || e.includes('pendiente')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const nombreEstado = record.nombre ?? '—';
        return {
            id:          record.id,
            nombreTexto: nombreEstado,
            nombre: (
                <Badge
                    size="sm"
                    variant="light"
                    color={colorEstadoEmpleado(nombreEstado)}
                    radius="sm"
                    fw={700}
                >
                    {nombreEstado.toUpperCase()}
                </Badge>
            ),
            descripcion: record.descripcion ?? '—',
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Estado" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Estado" withArrow openDelay={250}>
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
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            formMode="drawer"
            drawerSize={500}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default EstadosEmpleado;
