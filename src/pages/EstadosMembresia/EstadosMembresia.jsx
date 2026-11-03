import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    ColorInput,
    ColorSwatch,
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
    IconEdit,
    IconShieldCheck,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { FInput, FSelect, FTextarea, SectionTitle } from '../../components/Controles/ControlesComponent.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre del Estado', required: true },
    { key: 'color', label: 'Color distintivo' },
    { key: 'descripcion', label: 'Descripción' }
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'colorBadge', label: 'Color', sortable: false, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', color: '', descripcion: '' };

function EstadoMembresiaForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos del estado</SectionTitle>
                <SimpleGrid cols={1} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Nombre del Estado"
                        required
                        placeholder="Ej. Vigente"
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />
                    <ColorInput
                        label="Color distintivo"
                        placeholder="Selecciona o escribe un color (ej. #10B981)"
                        value={form.color ?? ''}
                        error={errors.color}
                        size="md"
                        radius="md"
                        format="hex"
                        swatches={[
                            '#10B981',
                            '#3B82F6',
                            '#F59E0B',
                            '#EF4444',
                            '#8B5CF6',
                            '#06B6D4',
                            '#F97316',
                            '#64748B',
                        ]}
                        onChange={(v) => onChange('color', v)}
                    />
                    <FTextarea
                        label="Descripción"
                        placeholder="Breve descripción del estado"
                        value={form.descripcion}
                        error={errors.descripcion}
                        onChange={(v) => onChange('descripcion', v)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

export function EstadosMembresia() {
    cambioNombreWeb('Estados de Membresía');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        color: record.color ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        color: form.color || null,
        descripcion: form.descripcion,
    });

    const colorEstadoMembresia = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad')) return 'red';
        if (e.includes('suspendid') || e.includes('pendiente') || e.includes('vencid') || e.includes('moros')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const nombreEstado = record.nombre ?? '—';
        const color = record.color;
        return {
            id: record.id,
            nombreTexto: nombreEstado,
            nombre: (
                <Badge
                    size="sm"
                    variant="light"
                    color={color || colorEstadoMembresia(nombreEstado)}
                    radius="sm"
                    fw={700}
                    style={color ? {
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `1px solid ${color}40`,
                    } : undefined}
                >
                    {nombreEstado.toUpperCase()}
                </Badge>
            ),
            colorBadge: color ? (
                <Group gap={8} align="center">
                    <ColorSwatch color={color} size={18} />
                    <Text size="xs" c="dimmed" ff="monospace">{color}</Text>
                </Group>
            ) : '—',
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
            titulo="Estados de Membresía"
            singular="Estado"
            icon={IconShieldCheck}
            servicio={api.estadoMembresia}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <EstadoMembresiaForm {...props} />}
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

export default EstadosMembresia;
