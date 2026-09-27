import { useEffect, useMemo, useState } from 'react';
import { Accordion, Badge, Group, Loader, Stack, Switch, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import classes from './AdministracionRoles.module.css';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Instructor' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', minRows: 3 },
];

const COLUMNAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

const INICIAL = { nombre: '', descripcion: '', permisosIds: [] };

export function AdministracionRoles() {
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

    const renderFormExtra = ({ form, errors, onChange }) => {
        const permisosSeleccionados = form.permisosIds ?? [];

        const alternarPermiso = (permisoId, activo) => {
            const id = String(permisoId);
            const siguientes = activo
                ? [...new Set([...permisosSeleccionados, id])]
                : permisosSeleccionados.filter((seleccionado) => seleccionado !== id);
            onChange('permisosIds', siguientes);
        };

        return (
            <Stack gap="xs" className={classes.permissionsPanel}>
                <Group justify="space-between" align="end" gap="sm">
                    <Text size="sm" fw={600}>Permisos</Text>
                    <TextInput
                        className={classes.search}
                        size="xs"
                        placeholder="Buscar módulo o acción"
                        value={busqueda}
                        onChange={(event) => setBusqueda(event.currentTarget.value)}
                        leftSection={<IconSearch size={14} stroke={1.8} />}
                        aria-label="Buscar permisos"
                    />
                </Group>

                {cargandoPermisos ? (
                    <div className={classes.loadingPermissions}>
                        <Loader size="sm" color="apex" />
                        <Text size="sm" c="dimmed">Cargando permisos…</Text>
                    </div>
                ) : (
                    <Accordion className={classes.accordion} multiple variant="separated" radius="md" defaultValue={[]}>
                        {Object.entries(permisosPorSeccion).map(([seccion, modulos]) => {
                            const permisosSeccion = Object.values(modulos).flat();
                            const activosSeccion = permisosSeccion.filter((permiso) => permisosSeleccionados.includes(String(permiso.id))).length;

                            return (
                                <Accordion.Item key={seccion} value={seccion}>
                                    <Accordion.Control>
                                        <Stack gap={2}>
                                            <Text size="sm" fw={700}>{seccion}</Text>
                                            <Badge size="xs" className={classes.permissionBadge} w="fit-content">
                                                {activosSeccion} de {permisosSeccion.length} permisos
                                            </Badge>
                                        </Stack>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Accordion className={classes.moduleAccordion} multiple variant="separated" radius="sm" defaultValue={[]}>
                                            {Object.entries(modulos).map(([modulo, items]) => {
                                                const activos = items.filter((permiso) => permisosSeleccionados.includes(String(permiso.id))).length;

                                                return (
                                                    <Accordion.Item key={modulo} value={modulo}>
                                                        <Accordion.Control>
                                                            <Group justify="space-between" wrap="nowrap" pr="sm">
                                                                <Text size="sm" fw={600}>{modulo}</Text>
                                                                <Text size="xs" c="dimmed">{activos}/{items.length}</Text>
                                                            </Group>
                                                        </Accordion.Control>
                                                        <Accordion.Panel>
                                                            <Stack gap="sm">
                                                                {items.map((permiso) => (
                                                                    <Switch
                                                                        key={permiso.id}
                                                                        size="sm"
                                                                        color="apex"
                                                                        checked={permisosSeleccionados.includes(String(permiso.id))}
                                                                        onChange={(event) => alternarPermiso(permiso.id, event.currentTarget.checked)}
                                                                        label={permiso.accion?.nombre ?? 'Permiso'}
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        </Accordion.Panel>
                                                    </Accordion.Item>
                                                );
                                            })}
                                        </Accordion>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            );
                        })}
                    </Accordion>
                )}
                {!cargandoPermisos && Object.keys(permisosPorSeccion).length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="md">No se encontraron permisos.</Text>
                )}
                {errors.permisosIds && <Text size="xs" c="red">{errors.permisosIds}</Text>}
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

    return <CrudCatalogo titulo="Administración de roles" singular="Rol" servicio={api.rol} columnas={COLUMNAS} campos={CAMPOS} valoresIniciales={INICIAL} mapRecordToForm={mapRecordToForm} mapFormToPayload={mapFormToPayload} mapRecordToRow={mapRecordToRow} renderFormExtra={renderFormExtra} validateForm={validateForm} formLayout="columns" />;
}

export default AdministracionRoles;
