import { useMemo, useState } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    Menu,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from '@mantine/core';
import {
    IconCalendar,
    IconUsers,
    IconCertificate,
    IconHistory,
    IconDotsVertical,
    IconEdit,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { ModalAsignarMembresia } from './ModalAsignarMembresia.jsx';
import { ModalHistorialMembresias } from './ModalHistorialMembresias.jsx';
import { FInput, SectionTitle, FSelect, FTextarea } from '../../components/Controles/ControlesComponent.jsx';

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
    { key: 'telefono', label: 'Teléfono', required: true, maxLength: 10 },
    { key: 'correo' },
    { key: 'direccion' },
    { key: 'contactoEmergenciaNombre' },
    { key: 'contactoEmergenciaTelefono' }
];

const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre Completo', sortable: true, filterable: true },
    { key: 'estado', label: 'Estado', sortable: true, filterable: true },
    { key: 'telefono', label: 'Teléfono', sortable: true, filterable: true },
    { key: 'correo', label: 'Correo', sortable: true, filterable: true },
];

const INICIAL = {
    estadoClienteId: '', nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', genero: '', telefono: '', correo: '', direccion: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: ''
};

function ClienteForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Datos personales</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput label="Nombre(s)" required placeholder="Ej. José Juan" value={form.nombre} error={errors.nombre} onChange={(v) => onChange('nombre', v)} />
                    <FInput label="Apellido Paterno" required placeholder="Ej. Gómez" value={form.apellidoPaterno} error={errors.apellidoPaterno} onChange={(v) => onChange('apellidoPaterno', v)} />
                    <FInput label="Apellido Materno" placeholder="Ej. Hernández" value={form.apellidoMaterno} error={errors.apellidoMaterno} onChange={(v) => onChange('apellidoMaterno', v)} />
                    <FInput label="Fecha de Nacimiento" required icon={IconCalendar} type="date" value={form.fechaNacimiento} error={errors.fechaNacimiento} onChange={(v) => onChange('fechaNacimiento', v)} />
                    <FSelect label="Género" required placeholder="Selecciona género" options={[{ value: 'Masculino', label: 'Masculino' }, { value: 'Femenino', label: 'Femenino' }, { value: 'Otro', label: 'Otro' }]} value={form.genero} error={errors.genero} onChange={(v) => onChange('genero', v)} />
                </SimpleGrid>
            </Box>

            <Box>
                <SectionTitle>Contacto y Dirección</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Teléfono"
                        required
                        placeholder="Ej. 4771234567 (10 dígitos)"
                        maxLength={10}
                        value={form.telefono}
                        error={errors.telefono}
                        onChange={(v) => onChange('telefono', v.replace(/\D/g, '').slice(0, 10))}
                    />
                    <FInput label="Correo Electrónico" type="email" placeholder="Ej. cliente@correo.com" value={form.correo} error={errors.correo} onChange={(v) => onChange('correo', v)} />
                    <FTextarea label="Dirección" placeholder="Ej. Calle Principal 123" value={form.direccion} error={errors.direccion} onChange={(v) => onChange('direccion', v)} />
                </SimpleGrid>
            </Box>

            <Box>
                <SectionTitle>Emergencia y Sistema</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput label="Contacto Emergencia (Nombre)" placeholder="Ej. María López" value={form.contactoEmergenciaNombre} error={errors.contactoEmergenciaNombre} onChange={(v) => onChange('contactoEmergenciaNombre', v)} />
                    <FInput label="Contacto Emergencia (Teléfono)" placeholder="Ej. 4779876543" value={form.contactoEmergenciaTelefono} error={errors.contactoEmergenciaTelefono} onChange={(v) => onChange('contactoEmergenciaTelefono', v)} />
                    <FSelect label="Estado de Cliente" required placeholder="Selecciona estado" options={fieldOptions.estadoClienteId ?? []} value={form.estadoClienteId} error={errors.estadoClienteId} onChange={(v) => onChange('estadoClienteId', v)} />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

export function Clientes() {
    cambioNombreWeb('Clientes');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [clienteHistorial, setClienteHistorial] = useState(null);

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

    const colorEstadoCliente = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad')) return 'red';
        if (e.includes('suspendid') || e.includes('pendiente') || e.includes('vencid') || e.includes('moros')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const estadoNombre = record.estadoCliente?.nombre ?? '—';
        const estadoColor = record.estadoCliente?.color;
        return {
            id: record.id,
            nombre: record.nombre,
            nombreCompleto: `${record.nombre} ${record.apellidoPaterno} ${record.apellidoMaterno || ''}`.trim(),
            estado: (
                <Badge
                    size="sm"
                    variant="light"
                    color={estadoColor || colorEstadoCliente(estadoNombre)}
                    radius="sm"
                    fw={700}
                    style={estadoColor ? {
                        backgroundColor: `${estadoColor}18`,
                        color: estadoColor,
                        border: `1px solid ${estadoColor}40`,
                    } : undefined}
                >
                    {estadoNombre.toUpperCase()}
                </Badge>
            ),
            telefono: record.telefono ?? '—',
            correo: record.correo ?? '—',
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Cliente" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        size="md"
                        radius="md"
                        onClick={() => openEdit(fila)}
                    >
                        <IconEdit size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}

            <Menu shadow="md" width={220} position="bottom-end" radius="md" withArrow>
                <Menu.Target>
                    <Tooltip label="Más acciones" withArrow openDelay={250}>
                        <ActionIcon variant="subtle" color="gray" size="md" radius="md">
                            <IconDotsVertical size={17} stroke={1.8} />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<IconCertificate size={16} stroke={1.8} />}
                        onClick={() => setClienteSeleccionado(fila)}
                    >
                        Asignar Membresía
                    </Menu.Item>
                    <Menu.Item
                        leftSection={<IconHistory size={16} stroke={1.8} />}
                        onClick={() => setClienteHistorial(fila)}
                    >
                        Historial de Membresías
                    </Menu.Item>
                    {setPendingDelete && (
                        <>
                            <Menu.Divider />
                            <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={16} stroke={1.8} />}
                                onClick={() => setPendingDelete(fila)}
                            >
                                Eliminar Cliente
                            </Menu.Item>
                        </>
                    )}
                </Menu.Dropdown>
            </Menu>
        </Group>
    );

    return (
        <>
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
                renderAccionesFila={renderAccionesFila}
                permitirEditar={false}
                permitirEliminar={false}
                formMode="drawer"
                drawerSize={620}
                headerVariant="unified"
                tableHeaderVariant="neutral"
            />
            <ModalAsignarMembresia
                opened={!!clienteSeleccionado}
                onClose={() => setClienteSeleccionado(null)}
                cliente={clienteSeleccionado}
            />
            <ModalHistorialMembresias
                opened={!!clienteHistorial}
                onClose={() => setClienteHistorial(null)}
                cliente={clienteHistorial}
            />
        </>
    );
}

export default Clientes;
