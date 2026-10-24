import { useMemo } from 'react';
import {
    ActionIcon,
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
    IconCategory,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'nombre',
        label: 'Nombre de la categoría',
        required: true,
        maxLength: 100,
    },
    {
        key: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        maxLength: 500,
    },
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
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

function CategoriaProductoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos de la categoría</SectionTitle>
                <SimpleGrid cols={1} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Nombre de la categoría"
                        withAsterisk
                        placeholder="Ej. Suplementos, Accesorios"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={100}
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <Textarea
                        label="Descripción"
                        placeholder="Breve descripción de la categoría"
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

export function CategoriaProducto() {
    cambioNombreWeb('Categorías de Productos');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion ? form.descripcion.trim() : null,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion ?? '—',
    });

    // 🛡️ Validación contra desbordamiento de texto antes de guardar
    const validateForm = (form) => {
        const errores = {};
        if (form.nombre && form.nombre.trim().length > 100) {
            errores.nombre = 'El nombre no puede tener más de 100 caracteres.';
        }
        if (form.descripcion && form.descripcion.trim().length > 500) {
            errores.descripcion = 'La descripción no puede tener más de 500 caracteres.';
        }
        return errores;
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Categoría" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Categoría" withArrow openDelay={250}>
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
            titulo="Categorías de productos"
            singular="Categoría de producto"
            icon={IconCategory}
            servicio={api.categoriaProducto}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <CategoriaProductoForm {...props} />}
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            validateForm={validateForm}
            formMode="drawer"
            drawerSize={500}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default CategoriaProducto;
