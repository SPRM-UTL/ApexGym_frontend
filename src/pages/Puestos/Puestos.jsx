import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconEdit,
    IconId,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'areaTrabajoId', label: 'Área de trabajo', required: true,
      loadOptions: async () => {
          const r = await api.areaTrabajo.obtenerTodos();
          return (r.data ?? []).map((a) => ({ value: String(a.id), label: a.nombre }));
      },
    },
    { key: 'nombre',      label: 'Nombre del puesto', required: true, maxLength: 100 },
    { key: 'salarioBase', label: 'Salario Base',       required: true, type: 'number', min: 0, max: 9999999.99 },
    { key: 'estado',      label: 'Estado',             required: true,
      options: [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }] },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 500 },
];

const COLUMNAS = [
    { key: 'nombre',      label: 'Nombre del puesto', sortable: true,  filterable: true },
    { key: 'areaTrabajo', label: 'Área de trabajo',   sortable: true,  filterable: true },
    { key: 'salarioBase', label: 'Salario Base',       sortable: true,  filterable: true },
    { key: 'estado',      label: 'Estado',             sortable: true,  filterable: true },
    { key: 'descripcion', label: 'Descripción',        sortable: false, filterable: true },
];

const INICIAL = { areaTrabajoId: '', nombre: '', descripcion: '', salarioBase: 0, estado: 'ACTIVO' };

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

function PuestoForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos del puesto</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre del puesto"
                        withAsterisk
                        placeholder="Ej. Recepcionista / Entrenador"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <NativeSelect
                        label="Área de trabajo"
                        withAsterisk
                        value={form.areaTrabajoId ?? ''}
                        error={errors.areaTrabajoId}
                        size="md"
                        radius="md"
                        data={[{ value: '', label: 'Selecciona área de trabajo' }, ...(fieldOptions.areaTrabajoId ?? [])]}
                        onChange={(e) => onChange('areaTrabajoId', e.currentTarget.value)}
                    />
                    <NumberInput
                        label="Salario Base"
                        withAsterisk
                        placeholder="0.00"
                        value={form.salarioBase ?? 0}
                        error={errors.salarioBase}
                        size="md"
                        radius="md"
                        min={0}
                        max={9999999.99}
                        step={100}
                        decimalScale={2}
                        onChange={(v) => onChange('salarioBase', v)}
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
                <Box mt="md">
                    <Textarea
                        label="Descripción"
                        placeholder="Breve descripción del puesto de trabajo"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        maxLength={500}
                        size="md"
                        radius="md"
                        minRows={3}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </Box>
            </Box>
        </Stack>
    );
}

export function Puestos() {
    cambioNombreWeb('Puestos');

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

    const colorEstado = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad')) return 'red';
        if (e.includes('suspendid') || e.includes('pendiente')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const estadoNombre = record.estado ?? '—';
        return {
            id:          record.id,
            nombre:      record.nombre,
            areaTrabajo: record.areaTrabajo?.nombre ?? 'Sin área',
            salarioBase: record.salarioBase !== undefined && record.salarioBase !== null ? `$${Number(record.salarioBase).toFixed(2)}` : '—',
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
                <Tooltip label="Editar Puesto" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Puesto" withArrow openDelay={250}>
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

export default Puestos;
