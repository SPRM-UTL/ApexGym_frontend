import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'areaTrabajoId',
        label: 'Área de trabajo',
        type: 'select',
        placeholder: 'Sin área asignada',
        loadOptions: async () => {
            const response = await api.areaTrabajo.obtenerTodos();
            return (response.data ?? []).map((area) => ({ value: String(area.id), label: area.nombre }));
        },
    },
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Evaluación de desempeño' },
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
    { key: 'areaTrabajo', label: 'Área de trabajo', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { areaTrabajoId: '', nombre: '', descripcion: '', estado: 'ACTIVO' };

export function TiposActividad() {
    cambioNombreWeb('Tipos de Actividad');

    const mapRecordToForm = useMemo(() => (record) => ({
        areaTrabajoId: record.areaTrabajo?.id ? String(record.areaTrabajo.id) : '',
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        areaTrabajoId: form.areaTrabajoId || null,
        nombre: form.nombre,
        descripcion: form.descripcion,
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        areaTrabajo: record.areaTrabajo?.nombre ?? 'Sin área',
        estado: record.estado,
        descripcion: record.descripcion ?? '—',
    });

    return <CrudCatalogo titulo="Tipos de actividad" singular="Tipo de actividad" servicio={api.tipoActividad} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} />;
}

export default TiposActividad;
