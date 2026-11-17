import { useMemo } from 'react';
import {
    Box,
    Stack,
    Textarea,
    TextInput,
} from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, maxLength: 30, placeholder: 'Ej. Efectivo' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 200, minRows: 3 },
];

const COLUMNAS_METODOS_PAGO = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '' };

function MetodoPagoForm({ form, errors, onChange }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos del método de pago</SectionTitle>
                <Stack gap="md">
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
            headerVariant="unified"
            tableHeaderVariant="neutral"
            formMode="drawer"
            drawerSize={540}
            servicio={api.metodosPago}
            columnas={COLUMNAS_METODOS_PAGO}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <MetodoPagoForm {...props} />}
            pageSizeOptions={[6, 12, 18, 24]}
            initialSortBy="id"
            initialSortDirection="desc"
        />
    );
}

export default MetodosPago;
