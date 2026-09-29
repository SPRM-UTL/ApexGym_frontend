import { useMemo } from 'react';
import { IconBriefcase } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre del área', required: true, placeholder: 'Ej. Recepción / Mantenimiento' },
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
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', estado: 'ACTIVO' };

export function AreasTrabajo() {
    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        estado: record.estado,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Áreas de trabajo"
            singular="Área de trabajo"
            icon={IconBriefcase}
            servicio={api.areaTrabajo}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
        />
    );
}

export default AreasTrabajo;
