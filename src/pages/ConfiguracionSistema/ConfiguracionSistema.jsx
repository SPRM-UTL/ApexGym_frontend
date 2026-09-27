import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    { key: 'clave', label: 'Clave', required: true, placeholder: 'Ej. moneda_principal' },
    {
        key: 'tipoDato',
        label: 'Tipo de dato',
        type: 'select',
        required: true,
        options: [
            { value: 'string', label: 'Texto' },
            { value: 'int', label: 'Entero' },
            { value: 'boolean', label: 'Booleano' },
            { value: 'decimal', label: 'Decimal' },
            { value: 'json', label: 'JSON' },
        ],
    },
    {
        key: 'valor',
        label: 'Valor',
        required: true,
        placeholder: 'Captura un valor',
        type: (form) => {
            if (form.tipoDato === 'int') return 'number';
            if (form.tipoDato === 'decimal') return 'number';
            if (form.tipoDato === 'boolean') return 'boolean';
            if (form.tipoDato === 'json') return 'textarea';
            return 'text';
        },
        step: (form) => form.tipoDato === 'int' ? 1 : 0.01,
        decimalScale: (form) => form.tipoDato === 'int' ? 0 : 2,
        min: 0,
    },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
];

const COLUMNAS = [
    { key: 'clave', label: 'Clave', sortable: true, filterable: true },
    { key: 'valor', label: 'Valor', sortable: true, filterable: true },
    { key: 'tipoDato', label: 'Tipo de dato', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { clave: '', valor: '', tipoDato: 'string', descripcion: '' };

export function ConfiguracionSistema() {
    const mapRecordToForm = useMemo(() => (record) => ({
        clave: record.clave ?? '',
        valor: record.valor ?? '',
        tipoDato: record.tipoDato ?? 'string',
        descripcion: record.descripcion ?? '',
    }), []);

    const mapRecordToRow = (record) => ({
        id: record.id,
        clave: record.clave,
        valor: record.valor,
        tipoDato: record.tipoDato,
        descripcion: record.descripcion ?? '—',
    });

    return <CrudCatalogo titulo="Configuración del sistema" singular="Configuración" servicio={api.configuracionSistema} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapRecordToRow={mapRecordToRow} />;
}

export default ConfiguracionSistema;
