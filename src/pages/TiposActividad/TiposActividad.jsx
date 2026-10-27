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
    IconActivity,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'areaTrabajoId',
        label: 'Área de trabajo',
        type: 'select',
        placeholder: 'Sin área asignada',
        loadOptions: async () => {
            const response = await api.areaTrabajo.obtenerTodos();
            return (response.data ?? []).map((area) => ({ value: String(area.id), label: area.nombre }));
        },
    },
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Evaluación de desempeño' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
    {
        key: 'estado',
        label: 'Estado',
        type: 'select',
        required: true,
        options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' },
        ],
    },
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'areaTrabajo', label: 'Área de trabajo', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { areaTrabajoId: '', nombre: '', descripcion: '', estado: 'ACTIVO' };

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

function TipoActividadForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos del tipo de actividad</SectionTitle>
                <Stack gap="md">
                    <TextInput
                        label="Nombre"
                        withAsterisk
                        placeholder="Ej. Evaluación de desempeño"
                        size="md"
                        radius="md"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <NativeSelect
                            label="Área de trabajo"
                            size="md"
                            radius="md"
                            value={form.areaTrabajoId ?? ''}
                            error={errors.areaTrabajoId}
                            data={[
                                { value: '', label: 'Sin área asignada' },
                                ...(fieldOptions.areaTrabajoId ?? []),
                            ]}
                            onChange={(e) => onChange('areaTrabajoId', e.currentTarget.value)}
                        />
                        <NativeSelect
                            label="Estado"
                            withAsterisk
                            size="md"
                            radius="md"
                            value={form.estado ?? 'ACTIVO'}
                            error={errors.estado}
                            data={[
                                { value: 'ACTIVO', label: 'Activo' },
                                { value: 'INACTIVO', label: 'Inactivo' },
                            ]}
                            onChange={(e) => onChange('estado', e.currentTarget.value)}
                        />
                    </SimpleGrid>
                    <Textarea
                        label="Descripción"
                        placeholder="Breve descripción de la actividad"
                        size="md"
                        radius="md"
                        minRows={3}
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </Stack>
            </Box>
        </Stack>
    );
}

export function TiposActividad() {
    cambioNombreWeb('Tipos de Actividad');

    const mapRecordToForm = useMemo(() => (record) => ({
        areaTrabajoId: record.areaTrabajo?.id ? String(record.areaTrabajo.id) : '',
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        areaTrabajoId: form.areaTrabajoId || null,
        nombre: form.nombre,
        descripcion: form.descripcion,
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
            areaTrabajo: record.areaTrabajo?.nombre ?? 'Sin área',
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
            descripcion: record.descripcion ?? '—',
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Tipo de Actividad" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Tipo de Actividad" withArrow openDelay={250}>
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
            titulo="Tipos de actividad"
            singular="Tipo de actividad"
            icon={IconActivity}
            servicio={api.tipoActividad}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <TipoActividadForm {...props} />}
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            formMode="drawer"
            drawerSize={540}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default TiposActividad;
