import { useMemo } from 'react';
import {
    Box,
    Button,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconBriefcase,
    IconCalendar,
    IconCamera,
    IconId,
    IconMail,
    IconMapPin,
    IconPhone,
    IconTrash,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { DropzoneImagen } from '../../components/DropzoneImagen/DropzoneImagen.jsx';

/* ─── Constantes de campos (solo para validación / payload, no para render) ─── */
const CAMPOS = [
    { key: 'nombre',           label: 'Nombre(s)',                    required: true  },
    { key: 'apellidoPaterno',  label: 'Apellido Paterno',             required: true  },
    { key: 'apellidoMaterno',  label: 'Apellido Materno'                              },
    { key: 'telefono',         label: 'Teléfono',                     required: true  },
    { key: 'correo',           label: 'Correo electrónico'                            },
    { key: 'direccion',        label: 'Dirección'                                     },
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
    { key: 'imagenUrl',        label: 'Foto de usuario',              type: 'dropzone' },
];

/* ─── Columnas de la tabla ─────────────────────────────────────────────────── */
const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre completo',  sortable: true, filterable: true },
    { key: 'areaTrabajo',    label: 'Área',             sortable: true, filterable: true },
    { key: 'puesto',         label: 'Puesto',           sortable: true, filterable: true },
    { key: 'estadoEmpleado', label: 'Estado',           sortable: true, filterable: true },
    { key: 'telefono',       label: 'Teléfono',         sortable: true, filterable: true },
    { key: 'correo',         label: 'Correo',           sortable: true, filterable: true },
];

/* ─── Valores iniciales del formulario ─────────────────────────────────────── */
const INICIAL = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    telefono: '', correo: '', direccion: '',
    areaTrabajoId: '', puestoId: '', estadoEmpleadoId: '',
    fechaIngreso: '', fechaNacimiento: '', usuarioId: '', imagenUrl: '',
};

/* ─── Estilos de sección ────────────────────────────────────────────────────── */
const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

/* ─── Helpers de campo ──────────────────────────────────────────────────────── */
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

/* ─── Render del formulario personalizado ───────────────────────────────────── */
function EmpleadoForm({ form, errors, onChange, fieldOptions }) {
    const handleDrop = (archivos) => {
        const archivo = archivos[0] ?? null;
        if (!archivo) return;
        const reader = new FileReader();
        reader.onload = (e) => onChange('imagenUrl', e.target?.result ?? '');
        reader.readAsDataURL(archivo);
    };
    const handleReject = () => {
        notifications.show({ title: 'Imagen no válida', message: 'Selecciona una imagen válida de máximo 5 MB.', color: 'red' });
    };

    return (
        <Group align="stretch" gap="xl" wrap="nowrap">
            {/* ── Panel izquierdo ─────────────────────────────────── */}
            <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>

                {/* Datos personales */}
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconUsers size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos personales</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput
                            label="Nombre(s)" required icon={IconUser}
                            placeholder="Ej. Juan"
                            value={form.nombre} error={errors.nombre}
                            onChange={(v) => onChange('nombre', v)}
                        />
                        <FInput
                            label="Apellido Paterno" required icon={IconUser}
                            placeholder="Ej. Pérez"
                            value={form.apellidoPaterno} error={errors.apellidoPaterno}
                            onChange={(v) => onChange('apellidoPaterno', v)}
                        />
                        <FInput
                            label="Apellido Materno" icon={IconUser}
                            placeholder="Ej. López"
                            value={form.apellidoMaterno} error={errors.apellidoMaterno}
                            onChange={(v) => onChange('apellidoMaterno', v)}
                        />
                        <FInput
                            label="Teléfono" required icon={IconPhone}
                            placeholder="Ej. 4771234567"
                            value={form.telefono} error={errors.telefono}
                            onChange={(v) => onChange('telefono', v)}
                        />
                        <FInput
                            label="Correo electrónico" icon={IconMail}
                            placeholder="Ej. empleado@apexgym.com"
                            value={form.correo} error={errors.correo}
                            onChange={(v) => onChange('correo', v)}
                        />
                        <FTextarea
                            label="Dirección" icon={IconMapPin}
                            placeholder="Ej. Av. Principal 123, Col. Centro"
                            value={form.direccion} error={errors.direccion}
                            onChange={(v) => onChange('direccion', v)}
                        />
                    </SimpleGrid>
                </Box>

                {/* Datos laborales */}
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconBriefcase size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos laborales</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FSelect
                            label="Área de trabajo" required icon={IconBriefcase}
                            placeholder="Selecciona área de trabajo"
                            options={fieldOptions.areaTrabajoId ?? []}
                            value={form.areaTrabajoId} error={errors.areaTrabajoId}
                            onChange={(v) => onChange('areaTrabajoId', v)}
                        />
                        <FSelect
                            label="Puesto" required icon={IconId}
                            placeholder="Selecciona puesto"
                            options={fieldOptions.puestoId ?? []}
                            value={form.puestoId} error={errors.puestoId}
                            onChange={(v) => onChange('puestoId', v)}
                        />
                        <FSelect
                            label="Estado de empleado" required icon={IconUsers}
                            placeholder="Selecciona estado"
                            options={fieldOptions.estadoEmpleadoId ?? []}
                            value={form.estadoEmpleadoId} error={errors.estadoEmpleadoId}
                            onChange={(v) => onChange('estadoEmpleadoId', v)}
                        />
                        <FInput
                            label="Fecha de Ingreso" required icon={IconCalendar}
                            type="date"
                            value={form.fechaIngreso} error={errors.fechaIngreso}
                            onChange={(v) => onChange('fechaIngreso', v)}
                        />
                        <FInput
                            label="Fecha de Nacimiento" required icon={IconCalendar}
                            type="date"
                            value={form.fechaNacimiento} error={errors.fechaNacimiento}
                            onChange={(v) => onChange('fechaNacimiento', v)}
                        />
                        <FSelect
                            label="Usuario del sistema (opcional)" icon={IconUser}
                            placeholder="Sin usuario vinculado"
                            options={fieldOptions.usuarioId ?? []}
                            value={form.usuarioId} error={errors.usuarioId}
                            onChange={(v) => onChange('usuarioId', v)}
                        />
                    </SimpleGrid>
                </Box>
            </Stack>

            {/* ── Panel derecho — Foto ─────────────────────────────── */}
            <Box style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={sectionHeader}>
                    <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                        <IconCamera size={16} stroke={1.8} />
                    </ThemeIcon>
                    <Title order={5}>Foto de usuario</Title>
                </div>
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <DropzoneImagen
                        archivo={null}
                        preview={form.imagenUrl || null}
                        onDrop={handleDrop}
                        onReject={handleReject}
                        h="100%"
                    />
                </Box>
                {form.imagenUrl && (
                    <Group justify="center" mt="xs">
                        <Button
                            variant="light"
                            color="red"
                            size="xs"
                            radius="md"
                            leftSection={<IconTrash size={15} stroke={1.8} />}
                            onClick={() => onChange('imagenUrl', '')}
                            style={{ fontWeight: 600 }}
                        >
                            Quitar imagen
                        </Button>
                    </Group>
                )}
            </Box>
        </Group>
    );
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export function Empleados() {
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

    const mapRecordToRow = (record) => ({
        id:             record.id,
        nombreCompleto: [record.nombre, record.apellidoPaterno, record.apellidoMaterno].filter(Boolean).join(' '),
        areaTrabajo:    record.areaTrabajo?.nombre    ?? '—',
        puesto:         record.puesto?.nombre         ?? '—',
        estadoEmpleado: record.estadoEmpleado?.nombre ?? '—',
        telefono:       record.telefono               ?? '—',
        correo:         record.correo                 ?? '—',
    });

    return (
        <CrudCatalogo
            titulo="Empleados"
            singular="Empleado"
            icon={IconUser}
            servicio={api.empleado}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={(props) => <EmpleadoForm {...props} />}
        />
    );
}

export default Empleados;
