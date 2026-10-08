import { useMemo } from 'react';
import {
    Box,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconId,
    IconFileText,
    IconCurrencyDollar,
    IconShieldCheck,
    IconWalk
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', required: true },
    { key: 'descripcion' },
    { key: 'costo', required: true },
    { key: 'estado', required: true }
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'costo', label: 'Costo ($)', sortable: true, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', costo: '', estado: 'ACTIVO' };

const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

function FInput({ label, icon: Icon, required, placeholder, type = 'text', value, error, onChange }) {
    return (
        <TextInput label={label} withAsterisk={required} placeholder={placeholder} type={type} value={value ?? ''} error={error} size="md" radius="md" leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function FTextarea({ label, icon: Icon, placeholder, value, error, onChange }) {
    return (
        <Textarea label={label} placeholder={placeholder} value={value ?? ''} error={error} size="md" radius="md" minRows={2} leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function FSelect({ label, icon: Icon, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect label={label} withAsterisk={required} value={value ?? ''} error={error} size="md" radius="md" leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function TipoVisitaForm({ form, errors, onChange }) {
    return (
        <Group align="stretch" gap="xl" wrap="nowrap">
            <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconWalk size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos de Visita</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Nombre de Visita" required icon={IconId} placeholder="Ej. Pase Diario" value={form.nombre} error={errors.nombre} onChange={(v) => onChange('nombre', v)} />
                        <FInput label="Costo" required icon={IconCurrencyDollar} type="number" placeholder="Ej. 80.00" value={form.costo} error={errors.costo} onChange={(v) => onChange('costo', v)} />
                        <FSelect label="Estado" required icon={IconShieldCheck} placeholder="Selecciona estado" options={[{value: 'ACTIVO', label: 'Activo'}, {value: 'INACTIVO', label: 'Inactivo'}]} value={form.estado} error={errors.estado} onChange={(v) => onChange('estado', v)} />
                    </SimpleGrid>
                    <Box mt="xs">
                        <FTextarea label="Descripción" icon={IconFileText} placeholder="Breve descripción" value={form.descripcion} error={errors.descripcion} onChange={(v) => onChange('descripcion', v)} />
                    </Box>
                </Box>
            </Stack>
        </Group>
    );
}

export function TiposVisita() {
    cambioNombreWeb('Tipos de Visita');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        costo: record.costo ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
        costo: Number(form.costo),
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        costo: record.costo,
        descripcion: record.descripcion ?? '—',
        estado: record.estado,
    });

    return (
        <CrudCatalogo 
            titulo="Tipos de Visita" 
            singular="Tipo de visita" 
            icon={IconWalk}
            servicio={api.tipoVisita} 
            columnas={COLUMNAS} 
            campos={CAMPOS} 
            valoresIniciales={INICIAL} 
            mapRecordToForm={mapRecordToForm} 
            mapFormToPayload={mapFormToPayload} 
            mapRecordToRow={mapRecordToRow} 
            renderForm={(props) => <TipoVisitaForm {...props} />} 
        />
    );
}

export default TiposVisita;
