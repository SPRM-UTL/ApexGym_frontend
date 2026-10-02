import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Visita por día' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
    { key: 'costo', label: 'Costo', required: true, type: 'number' },
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
    { key: 'costo', label: 'Costo ($)', sortable: true, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', costo: '', estado: 'ACTIVO' };

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

    return <CrudCatalogo titulo="Tipos de Visita" singular="Tipo de visita" servicio={api.tipoVisita} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} />;
}

export default TiposVisita;
