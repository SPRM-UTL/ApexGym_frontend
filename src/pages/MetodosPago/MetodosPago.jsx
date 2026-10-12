import { useMemo } from "react";
import { api } from "../../scripts/services/api";
import { cambioNombreWeb } from "../../scripts/globales";
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx'

const CAMPOS = [
     { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Efectivo' },
     { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
]

const COLUMNAS_METODOS_PAGO = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true }
];

const INICIAL = { nombre: '', descripcion: ''};

export function MetodosPago(){
    cambioNombreWeb('Metodos de Pago');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
     }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion
    });

    return <CrudCatalogo
     titulo="Metodos de Pago"
     singular="Metodos de Pago"
     servicio={api.metodosPago} columnas={COLUMNAS_METODOS_PAGO}
     campos={CAMPOS} valoresIniciales={INICIAL}
     mapRecordToForm={mapRecordToForm}
     mapFormToPayload={mapFormToPayload}
     mapRecordToRow={mapRecordToRow} />;
}

export default MetodosPago;