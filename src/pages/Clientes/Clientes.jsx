import { useMemo } from 'react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'estadoClienteId',
        label: 'Estado',
        type: 'select',
        required: true,
        placeholder: 'Seleccione un estado',
        loadOptions: async () => {
            const response = await api.estadoCliente.obtenerTodos();
            return (response.data ?? []).map((estado) => ({ value: String(estado.id), label: estado.nombre }));
        },
    },
    { key: 'nombre', label: 'Nombre(s)', required: true },
    { key: 'apellidoPaterno', label: 'Apellido Paterno', required: true },
    { key: 'apellidoMaterno', label: 'Apellido Materno' },
    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
    {
        key: 'genero',
        label: 'Género',
        type: 'select',
        required: true,
        options: [
            { value: 'Masculino', label: 'Masculino' },
            { value: 'Femenino', label: 'Femenino' },
            { value: 'Otro', label: 'Otro' },
        ],
    },
    { key: 'telefono', label: 'Teléfono', required: true },
    { key: 'correo', label: 'Correo Electrónico', type: 'email' },
    { key: 'direccion', label: 'Dirección', type: 'textarea' },
    { key: 'contactoEmergenciaNombre', label: 'Contacto de Emergencia (Nombre)' },
    { key: 'contactoEmergenciaTelefono', label: 'Contacto de Emergencia (Teléfono)' }
];

const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre Completo', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'telefono', label: 'Teléfono', sortable: false, filterable: true },
    { key: 'correo', label: 'Correo', sortable: true, filterable: true },
];

const INICIAL = {
    estadoClienteId: '',
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    genero: '',
    telefono: '',
    correo: '',
    direccion: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: ''
};

export function Clientes() {
    cambioNombreWeb('Clientes');

    const mapRecordToForm = useMemo(() => (record) => ({
        estadoClienteId: record.estadoCliente?.id ? String(record.estadoCliente.id) : '',
        nombre: record.nombre ?? '',
        apellidoPaterno: record.apellidoPaterno ?? '',
        apellidoMaterno: record.apellidoMaterno ?? '',
        fechaNacimiento: record.fechaNacimiento ? record.fechaNacimiento.split('T')[0] : '',
        genero: record.genero ?? '',
        telefono: record.telefono ?? '',
        correo: record.correo ?? '',
        direccion: record.direccion ?? '',
        contactoEmergenciaNombre: record.contactoEmergenciaNombre ?? '',
        contactoEmergenciaTelefono: record.contactoEmergenciaTelefono ?? ''
    }), []);

    const mapFormToPayload = (form) => ({
        estadoClienteId: form.estadoClienteId || null,
        nombre: form.nombre,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno,
        fechaNacimiento: form.fechaNacimiento,
        genero: form.genero,
        telefono: form.telefono,
        correo: form.correo,
        direccion: form.direccion,
        contactoEmergenciaNombre: form.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: form.contactoEmergenciaTelefono
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombreCompleto: `${record.nombre} ${record.apellidoPaterno} ${record.apellidoMaterno || ''}`.trim(),
        estado: record.estadoCliente?.nombre ?? '—',
        telefono: record.telefono ?? '—',
        correo: record.correo ?? '—',
    });

    return <CrudCatalogo titulo="Clientes" singular="Cliente" servicio={api.cliente} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} />;
}

export default Clientes;
