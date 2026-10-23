import { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    ActionIcon,
    Badge,
    Box,
    Checkbox,
    Divider,
    Group,
    Loader,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconEdit,
    IconSearch,
    IconShieldLock,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import classes from './AdministracionRoles.module.css';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre del Rol', required: true },
    { key: 'descripcion', label: 'Descripción' },
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', permisosIds: [] };

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

export function AdministracionRoles() {
    cambioNombreWeb('Administración de roles');

    const [permisos, setPermisos] = useState([]);
    const [cargandoPermisos, setCargandoPermisos] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        setCargandoPermisos(true);
        api.rol.obtenerPermisos()
            .then((response) => setPermisos(response.data ?? []))
            .catch(() => setPermisos([]))
            .finally(() => setCargandoPermisos(false));
    }, []);

    const permisosPorSeccion = useMemo(() => permisos.reduce((secciones, permiso) => {
        const nombreSeccion = permiso.modulo?.seccion?.nombre ?? 'General';
        const nombreModulo = permiso.modulo?.nombre ?? 'General';
        const termino = busqueda.trim().toLowerCase();
        const textoPermiso = `${nombreSeccion} ${nombreModulo} ${permiso.accion?.nombre ?? ''}`.toLowerCase();
        if (termino && !textoPermiso.includes(termino)) return secciones;
        secciones[nombreSeccion] ??= {};
        secciones[nombreSeccion][nombreModulo] ??= [];
        secciones[nombreSeccion][nombreModulo].push(permiso);
        return secciones;
    }, {}), [busqueda, permisos]);

    const renderForm = ({ form, errors, onChange }) => {
        const permisosSeleccionados = form.permisosIds ?? [];

        const alternarPermiso = (permisoId, activo) => {
            const id = String(permisoId);
            const siguientes = activo
                ? [...new Set([...permisosSeleccionados, id])]
                : permisosSeleccionados.filter((seleccionado) => seleccionado !== id);
            onChange('permisosIds', siguientes);
        };

        const alternarModuloCompleto = (itemsModulo, activarTodos) => {
            const idsModulo = itemsModulo.map((p) => String(p.id));
            const siguientes = activarTodos
                ? [...new Set([...permisosSeleccionados, ...idsModulo])]
                : permisosSeleccionados.filter((id) => !idsModulo.includes(id));
            onChange('permisosIds', siguientes);
        };

        return (
            <Stack gap="md" style={{ width: '100%' }}>
                <Box>
                    <SectionTitle>Datos del rol</SectionTitle>
                    <Stack gap="md">
                        <TextInput
                            label="Nombre del Rol"
                            placeholder="Ej. Instructor"
                            withAsterisk
                            size="md"
                            radius="md"
                            value={form.nombre ?? ''}
                            error={errors.nombre}
                            onChange={(e) => onChange('nombre', e.currentTarget.value)}
                        />
                        <Textarea
                            label="Descripción"
                            placeholder="Breve descripción de las responsabilidades del rol"
                            size="md"
                            radius="md"
                            minRows={2}
                            value={form.descripcion ?? ''}
                            error={errors.descripcion}
                            onChange={(e) => onChange('descripcion', e.currentTarget.value)}
                        />
                    </Stack>
                </Box>

                <Box className={classes.permissionsPanel}>
                    <SectionTitle>Permisos del rol</SectionTitle>

                    <TextInput
                        className={classes.search}
                        size="sm"
                        radius="md"
                        mb="sm"
                        placeholder="Filtrar por sección, módulo o acción…"
                        value={busqueda}
                        onChange={(event) => setBusqueda(event.currentTarget.value)}
                        leftSection={<IconSearch size={16} stroke={1.8} />}
                        aria-label="Buscar permisos"
                    />

                    {errors.permisosIds && (
                        <Text size="xs" c="red" fw={500} mb="xs">
                            {errors.permisosIds}
                        </Text>
                    )}

                    {cargandoPermisos ? (
                        <div className={classes.loadingPermissions}>
                            <Loader size="sm" color="apex" />
                            <Text size="sm" c="dimmed">Cargando permisos…</Text>
                        </div>
                    ) : (
                        <Accordion className={classes.accordion} multiple variant="separated" radius="md" defaultValue={[]}>
                            {Object.entries(permisosPorSeccion).map(([seccion, modulos]) => {
                                const permisosSeccion = Object.values(modulos).flat();
                                const activosSeccion = permisosSeccion.filter((permiso) =>
                                    permisosSeleccionados.includes(String(permiso.id))
                                ).length;

                                return (
                                    <Accordion.Item key={seccion} value={seccion}>
                                        <Accordion.Control>
                                            <Group justify="space-between" wrap="nowrap" pr="sm">
                                                <Text size="sm" fw={700} c="#1E293B">
                                                    {seccion}
                                                </Text>
                                                <Badge
                                                    size="sm"
                                                    variant="light"
                                                    color={activosSeccion > 0 ? 'green' : 'gray'}
                                                    radius="sm"
                                                    fw={700}
                                                >
                                                    {activosSeccion} / {permisosSeccion.length}
                                                </Badge>
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="sm">
                                                {Object.entries(modulos).map(([modulo, items]) => {
                                                    const activos = items.filter((permiso) =>
                                                        permisosSeleccionados.includes(String(permiso.id))
                                                    ).length;
                                                    const todosActivos = items.length > 0 && activos === items.length;
                                                    const algunosActivos = activos > 0 && activos < items.length;

                                                    return (
                                                        <div key={modulo} className={classes.moduleCard}>
                                                            <div className={classes.moduleCardHeader}>
                                                                <Text size="sm" fw={600} c="#1E293B">
                                                                    {modulo}
                                                                </Text>
                                                                <Checkbox
                                                                    size="xs"
                                                                    color="apex"
                                                                    label="Todos"
                                                                    checked={todosActivos}
                                                                    indeterminate={algunosActivos}
                                                                    onChange={(event) =>
                                                                        alternarModuloCompleto(items, event.currentTarget.checked)
                                                                    }
                                                                    styles={{
                                                                        label: {
                                                                            fontSize: 12,
                                                                            fontWeight: 600,
                                                                            color: '#475569',
                                                                            cursor: 'pointer',
                                                                            paddingLeft: 6,
                                                                        },
                                                                        input: { cursor: 'pointer' },
                                                                    }}
                                                                />
                                                            </div>
                                                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" verticalSpacing="xs" className={classes.switchesGrid}>
                                                                {items.map((permiso) => (
                                                                    <Switch
                                                                        key={permiso.id}
                                                                        size="sm"
                                                                        color="apex"
                                                                        checked={permisosSeleccionados.includes(String(permiso.id))}
                                                                        onChange={(event) =>
                                                                            alternarPermiso(permiso.id, event.currentTarget.checked)
                                                                        }
                                                                        label={permiso.accion?.nombre ?? 'Permiso'}
                                                                        styles={{
                                                                            label: { fontSize: 13, color: '#334155', cursor: 'pointer' },
                                                                        }}
                                                                    />
                                                                ))}
                                                            </SimpleGrid>
                                                        </div>
                                                    );
                                                })}
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                );
                            })}
                        </Accordion>
                    )}

                    {!cargandoPermisos && Object.keys(permisosPorSeccion).length === 0 && (
                        <Text size="sm" c="dimmed" ta="center" py="md">
                            No se encontraron permisos con ese criterio.
                        </Text>
                    )}
                </Box>
            </Stack>
        );
    };

    const validateForm = (form) => form.permisosIds?.length ? {} : { permisosIds: 'Selecciona al menos un permiso' };

    const mapRecordToForm = (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        permisosIds: (record.permisos ?? []).map((permiso) => String(permiso.id)),
    });

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        descripcion: form.descripcion,
        permisosIds: form.permisosIds ?? [],
    });

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre,
        descripcion: record.descripcion ?? '—',
        permisosLabel: (record.permisos ?? []).map((permiso) => `${permiso.modulo?.nombre}: ${permiso.accion?.nombre}`).join(', ') || 'Sin permisos',
    });

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Rol" withArrow openDelay={250}>
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
                <Tooltip label="Eliminar Rol" withArrow openDelay={250}>
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
            titulo="Administración de roles"
            singular="Rol"
            icon={IconShieldLock}
            servicio={api.rol}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            renderForm={renderForm}
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

export default AdministracionRoles;
