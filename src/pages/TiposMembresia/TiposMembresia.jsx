import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Mensualidad Básica' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
    { key: 'duracionDias', label: 'Duración (Días)', required: true, type: 'number' },
    { key: 'precio', label: 'Precio', required: true, type: 'number' },
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
    { key: 'duracionDias', label: 'Duración (días)', sortable: true, filterable: false },
    { key: 'precio', label: 'Precio ($)', sortable: true, filterable: false },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', duracionDias: '', precio: '', estado: 'ACTIVO' };

export function TiposMembresia() {
    cambioNombreWeb('Tipos de Membresía');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        duracionDias: record.duracionDias ?? '',
        precio: record.precio ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
        duracionDias: Number(form.duracionDias),
        precio: Number(form.precio),
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        duracionDias: record.duracionDias,
        precio: record.precio,
        descripcion: record.descripcion ?? '—',
        estado: record.estado,
    });

    return <CrudCatalogo titulo="Tipos de Membresía" singular="Tipo de membresía" servicio={api.tipoMembresia} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} />;
}

export default TiposMembresia;
