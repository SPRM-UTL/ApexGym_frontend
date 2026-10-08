import { useMemo } from 'react';
import {
    Box,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconUser,
    IconPhone,
    IconMail,
    IconMapPin,
    IconCalendar,
    IconId,
    IconHeartbeat,
    IconUsers
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';

const CAMPOS = [
    {
        key: 'estadoClienteId',
        label: 'Estado',
        required: true,
        loadOptions: async () => {
            const response = await api.estadoCliente.obtenerTodos();
            return (response.data ?? []).map((estado) => ({ value: String(estado.id), label: estado.nombre }));
        },
    },
    { key: 'nombre', required: true },
    { key: 'apellidoPaterno', required: true },
    { key: 'apellidoMaterno' },
    { key: 'fechaNacimiento', required: true },
    {
        key: 'genero',
        required: true,
        options: [
            { value: 'Masculino', label: 'Masculino' },
            { value: 'Femenino', label: 'Femenino' },
            { value: 'Otro', label: 'Otro' },
        ],
    },
    { key: 'telefono', required: true },
    { key: 'correo' },
    { key: 'direccion' },
    { key: 'contactoEmergenciaNombre' },
    { key: 'contactoEmergenciaTelefono' }
];

const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre Completo', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'telefono', label: 'Teléfono', sortable: false, filterable: true },
    { key: 'correo', label: 'Correo', sortable: true, filterable: true },
];

const INICIAL = {
    estadoClienteId: '', nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', genero: '', telefono: '', correo: '', direccion: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: ''
};

const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

function FInput({ label, icon: Icon, required, placeholder, type = 'text', value, error, onChange }) {
    return (
        <TextInput
            label={label}
            withAsterisk={required}
            placeholder={placeholder}
            type={type}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FTextarea({ label, icon: Icon, placeholder, value, error, onChange }) {
    return (
        <Textarea
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            minRows={2}
            leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FSelect({ label, icon: Icon, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect
            label={label}
            withAsterisk={required}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined}
            data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function ClienteForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Group align="stretch" gap="xl" wrap="nowrap">
            <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconUser size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos personales</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Nombre(s)" required icon={IconUser} placeholder="Ej. José Juan" value={form.nombre} error={errors.nombre} onChange={(v) => onChange('nombre', v)} />
                        <FInput label="Apellido Paterno" required icon={IconUser} placeholder="Ej. Gómez" value={form.apellidoPaterno} error={errors.apellidoPaterno} onChange={(v) => onChange('apellidoPaterno', v)} />
                        <FInput label="Apellido Materno" icon={IconUser} placeholder="Ej. Hernández" value={form.apellidoMaterno} error={errors.apellidoMaterno} onChange={(v) => onChange('apellidoMaterno', v)} />
                        <FInput label="Fecha de Nacimiento" required icon={IconCalendar} type="date" value={form.fechaNacimiento} error={errors.fechaNacimiento} onChange={(v) => onChange('fechaNacimiento', v)} />
                        <FSelect label="Género" required icon={IconId} placeholder="Selecciona género" options={[{value: 'Masculino', label: 'Masculino'}, {value: 'Femenino', label: 'Femenino'}, {value: 'Otro', label: 'Otro'}]} value={form.genero} error={errors.genero} onChange={(v) => onChange('genero', v)} />
                    </SimpleGrid>
                </Box>

                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconPhone size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Contacto y Dirección</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Teléfono" required icon={IconPhone} placeholder="Ej. 4771234567" value={form.telefono} error={errors.telefono} onChange={(v) => onChange('telefono', v)} />
                        <FInput label="Correo Electrónico" icon={IconMail} type="email" placeholder="Ej. cliente@correo.com" value={form.correo} error={errors.correo} onChange={(v) => onChange('correo', v)} />
                        <FTextarea label="Dirección" icon={IconMapPin} placeholder="Ej. Calle Principal 123" value={form.direccion} error={errors.direccion} onChange={(v) => onChange('direccion', v)} />
                    </SimpleGrid>
                </Box>

                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconHeartbeat size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Emergencia y Sistema</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Contacto Emergencia (Nombre)" icon={IconUser} placeholder="Ej. María López" value={form.contactoEmergenciaNombre} error={errors.contactoEmergenciaNombre} onChange={(v) => onChange('contactoEmergenciaNombre', v)} />
                        <FInput label="Contacto Emergencia (Teléfono)" icon={IconPhone} placeholder="Ej. 4779876543" value={form.contactoEmergenciaTelefono} error={errors.contactoEmergenciaTelefono} onChange={(v) => onChange('contactoEmergenciaTelefono', v)} />
                        <FSelect label="Estado de Cliente" required icon={IconUsers} placeholder="Selecciona estado" options={fieldOptions.estadoClienteId ?? []} value={form.estadoClienteId} error={errors.estadoClienteId} onChange={(v) => onChange('estadoClienteId', v)} />
                    </SimpleGrid>
                </Box>
            </Stack>
        </Group>
    );
}

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

    return (
        <CrudCatalogo 
            titulo="Clientes" 
            singular="Cliente" 
            icon={IconUsers}
            servicio={api.cliente} 
            columnas={COLUMNAS} 
            campos={CAMPOS} 
            valoresIniciales={INICIAL} 
            mapRecordToForm={mapRecordToForm} 
            mapFormToPayload={mapFormToPayload} 
            mapRecordToRow={mapRecordToRow} 
            renderForm={(props) => <ClienteForm {...props} />} 
        />
    );
}

export default Clientes;
