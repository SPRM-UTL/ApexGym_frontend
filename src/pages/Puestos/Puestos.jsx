import { useMemo } from 'react';
import { IconId } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'areaTrabajoId',
        label: 'Área de trabajo',
        type: 'select',
        required: true,
        placeholder: 'Selecciona área de trabajo',
        loadOptions: async () => {
            const response = await api.areaTrabajo.obtenerTodos();
            return (response.data ?? []).map((area) => ({ value: String(area.id), label: area.nombre }));
        },
    },
    { key: 'nombre', label: 'Nombre del puesto', required: true, placeholder: 'Ej. Recepcionista / Entrenador' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
    { key: 'salarioBase', label: 'Salario Base ($)', type: 'number', required: true, min: 0, step: 100, decimalScale: 2 },
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
    { key: 'nombre', label: 'Nombre del puesto', sortable: true, filterable: true },
    { key: 'areaTrabajo', label: 'Área de trabajo', sortable: true, filterable: true },
    { key: 'salarioBase', label: 'Salario Base', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { areaTrabajoId: '', nombre: '', descripcion: '', salarioBase: 0, estado: 'ACTIVO' };

export function Puestos() {
    const mapRecordToForm = useMemo(() => (record) => ({
        areaTrabajoId: record.areaTrabajo?.id ? String(record.areaTrabajo.id) : String(record.areaTrabajoId ?? ''),
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        salarioBase: record.salarioBase ?? 0,
        estado: record.estado ?? 'ACTIVO',
    }), []);

    const mapFormToPayload = (form) => ({
        areaTrabajoId: form.areaTrabajoId ? Number(form.areaTrabajoId) : null,
        nombre: form.nombre,
        descripcion: form.descripcion,
        salarioBase: Number(form.salarioBase),
        estado: form.estado,
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        areaTrabajo: record.areaTrabajo?.nombre ?? 'Sin área',
        salarioBase: record.salarioBase !== undefined ? `$${Number(record.salarioBase).toFixed(2)}` : '—',
        estado: record.estado,
        descripcion: record.descripcion ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Puestos"
            singular="Puesto"
            icon={IconId}
            servicio={api.puesto}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
        />
    );
}

export default Puestos;
