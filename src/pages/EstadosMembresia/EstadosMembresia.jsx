import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Activa' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '' };

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

    return <CrudCatalogo titulo="Estados de Membresía" singular="Estado de membresía" servicio={api.estadoMembresia} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} />;
}

export default EstadosMembresia;
