import { useMemo } from 'react';
import {
    Box,
    Group,
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
    IconShieldCheck
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', required: true },
    { key: 'descripcion' }
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '' };

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

function EstadoMembresiaForm({ form, errors, onChange }) {
    return (
        <Group align="stretch" gap="xl" wrap="nowrap">
            <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconShieldCheck size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos del Estado</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Nombre del Estado" required icon={IconId} placeholder="Ej. Vigente" value={form.nombre} error={errors.nombre} onChange={(v) => onChange('nombre', v)} />
                        <FTextarea label="Descripción" icon={IconFileText} placeholder="Breve descripción del estado" value={form.descripcion} error={errors.descripcion} onChange={(v) => onChange('descripcion', v)} />
                    </SimpleGrid>
                </Box>
            </Stack>
        </Group>
    );
}

export function EstadosMembresia() {
    cambioNombreWeb('Estados de Membresía');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion ?? '—',
    });

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
        />
    );
}

export default EstadosMembresia;
