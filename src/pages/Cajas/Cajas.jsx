import { useMemo } from 'react';
import { IconCash } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre de la caja', required: true, placeholder: 'Ej. Caja Principal' },
    { key: 'ubicacion', label: 'Ubicación', placeholder: 'Ej. Recepción - Entrada principal' },
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
    { key: 'ubicacion', label: 'Ubicación', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
];

const INICIAL = { nombre: '', ubicacion: '', estado: 'ACTIVO' };

export function Cajas() {
    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        ubicacion: record.ubicacion ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        ubicacion: form.ubicacion,
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        ubicacion: record.ubicacion ?? '—',
        estado: record.estado,
    });

    return (
        <CrudCatalogo
            titulo="Cajas"
            singular="Caja"
            icon={IconCash}
            servicio={api.caja}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
        />
    );
}

export default Cajas;
