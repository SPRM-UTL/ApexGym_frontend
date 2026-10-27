import { useMemo } from 'react';
import {
    Box,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, maxLength: 30, placeholder: 'Ej. Efectivo' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 200, minRows: 3 },
];

const COLUMNAS_METODOS_PAGO = [
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

function MetodoPagoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md">
            <Box>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCreditCard size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Información General</Title>
                </div>
                <Stack gap="sm">
                    <TextInput
                        label="Nombre"
                        withAsterisk
                        placeholder="Ej. Efectivo, Tarjeta de Débito, Transferencia"
                        value={form.nombre ?? ''}
                        error={errors.nombre}
                        maxLength={30}
                        description="Máximo 30 caracteres"
                        size="md"
                        radius="md"
                        onChange={(e) => onChange('nombre', e.currentTarget.value)}
                    />
                    <Textarea
                        label="Descripción"
                        placeholder="Descripción o notas del método de pago"
                        value={form.descripcion ?? ''}
                        error={errors.descripcion}
                        maxLength={200}
                        description="Máximo 200 caracteres"
                        size="md"
                        radius="md"
                        minRows={3}
                        onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                    />
                </Stack>
            </Box>
        </Stack>
    );
}

export function MetodosPago() {
    cambioNombreWeb('Métodos de Pago');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre?.trim(),
        descripcion: form.descripcion ? form.descripcion.trim() : null,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Métodos de Pago"
            singular="Método de Pago"
            icon={IconCreditCard}
            servicio={api.metodosPago}
            columnas={COLUMNAS_METODOS_PAGO}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <MetodoPagoForm {...props} />}
        />
    );
}

export default MetodosPago;