import { useMemo } from 'react';
import { IconDumbbell } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre del Servicio', required: true, placeholder: 'Ej. Entrenamiento Personalizado', maxLength: 100 },
    { key: 'precio', label: 'Precio ($)', type: 'number', required: true, min: 0, decimalScale: 2, step: 1, placeholder: 'Ej. 250.00' },
    { 
        key: 'estado', 
        label: 'Estado', 
        type: 'select', 
        required: true, 
        options: [
            { value: 'ACTIVO', label: 'Activo' },
            { value: 'INACTIVO', label: 'Inactivo' }
        ] 
    },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3, placeholder: 'Detalles o especificaciones del servicio' },
];

const COLUMNAS_SERVICIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { 
        key: 'precio', 
        label: 'Precio', 
        sortable: true, 
        filterable: false,
        render: (row) => `$${Number(row.precio || 0).toFixed(2)}` 
    },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true }
];

const INICIAL = { nombre: '', precio: '', estado: 'ACTIVO', descripcion: '' };

export function Servicios() {
    cambioNombreWeb('Servicios');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        precio: record.precio ?? '',
        estado: record.estado ?? 'ACTIVO',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        precio: Number(form.precio),
        estado: form.estado || 'ACTIVO',
        descripcion: form.descripcion || null
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        precio: record.precio,
        estado: record.estado,
        descripcion: record.descripcion
    });

    return (
        <CrudCatalogo
            titulo="Servicios"
            singular="Servicio"
            servicio={api.servicio}
            columnas={COLUMNAS_SERVICIOS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            icon={IconDumbbell}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
        />
    );
}

export default Servicios;
