import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { 
        key: 'nombre', 
        label: 'Nombre de la categoría', 
        required: true, 
        placeholder: 'Ej. Suplementos, Accesorios' 
    },
    { 
        key: 'descripcion', 
        label: 'Descripción', 
        type: 'textarea', 
        minRows: 3, 
        placeholder: 'Descripción breve de la categoría' 
    }
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: ''};

export function CategoriaProducto() {
    cambioNombreWeb('Categorías de Productos');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? ''
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion ? form.descripcion.trim() : null
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion ?? '—'
    });

    // 🛡️ Validación contra desbordamiento de texto antes de guardar
    const validateForm = (form) => {
        const errores = {};
        if (form.nombre && form.nombre.trim().length > 100) {
            errores.nombre = 'El nombre no puede tener más de 100 caracteres.';
        }
        if (form.descripcion && form.descripcion.trim().length > 500) {
            errores.descripcion = 'La descripción no puede tener más de 500 caracteres.';
        }
        return errores;
    };

    return (
        <CrudCatalogo
            titulo="Administración de Categorías de Productos"
            singular="Categoría de producto"
            servicio={api.categoriaProducto}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            validateForm={validateForm}
        />
    );
}

export default CategoriaProducto;