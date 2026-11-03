import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Group,
    SimpleGrid,
    Stack,
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
import { FInput, SectionTitle, FSelect } from '../../components/Controles/ControlesComponent.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre(s)', required: true, maxLength: 100 },
    { key: 'apellidoPaterno', label: 'Apellido Paterno', required: true, maxLength: 100 },
    { key: 'apellidoMaterno', label: 'Apellido Materno', maxLength: 100 },
    { key: 'telefono', label: 'Teléfono', required: true, maxLength: 10 },
    { key: 'correo', label: 'Correo electrónico', maxLength: 191 },
    {
        key: 'areaTrabajoId', label: 'Área de trabajo', required: true,
        loadOptions: async () => {
            const r = await api.areaTrabajo.obtenerTodos();
            return (r.data ?? []).map((a) => ({ value: String(a.id), label: a.nombre }));
        },
    },
    {
        key: 'puestoId', label: 'Puesto', required: true,
        loadOptions: async () => {
            const r = await api.puesto.obtenerTodos();
            return (r.data ?? []).map((p) => ({ value: String(p.id), label: p.nombre }));
        },
    },
    {
        key: 'estadoEmpleadoId', label: 'Estado de empleado', required: true,
        loadOptions: async () => {
            const r = await api.estadoEmpleado.obtenerTodos();
            return (r.data ?? []).map((e) => ({ value: String(e.id), label: e.nombre }));
        },
    },
    { key: 'fechaIngreso', label: 'Fecha de Ingreso', required: true, type: 'date' },
    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento', required: true, type: 'date' },
    {
        key: 'usuarioId', label: 'Usuario del sistema (opcional)',
        loadOptions: async () => {
            const [rUsers, rEmps] = await Promise.all([
                api.user.obtenerTodos(),
                api.empleado.obtenerTodos().catch(() => ({ data: [] })),
            ]);
            const usuarios = rUsers.data ?? [];
            const empleados = rEmps.data ?? [];
            const usuariosOcupados = new Map();
            empleados.forEach((emp) => {
                const uId = emp.usuario?.id ?? emp.usuarioId;
                if (uId) {
                    usuariosOcupados.set(String(uId), emp.id);
                }
            });
            return usuarios.map((u) => ({
                value: String(u.id),
                label: `${u.nombre} (${u.email})`,
                empleadoIdVinculado: usuariosOcupados.get(String(u.id)) ?? null,
            }));
        },
    },
    { key: 'imagenUrl', label: 'Fotografía de perfil', type: 'dropzone' },
];

const COLUMNAS = [
    { key: 'nombreCompleto', label: 'Nombre completo', sortable: true, filterable: true },
    { key: 'areaTrabajo', label: 'Área', sortable: true, filterable: true },
    { key: 'puesto', label: 'Puesto', sortable: true, filterable: true },
    { key: 'estadoEmpleado', label: 'Estado', sortable: true, filterable: true },
    { key: 'telefono', label: 'Teléfono', sortable: true, filterable: true },
    { key: 'correo', label: 'Correo', sortable: true, filterable: true },
];

const INICIAL = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    telefono: '', correo: '',
    calle: '', numeroExterior: '', numeroInterior: '',
    colonia: '', codigoPostal: '', municipio: '', estado: '', entreCalles: '',
    areaTrabajoId: '', puestoId: '', estadoEmpleadoId: '',
    fechaIngreso: '', fechaNacimiento: '', usuarioId: '', imagenUrl: '',
};

function EmpleadoForm({ form, errors, onChange, fieldOptions }) {
    const fechaMaximaNacimiento = useMemo(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 18);
        return d.toISOString().split('T')[0];
    }, []);

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

    const opcionesUsuario = useMemo(() => {
        const rawOptions = fieldOptions.usuarioId ?? [];
        return rawOptions.filter((opt) => {
            if (!opt.empleadoIdVinculado) return true;
            return String(opt.value) === String(form.usuarioId);
        });
    }, [fieldOptions.usuarioId, form.usuarioId]);

    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle
                    rightSection={
                        form.imagenUrl ? (
                            <Button
                                variant="outline"
                                color="red"
                                size="compact-xs"
                                radius="md"
                                leftSection={<IconTrash size={14} stroke={1.8} />}
                                onClick={() => onChange('imagenUrl', '')}
                                styles={{
                                    root: {
                                        border: '1px solid #EF4444',
                                        backgroundColor: '#FEF2F2',
                                        color: '#DC2626',
                                        fontWeight: 600,
                                        '&:hover': {
                                            backgroundColor: '#FEE2E2',
                                        },
                                    },
                                }}
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
                        placeholder="Ej. 4771234567 (10 dígitos)"
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
            </Box>

            <Box>
                <SectionTitle>Dirección y residencia</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 12 }} spacing="md" verticalSpacing="xs">
                    <Box style={{ gridColumn: 'span 12' }}>
                        <FInput
                            label="Calle"
                            placeholder="Ej. Av. Principal"
                            maxLength={150}
                            value={form.calle}
                            error={errors.calle}
                            onChange={(v) => onChange('calle', v)}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 6' }}>
                        <FInput
                            label="Núm. ext."
                            placeholder="Ej. 123"
                            maxLength={20}
                            value={form.numeroExterior}
                            error={errors.numeroExterior}
                            onChange={(v) => onChange('numeroExterior', v)}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 6' }}>
                        <FInput
                            label="Núm. int."
                            placeholder="Ej. A-4"
                            maxLength={20}
                            value={form.numeroInterior}
                            error={errors.numeroInterior}
                            onChange={(v) => onChange('numeroInterior', v)}
                        />
                    </Box>

                    <Box style={{ gridColumn: 'span 8' }}>
                        <FInput
                            label="Colonia"
                            placeholder="Ej. Centro"
                            maxLength={100}
                            value={form.colonia}
                            error={errors.colonia}
                            onChange={(v) => onChange('colonia', v)}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 4' }}>
                        <FInput
                            label="Código Postal (CP)"
                            placeholder="Ej. 37000"
                            maxLength={5}
                            value={form.codigoPostal}
                            error={errors.codigoPostal}
                            onChange={(v) => onChange('codigoPostal', v.replace(/\D/g, '').slice(0, 5))}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 6' }}>
                        <FInput
                            label="Municipio / Ciudad"
                            placeholder="Ej. León"
                            maxLength={100}
                            value={form.municipio}
                            error={errors.municipio}
                            onChange={(v) => onChange('municipio', v)}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 6' }}>
                        <FInput
                            label="Estado"
                            placeholder="Ej. Guanajuato"
                            maxLength={100}
                            value={form.estado}
                            error={errors.estado}
                            onChange={(v) => onChange('estado', v)}
                        />
                    </Box>
                    <Box style={{ gridColumn: 'span 12' }}>
                        <FInput
                            label="Entre calles"
                            placeholder="Ej. Entre Calle Hidalgo y Calle Juárez"
                            maxLength={200}
                            value={form.entreCalles}
                            error={errors.entreCalles}
                            onChange={(v) => onChange('entreCalles', v)}
                        />
                    </Box>
                </SimpleGrid>
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
                        options={opcionesUsuario}
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

    const mapRecordToForm = useMemo(() => (record) => {
        let dir = {
            calle: '',
            numeroExterior: '',
            numeroInterior: '',
            colonia: '',
            codigoPostal: '',
            municipio: '',
            estado: '',
            entreCalles: '',
        };
        if (record.direccion) {
            try {
                const parsed = JSON.parse(record.direccion);
                if (typeof parsed === 'object' && parsed !== null) {
                    dir = { ...dir, ...parsed };
                } else {
                    dir.calle = String(record.direccion);
                }
            } catch {
                dir.calle = String(record.direccion);
            }
        }

        return {
            nombre: record.nombre ?? '',
            apellidoPaterno: record.apellidoPaterno ?? '',
            apellidoMaterno: record.apellidoMaterno ?? '',
            areaTrabajoId: record.areaTrabajo?.id ? String(record.areaTrabajo.id) : String(record.areaTrabajoId ?? ''),
            puestoId: record.puesto?.id ? String(record.puesto.id) : String(record.puestoId ?? ''),
            estadoEmpleadoId: record.estadoEmpleado?.id ? String(record.estadoEmpleado.id) : String(record.estadoEmpleadoId ?? ''),
            usuarioId: record.usuario?.id ? String(record.usuario.id) : String(record.usuarioId ?? ''),
            telefono: record.telefono ?? '',
            correo: record.correo ?? '',
            calle: dir.calle ?? '',
            numeroExterior: dir.numeroExterior ?? '',
            numeroInterior: dir.numeroInterior ?? '',
            colonia: dir.colonia ?? '',
            codigoPostal: dir.codigoPostal ?? '',
            municipio: dir.municipio ?? '',
            estado: dir.estado ?? '',
            entreCalles: dir.entreCalles ?? '',
            fechaNacimiento: record.fechaNacimiento ? new Date(record.fechaNacimiento).toISOString().split('T')[0] : '',
            fechaIngreso: record.fechaIngreso ? new Date(record.fechaIngreso).toISOString().split('T')[0] : '',
            imagenUrl: record.imagenUrl ?? '',
        };
    }, []);

    const mapFormToPayload = (form) => {
        const tieneDireccion =
            form.calle ||
            form.numeroExterior ||
            form.numeroInterior ||
            form.colonia ||
            form.codigoPostal ||
            form.municipio ||
            form.estado ||
            form.entreCalles;

        const direccion = tieneDireccion
            ? JSON.stringify({
                calle: form.calle?.trim() || '',
                numeroExterior: form.numeroExterior?.trim() || '',
                numeroInterior: form.numeroInterior?.trim() || '',
                colonia: form.colonia?.trim() || '',
                codigoPostal: form.codigoPostal?.trim() || '',
                municipio: form.municipio?.trim() || '',
                estado: form.estado?.trim() || '',
                entreCalles: form.entreCalles?.trim() || '',
            })
            : null;

        return {
            nombre: form.nombre.trim(),
            apellidoPaterno: form.apellidoPaterno.trim(),
            apellidoMaterno: form.apellidoMaterno ? form.apellidoMaterno.trim() : null,
            areaTrabajoId: Number(form.areaTrabajoId),
            puestoId: Number(form.puestoId),
            estadoEmpleadoId: Number(form.estadoEmpleadoId),
            usuarioId: form.usuarioId ? Number(form.usuarioId) : null,
            telefono: form.telefono.trim(),
            correo: form.correo ? form.correo.trim() : null,
            direccion,
            fechaNacimiento: form.fechaNacimiento,
            fechaIngreso: form.fechaIngreso,
            imagenUrl: form.imagenUrl || null,
        };
    };

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
            id: record.id,
            nombre: nombreCompleto || record.nombre,
            nombreCompleto,
            areaTrabajo: record.areaTrabajo?.nombre ?? '—',
            puesto: record.puesto?.nombre ?? '—',
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
            telefono: record.telefono ?? '—',
            correo: record.correo ?? '—',
        };
    };

    const validateForm = (form) => {
        const errors = {};
        if (!form.telefono || !/^\d{10}$/.test(form.telefono.trim())) {
            errors.telefono = 'El teléfono es obligatorio y debe contener exactamente 10 dígitos numéricos';
        }
        if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
            errors.correo = 'Formato de correo electrónico no válido';
        }
        if (form.fechaNacimiento) {
            const birth = new Date(form.fechaNacimiento);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            if (isNaN(age) || age < 18) {
                errors.fechaNacimiento = 'El empleado debe ser mayor de edad (mínimo 18 años)';
            }
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
            drawerSize={640}
            headerVariant="unified"
            tableHeaderVariant="neutral"
        />
    );
}

export default Empleados;
