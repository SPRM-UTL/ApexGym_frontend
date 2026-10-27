import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconCalendar,
    IconEdit,
    IconTrash,
    IconUsers,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { DropzoneImagen } from '../../components/DropzoneImagen/DropzoneImagen.jsx';

const CAMPOS = [
    { key: 'nombre',           label: 'Nombre(s)',                    required: true, maxLength: 100 },
    { key: 'apellidoPaterno',  label: 'Apellido Paterno',             required: true, maxLength: 100 },
    { key: 'apellidoMaterno',  label: 'Apellido Materno',                             maxLength: 100 },
    { key: 'telefono',         label: 'Teléfono',                     required: true, maxLength: 10 },
    { key: 'correo',           label: 'Correo electrónico',                           maxLength: 191 },
    { key: 'direccion',        label: 'Dirección',                                    maxLength: 500 },
    { key: 'areaTrabajoId',    label: 'Área de trabajo',              required: true,
        loadOptions: async () => {
        const r = await api.areaTrabajo.obtenerTodos();
        return (r.data ?? []).map((a) => ({ value: String(a.id), label: a.nombre }));
        },
    },
    { key: 'puestoId',         label: 'Puesto',                       required: true,
        loadOptions: async () => {
            const r = await api.puesto.obtenerTodos();
            return (r.data ?? []).map((p) => ({ value: String(p.id), label: p.nombre }));
        },
    },
    { key: 'estadoEmpleadoId', label: 'Estado de empleado',           required: true,
        loadOptions: async () => {
            const r = await api.estadoEmpleado.obtenerTodos();
            return (r.data ?? []).map((e) => ({ value: String(e.id), label: e.nombre }));
        },
    },
    { key: 'fechaIngreso',     label: 'Fecha de Ingreso',             required: true, type: 'date' },
    { key: 'fechaNacimiento',  label: 'Fecha de Nacimiento',          required: true, type: 'date' },
    { key: 'usuarioId',        label: 'Usuario del sistema (opcional)',
        loadOptions: async () => {
            const r = await api.user.obtenerTodos();
            return (r.data ?? []).map((u) => ({ value: String(u.id), label: `${u.nombre} (${u.email})` }));
        },
    },
    { key: 'imagenUrl',        label: 'Fotografía de perfil',         type: 'dropzone' },
];

const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre completo',  sortable: true, filterable: true },
    { key: 'areaTrabajo',    label: 'Área',             sortable: true, filterable: true },
    { key: 'puesto',         label: 'Puesto',           sortable: true, filterable: true },
    { key: 'estadoEmpleado', label: 'Estado',           sortable: true, filterable: true },
    { key: 'telefono',       label: 'Teléfono',         sortable: true, filterable: true },
    { key: 'correo',         label: 'Correo',           sortable: true, filterable: true },
];

const INICIAL = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    telefono: '', correo: '', direccion: '',
    areaTrabajoId: '', puestoId: '', estadoEmpleadoId: '',
    fechaIngreso: '', fechaNacimiento: '', usuarioId: '', imagenUrl: '',
};

const getFechaMaximaNacimiento = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const SectionTitle = ({ children, rightSection }) => (
    <Box mb="xs" mt="xs">
        <Group justify="space-between" align="center" mb={4}>
            <Text fw={600} size="sm" c="#1E293B">
                {children}
            </Text>
            {rightSection}
        </Group>
        <Divider color="#E2E8F0" />
    </Box>
);

function FInput({ label, icon: Icon, required, placeholder, type = 'text', value, error, maxLength, max, min, description, onChange }) {
    return (
        <TextInput
            label={label}
            withAsterisk={required}
            placeholder={placeholder}
            type={type}
            value={value ?? ''}
            error={error}
            maxLength={maxLength}
            max={max}
            min={min}
            description={description}
            size="md"
            radius="md"
            leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FTextarea({ label, placeholder, value, error, maxLength, onChange }) {
    return (
        <Textarea
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            error={error}
            maxLength={maxLength}
            size="md"
            radius="md"
            minRows={2}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FSelect({ label, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect
            label={label}
            withAsterisk={required}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function EmpleadoForm({ form, errors, onChange, fieldOptions }) {
    const fechaMaximaNacimiento  = useMemo(getFechaMaximaNacimiento, []);

    const handleDrop = (archivos) => {
        const archivo = archivos[0] ?? null;
        if (!archivo) return;
        const reader = new FileReader();
        reader.onload = (e) => onChange('imagenUrl', e.target?.result ?? '');
        reader.readAsDataURL(archivo);
    };

    const handleReject = () => {
        notifications.show({
            title: 'Imagen no válida',
            message: 'Selecciona una imagen válida de máximo 5 MB.',
            color: 'red',
        });
    };

    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle
                    rightSection={
                        form.imagenUrl ? (
                            <Button
                                variant="subtle"
                                color="red"
                                size="compact-xs"
                                leftSection={<IconTrash size={14} stroke={1.8} />}
                                onClick={() => onChange('imagenUrl', '')}
                            >
                                Quitar imagen
                            </Button>
                        ) : null
                    }
                >
                    Fotografía de perfil
                </SectionTitle>
                <DropzoneImagen
                    variant="compact"
                    archivo={null}
                    preview={form.imagenUrl || null}
                    onDrop={handleDrop}
                    onReject={handleReject}
                />
            </Box>

            <Box>
                <SectionTitle>Datos personales</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Nombre(s)"
                        required
                        placeholder="Ej. Juan"
                        maxLength={100}
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />
                    <FInput
                        label="Apellido Paterno"
                        required
                        placeholder="Ej. Pérez"
                        maxLength={100}
                        value={form.apellidoPaterno}
                        error={errors.apellidoPaterno}
                        onChange={(v) => onChange('apellidoPaterno', v)}
                    />
                    <FInput
                        label="Apellido Materno"
                        placeholder="Ej. López"
                        maxLength={100}
                        value={form.apellidoMaterno}
                        error={errors.apellidoMaterno}
                        onChange={(v) => onChange('apellidoMaterno', v)}
                    />
                    <FInput
                        label="Fecha de Nacimiento"
                        required
                        icon={IconCalendar}
                        type="date"
                        max={fechaMaximaNacimiento}
                        value={form.fechaNacimiento}
                        error={errors.fechaNacimiento}
                        onChange={(v) => onChange('fechaNacimiento', v)}
                    />
                    <FInput
                        label="Teléfono"
                        required
                        placeholder="Ej. 4771234567"
                        maxLength={10}
                        value={form.telefono}
                        error={errors.telefono}
                        onChange={(v) => onChange('telefono', v.replace(/\D/g, '').slice(0, 10))}
                    />
                    <FInput
                        label="Correo electrónico"
                        type="email"
                        placeholder="Ej. empleado@apexgym.com"
                        maxLength={191}
                        value={form.correo}
                        error={errors.correo}
                        onChange={(v) => onChange('correo', v)}
                    />
                </SimpleGrid>
                <Box mt="md">
                    <FTextarea
                        label="Dirección"
                        placeholder="Ej. Av. Principal 123, Col. Centro"
                        maxLength={500}
                        value={form.direccion}
                        error={errors.direccion}
                        onChange={(v) => onChange('direccion', v)}
                    />
                </Box>
            </Box>

            <Box>
                <SectionTitle>Datos laborales</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FSelect
                        label="Área de trabajo"
                        required
                        placeholder="Selecciona área de trabajo"
                        options={fieldOptions.areaTrabajoId ?? []}
                        value={form.areaTrabajoId}
                        error={errors.areaTrabajoId}
                        onChange={(v) => onChange('areaTrabajoId', v)}
                    />
                    <FSelect
                        label="Puesto"
                        required
                        placeholder="Selecciona puesto"
                        options={fieldOptions.puestoId ?? []}
                        value={form.puestoId}
                        error={errors.puestoId}
                        onChange={(v) => onChange('puestoId', v)}
                    />
                    <FSelect
                        label="Estado de empleado"
                        required
                        placeholder="Selecciona estado"
                        options={fieldOptions.estadoEmpleadoId ?? []}
                        value={form.estadoEmpleadoId}
                        error={errors.estadoEmpleadoId}
                        onChange={(v) => onChange('estadoEmpleadoId', v)}
                    />
                    <FInput
                        label="Fecha de Ingreso"
                        required
                        icon={IconCalendar}
                        type="date"
                        value={form.fechaIngreso}
                        error={errors.fechaIngreso}
                        onChange={(v) => onChange('fechaIngreso', v)}
                    />
                </SimpleGrid>
                <Box mt="md">
                    <FSelect
                        label="Usuario del sistema (opcional)"
                        placeholder="Sin usuario vinculado"
                        options={fieldOptions.usuarioId ?? []}
                        value={form.usuarioId}
                        error={errors.usuarioId}
                        onChange={(v) => onChange('usuarioId', v)}
                    />
                </Box>
            </Box>
        </Stack>
    );
}

export function Empleados() {
    cambioNombreWeb('Empleados');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre:           record.nombre ?? '',
        apellidoPaterno:  record.apellidoPaterno ?? '',
        apellidoMaterno:  record.apellidoMaterno ?? '',
        areaTrabajoId:    record.areaTrabajo?.id   ? String(record.areaTrabajo.id)   : String(record.areaTrabajoId    ?? ''),
        puestoId:         record.puesto?.id         ? String(record.puesto.id)         : String(record.puestoId         ?? ''),
        estadoEmpleadoId: record.estadoEmpleado?.id ? String(record.estadoEmpleado.id) : String(record.estadoEmpleadoId ?? ''),
        usuarioId:        record.usuario?.id        ? String(record.usuario.id)        : String(record.usuarioId        ?? ''),
        telefono:         record.telefono    ?? '',
        correo:           record.correo      ?? '',
        direccion:        record.direccion   ?? '',
        fechaNacimiento:  record.fechaNacimiento ? new Date(record.fechaNacimiento).toISOString().split('T')[0] : '',
        fechaIngreso:     record.fechaIngreso    ? new Date(record.fechaIngreso).toISOString().split('T')[0]    : '',
        imagenUrl:        record.imagenUrl   ?? '',
    }), []);

    const mapFormToPayload = (form) => ({
        nombre:           form.nombre,
        apellidoPaterno:  form.apellidoPaterno,
        apellidoMaterno:  form.apellidoMaterno  || null,
        areaTrabajoId:    Number(form.areaTrabajoId),
        puestoId:         Number(form.puestoId),
        estadoEmpleadoId: Number(form.estadoEmpleadoId),
        usuarioId:        form.usuarioId        ? Number(form.usuarioId) : null,
        telefono:         form.telefono,
        correo:           form.correo           || null,
        direccion:        form.direccion         || null,
        fechaNacimiento:  form.fechaNacimiento,
        fechaIngreso:     form.fechaIngreso,
        imagenUrl:        form.imagenUrl         || null,
    });

    const colorEstadoEmpleado = (estado) => {
        if (!estado || estado === '—') return 'gray';
        const e = estado.toLowerCase().trim();
        if (e === 'inactivo' || e.includes('inactiv') || e.includes('baja') || e.includes('cancelad') || e.includes('despedid')) return 'red';
        if (e.includes('suspendid') || e.includes('licencia') || e.includes('vacacion') || e.includes('permiso') || e.includes('incapacidad') || e.includes('pendiente')) return 'orange';
        if (e === 'activo' || e.includes('activ') || e.includes('vigente')) return 'green';
        return 'gray';
    };

    const mapRecordToRow = (record) => {
        const estadoNombre = record.estadoEmpleado?.nombre ?? '—';
        const nombreCompleto = [record.nombre, record.apellidoPaterno, record.apellidoMaterno].filter(Boolean).join(' ');
        return {
            id:             record.id,
            nombre:         nombreCompleto || record.nombre,
            nombreCompleto,
            areaTrabajo:    record.areaTrabajo?.nombre    ?? '—',
            puesto:         record.puesto?.nombre         ?? '—',
            estadoEmpleado: (
                <Badge
                    size="sm"
                    variant="light"
                    color={colorEstadoEmpleado(estadoNombre)}
                    radius="sm"
                    fw={700}
                >
                    {estadoNombre.toUpperCase()}
                </Badge>
            ),
            telefono:       record.telefono               ?? '—',
            correo:         record.correo                 ?? '—',
        };
    };

    const validateForm = (form) => {
        const errors = {};
        if (form.telefono && !/^\d{10}$/.test(form.telefono)) {
            errors.telefono = 'El teléfono debe contener exactamente 10 dígitos numéricos';
        }
        if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
            errors.correo = 'Formato de correo electrónico no válido';
        }
        if(form.fechaNacimiento && form.fechaNacimiento > getFechaMaximaNacimiento){
            errors.fechaNacimiento = 'El empleado tiene que ser mayor de edad (minima : 18)'
        }
        return errors;
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Empleado" withArrow openDelay={250}>
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
            {setPendingDelete && (
                <Tooltip label="Eliminar Empleado" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="red"
                        size="md"
                        radius="md"
                        onClick={() => setPendingDelete(fila)}
                    >
                        <IconTrash size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );

    return (
        <CrudCatalogo
            titulo="Empleados"
            singular="Empleado"
            icon={IconUsers}
            servicio={api.empleado}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <EmpleadoForm {...props} />}
            renderAccionesFila={renderAccionesFila}
            permitirEditar={false}
            permitirEliminar={false}
            validateForm={validateForm}
            formMode="drawer"
            drawerSize={620}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default Empleados;
