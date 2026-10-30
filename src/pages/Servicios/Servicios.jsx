
import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Group,
    SimpleGrid,
    Stack,
    Tooltip,
} from '@mantine/core';
import {
    IconDumbbell,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import {
    SectionTitle,
    FInput,
    FSelect,
    FTextarea,
    FCheckbox,
} from '../../components/Controles/ControlesComponent.jsx';

/* ─── Campos (para validación y payload) ─────────────────────────────────────── */
const CAMPOS = [
    {
        key: 'nombre',
        label: 'Nombre del Servicio',
        required: true,
        maxLength: 100,
    },
    {
        key: 'precio',
        label: 'Precio',
        type: 'number',
        required: true,
        min: 0,
    },
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
    { key: 'descripcion', label: 'Descripción' },
    { key: 'disponibleCompra', label: 'Disponible' },
];

const INICIAL = {
    nombre: '',
    precio: '',
    estado: 'ACTIVO',
    descripcion: '',
    disponibleCompra: true,
};

const COLUMNAS_SERVICIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'precioTexto', label: 'Precio', sortable: true, filterable: false },
    { key: 'estadoBadge', label: 'Estado', sortable: true, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'disponibleBadge', label: 'Disponible', sortable: false, filterable: false },
];

function ServicioForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Información general</SectionTitle>
                <Stack gap="md">
                    <FInput
                        label="Nombre del Servicio"
                        required
                        placeholder="Ej. Entrenamiento Personalizado"
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />

                    <FSelect
                        label="Estado"
                        required
                        placeholder="Selecciona un estado"
                        options={[
                            { value: 'ACTIVO', label: 'Activo' },
                            { value: 'INACTIVO', label: 'Inactivo' },
                        ]}
                        value={form.estado}
                        error={errors.estado}
                        onChange={(v) => onChange('estado', v)}
                    />

                    <FTextarea
                        label="Descripción"
                        placeholder="Detalles o especificaciones del servicio"
                        value={form.descripcion}
                        error={errors.descripcion}
                        onChange={(v) => onChange('descripcion', v)}
                    />

                    <FCheckbox
                        label="Disponible"
                        size="md"
                        checked={form.disponibleCompra}
                        onChange={(v) => onChange('disponibleCompra', v)}
                    />
                </Stack>
            </Box>

            <Box>
                <SectionTitle>Precio del servicio</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Precio ($)"
                        required
                        type="number"
                        placeholder="Ej. 250.00"
                        value={form.precio}
                        error={errors.precio}
                        onChange={(v) => onChange('precio', v)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}



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
        disponibleCompra: record.disponibleCompra ?? true,
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre ?? '',
        precio: Number(form.precio),
        estado: form.estado || 'ACTIVO',
        descripcion: form.descripcion || null,
        disponibleCompra: form.disponibleCompra ?? true,
    });

    const mapRecordToRow = (record) => {
        const estado = record.estado ?? 'INACTIVO';
        const disponible = record.disponibleCompra ?? false;

        return {
            id: record.id,
            nombre: record.nombre ?? '',
            precioTexto:
                record.precio !== undefined && record.precio !== null
                    ? `$${Number(record.precio).toFixed(2)}`
                    : '—',
            estadoBadge: (
                <Badge
                    size="sm"
                    variant="light"
                    color={estado === 'ACTIVO' ? 'green' : 'red'}
                    radius="sm"
                    fw={700}
                >
                    {estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </Badge>
            ),
            descripcion: record.descripcion ?? '—',
            disponibleBadge: (
                <Badge
                    size="sm"
                    variant="light"
                    color={disponible ? 'green' : 'red'}
                    radius="sm"
                    fw={700}
                >
                    {disponible ? 'Disponible' : 'No Disponible'}
                </Badge>
            ),
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Servicio" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Servicio" withArrow openDelay={250}>
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
            titulo="Servicios"
            singular="Servicio"
            icon={IconDumbbell}
            servicio={api.servicio}
            columnas={COLUMNAS_SERVICIOS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <ServicioForm {...props} />}
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            formMode="drawer"
            drawerSize={580}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default Servicios;
