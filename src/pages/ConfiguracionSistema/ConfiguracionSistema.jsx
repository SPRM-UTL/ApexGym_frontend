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
    Switch,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconEdit,
    IconSettings,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'clave', label: 'Clave', required: true, placeholder: 'Ej. moneda_principal' },
    {
        key: 'tipoDato',
        label: 'Tipo de dato',
        type: 'select',
        required: true,
        options: [
            { value: 'string', label: 'Texto' },
            { value: 'int', label: 'Entero' },
            { value: 'boolean', label: 'Booleano' },
            { value: 'decimal', label: 'Decimal' },
            { value: 'json', label: 'JSON' },
        ],
    },
    {
        key: 'valor',
        label: 'Valor',
        required: true,
        placeholder: 'Captura un valor',
        type: (form) => {
            if (form.tipoDato === 'int') return 'number';
            if (form.tipoDato === 'decimal') return 'number';
            if (form.tipoDato === 'boolean') return 'boolean';
            if (form.tipoDato === 'json') return 'textarea';
            return 'text';
        },
        step: (form) => (form.tipoDato === 'int' ? 1 : 0.01),
        decimalScale: (form) => (form.tipoDato === 'int' ? 0 : 2),
        min: 0,
    },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
];

const COLUMNAS = [
    { key: 'clave', label: 'Clave', sortable: true, filterable: true },
    { key: 'valor', label: 'Valor', sortable: true, filterable: true },
    { key: 'tipoDato', label: 'Tipo de dato', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { clave: '', valor: '', tipoDato: 'string', descripcion: '' };

const ETIQUETA_TIPO_DATO = {
    string: 'TEXTO',
    int: 'ENTERO',
    boolean: 'BOOLEANO',
    decimal: 'DECIMAL',
    json: 'JSON',
};

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

function ConfiguracionForm({ form, errors, onChange }) {
    const renderCampoValor = () => {
        if (form.tipoDato === 'int' || form.tipoDato === 'decimal') {
            return (
                <NumberInput
                    label="Valor"
                    withAsterisk
                    placeholder="Captura un valor numérico"
                    size="md"
                    radius="md"
                    value={form.valor ?? ''}
                    error={errors.valor}
                    min={0}
                    step={form.tipoDato === 'int' ? 1 : 0.01}
                    decimalScale={form.tipoDato === 'int' ? 0 : 2}
                    onChange={(val) => onChange('valor', val)}
                />
            );
        }
        if (form.tipoDato === 'boolean') {
            return (
                <Box pt="xs">
                    <Switch
                        label="Valor activo (Verdadero / Falso)"
                        size="md"
                        color="apex"
                        checked={form.valor === true || form.valor === 'true'}
                        error={errors.valor}
                        onChange={(e) => onChange('valor', String(e.currentTarget.checked))}
                    />
                </Box>
            );
        }
        if (form.tipoDato === 'json') {
            return (
                <Textarea
                    label="Valor (JSON)"
                    withAsterisk
                    placeholder='Ej. {"activo": true}'
                    size="md"
                    radius="md"
                    minRows={3}
                    value={form.valor ?? ''}
                    error={errors.valor}
                    onChange={(e) => onChange('valor', e.currentTarget.value)}
                />
            );
        }
        return (
            <TextInput
                label="Valor"
                withAsterisk
                placeholder="Captura un valor"
                size="md"
                radius="md"
                value={form.valor ?? ''}
                error={errors.valor}
                onChange={(e) => onChange('valor', e.currentTarget.value)}
            />
        );
    };

    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos de la configuración</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <TextInput
                        label="Clave"
                        withAsterisk
                        placeholder="Ej. moneda_principal"
                        size="md"
                        radius="md"
                        value={form.clave ?? ''}
                        error={errors.clave}
                        onChange={(e) => onChange('clave', e.currentTarget.value)}
                    />
                    <NativeSelect
                        label="Tipo de dato"
                        withAsterisk
                        size="md"
                        radius="md"
                        value={form.tipoDato ?? 'string'}
                        error={errors.tipoDato}
                        data={[
                            { value: 'string', label: 'Texto' },
                            { value: 'int', label: 'Entero' },
                            { value: 'boolean', label: 'Booleano' },
                            { value: 'decimal', label: 'Decimal' },
                            { value: 'json', label: 'JSON' },
                        ]}
                        onChange={(e) => onChange('tipoDato', e.currentTarget.value)}
                    />
                </SimpleGrid>
                <Box mt="md">{renderCampoValor()}</Box>
                <Box mt="md">
                    <Textarea
                        label="Descripción"
                        placeholder="Breve descripción del parámetro"
                        size="md"
                        radius="md"
                        minRows={3}
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </Box>
            </Box>
        </Stack>
    );
}

export function ConfiguracionSistema() {
    cambioNombreWeb('Configuración del Sistema');

    const mapRecordToForm = useMemo(() => (record) => ({
        clave: record.clave ?? '',
        valor: record.valor ?? '',
        tipoDato: record.tipoDato ?? 'string',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapRecordToRow = (record) => {
        const tipoRaw = record.tipoDato ?? 'string';
        const etiquetaTipo = ETIQUETA_TIPO_DATO[tipoRaw] ?? String(tipoRaw).toUpperCase();
        return {
            id: record.id,
            clave: record.clave,
            valor: String(record.valor ?? '—'),
            tipoDato: (
                <Badge size="sm" variant="light" color="gray" radius="sm" fw={700}>
                    {etiquetaTipo}
                </Badge>
            ),
            descripcion: record.descripcion ?? '—',
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Configuración" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Configuración" withArrow openDelay={250}>
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
            titulo="Configuración del sistema"
            singular="Configuración"
            icon={IconSettings}
            servicio={api.configuracionSistema}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <ConfiguracionForm {...props} />}
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

export default ConfiguracionSistema;
