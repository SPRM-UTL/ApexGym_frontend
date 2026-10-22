import { ActionIcon, Badge, Button, Group, Loader, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
import { ModalFormulario } from '../../components/ModalFormulario/ModalFormulario.jsx';
import { TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';
import { api } from '../../scripts/services/api.js';
import {
    guardarUsuarioActual,
    obtenerUsuarioActual,
    resolverUrlImagen,
    VariablesLocales,
} from '../../scripts/constantes.js';
import { cambioNombreWeb, obtenerValor } from '../../scripts/globales.js';
import classes from './Usuarios.module.css';

const COLUMNAS_USUARIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'email', label: 'Correo', sortable: true, filterable: true },
    { key: 'rolesLabel', label: 'Rol(es)', sortable: false, filterable: true },
];

export function Usuarios() {
    cambioNombreWeb('Usuarios');

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const resUsuarios = await api.user.obtenerTodos();
            if (resUsuarios.responseFlag !== 0) {
                throw new Error(resUsuarios.message || 'Error al obtener usuarios');
            }
            setUsers(resUsuarios.data ?? []);
            setError(null);
        } catch (err) {
            setError(err.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            setLoadingRoles(true);
            const res = await api.rol.obtenerTodos();
            setRoles(res.data ?? []);
        } catch (err) {
            console.warn('[Roles] No se pudieron cargar los roles:', err?.message ?? err);
            setRoles([]);
        } finally {
            setLoadingRoles(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchRoles();
    }, []);

    const [abierto, setAbierto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [registroPendiente, setRegistroPendiente] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [rolSeleccionado, setRolSeleccionado] = useState(null);
    const [fotoUsuario, setFotoUsuario] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [errores, setErrores] = useState({});

    useEffect(
        () => () => {
            if (fotoPreview && fotoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(fotoPreview);
            }
        },
        [fotoPreview]
    );

    const opcionesRoles = useMemo(
        () => roles.map((r) => ({ value: String(r.id), label: r.nombre })),
        [roles]
    );

    const datosTabla = useMemo(
        () =>
            users.map(({ id, nombre: n, email, roles: userRoles = [] }) => ({
                id,
                nombre: n,
                email,
                rolesLabel:
                    userRoles.length > 0 ? (
                        <Group gap={6} wrap="wrap">
                            {userRoles.map((r) => (
                                <Badge
                                    key={r.id ?? r.nombre}
                                    size="sm"
                                    variant="light"
                                    color="blue"
                                    radius="sm"
                                    fw={700}
                                >
                                    {String(r.nombre).toUpperCase()}
                                </Badge>
                            ))}
                        </Group>
                    ) : (
                        <Badge size="sm" variant="light" color="gray" radius="sm" fw={700}>
                            SIN ROL
                        </Badge>
                    ),
            })),
        [users]
    );

    const verificarCorreo = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const limpiarFormulario = () => {
        setNombre('');
        setCorreo('');
        setContrasena('');
        setRolSeleccionado(null);
        setFotoUsuario(null);
        setFotoPreview(null);
        setErrores({});
        setUsuarioEditando(null);
    };

    const manejarCambioFormulario = (campo, valor) => {
        const setters = {
            nombre: setNombre,
            correo: setCorreo,
            contrasena: setContrasena,
            rolSeleccionado: setRolSeleccionado,
        };

        setters[campo]?.(valor);
        setErrores((prev) => ({ ...prev, [campo]: null }));
    };

    const manejarFoto = (archivos) => {
        const archivo = archivos[0] ?? null;
        setFotoUsuario(archivo);
        setFotoPreview(archivo ? URL.createObjectURL(archivo) : null);
    };

    const rechazarFoto = () => {
        notifications.show({
            title: 'Imagen no válida',
            message: 'Selecciona una imagen de máximo 5 MB.',
            color: 'red',
        });
    };

    const guardar = async () => {
        const nuevosErrores = {};

        if (!nombre.trim()) nuevosErrores.nombre = 'El nombre es requerido';

        if (!correo.trim()) {
            nuevosErrores.correo = 'El correo es requerido';
        } else if (!verificarCorreo(correo)) {
            nuevosErrores.correo = 'El correo no es válido';
        }

        if (!contrasena.trim() && !usuarioEditando) {
            nuevosErrores.contrasena = 'La contraseña es requerida';
        }

        if (!usuarioEditando && !rolSeleccionado) {
            nuevosErrores.rol = 'Selecciona un rol';
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            notifications.show({
                title: 'Formulario incompleto',
                message: 'Revisa los campos marcados.',
                color: 'red',
            });
            return;
        }

        try {
            setLoading(true);

            let response;
            let alerta;
            let usuarioId = usuarioEditando;

            if (usuarioEditando) {
                response = await api.user.actualizarUsuario(
                    usuarioEditando,
                    nombre,
                    correo,
                    contrasena || undefined,
                    rolSeleccionado,
                    fotoUsuario
                );
                alerta = {
                    title: 'Actualizado',
                    message: 'Usuario actualizado correctamente.',
                    color: 'green',
                };
            } else {
                response = await api.user.register(
                    nombre,
                    correo,
                    contrasena,
                    rolSeleccionado,
                    fotoUsuario
                );
                alerta = {
                    title: 'Agregado',
                    message: 'Usuario agregado correctamente.',
                    color: 'green',
                };
                usuarioId = response.data?.id;
            }

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al guardar usuario');
            }

            if (usuarioId) {
                const sesionUsuario = obtenerUsuarioActual();
                if (sesionUsuario && Number(sesionUsuario.id) === Number(usuarioId)) {
                    const esPersistente = Boolean(obtenerValor(VariablesLocales.USUARIO, 'local'));
                    guardarUsuarioActual(
                        {
                            ...sesionUsuario,
                            ...response.data,
                        },
                        esPersistente
                    );
                }
            }

            notifications.show(alerta);
            await fetchData();
            limpiarFormulario();
            setAbierto(false);
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al guardar usuario',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const abrirAgregar = () => {
        limpiarFormulario();
        setAbierto(true);
    };

    const handleEditar = useCallback(
        (usuario) => {
            const completo = users.find((u) => u.id === usuario.id) ?? usuario;
            setUsuarioEditando(completo.id);
            setNombre(completo.nombre ?? '');
            setCorreo(completo.email ?? '');
            setContrasena('');
            const primerRol = (completo.roles ?? [])[0];
            setRolSeleccionado(primerRol ? String(primerRol.id) : null);
            setFotoUsuario(null);
            setFotoPreview(resolverUrlImagen(completo.fotoUrl));
            setErrores({});
            setAbierto(true);
        },
        [users]
    );

    const solicitarEliminacion = (usuario) => {
        setRegistroPendiente(usuario);
    };

    const cancelarEliminacion = () => {
        if (!eliminando) setRegistroPendiente(null);
    };

    const confirmarEliminacion = async () => {
        if (!registroPendiente) return;

        try {
            setEliminando(true);
            setLoading(true);

            const response = await api.user.eliminarUsuario(registroPendiente.id);

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al eliminar usuario');
            }

            await fetchData();
            notifications.show({
                title: 'Eliminado',
                message: 'Usuario eliminado correctamente.',
                color: 'green',
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al eliminar usuario',
                color: 'red',
            });
        } finally {
            setEliminando(false);
            setLoading(false);
        }

        setRegistroPendiente(null);
    };

    const handleReload = () => {
        fetchData();
        fetchRoles();
    };

    const renderAccionesFila = (fila) => (
        <Group gap={6} wrap="nowrap">
            <Tooltip label="Editar Usuario" withArrow openDelay={250}>
                <ActionIcon
                    variant="light"
                    color="blue"
                    size="md"
                    radius="md"
                    onClick={() => handleEditar(fila)}
                >
                    <IconEdit size={17} stroke={1.8} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="Eliminar Usuario" withArrow openDelay={250}>
                <ActionIcon
                    variant="light"
                    color="red"
                    size="md"
                    radius="md"
                    onClick={() => solicitarEliminacion(fila)}
                >
                    <IconTrash size={17} stroke={1.8} />
                </ActionIcon>
            </Tooltip>
        </Group>
    );

    return (
        <>
            <ModalConfirmacion
                opened={Boolean(registroPendiente)}
                onClose={cancelarEliminacion}
                onConfirm={confirmarEliminacion}
                loading={eliminando}
                title="Confirmar eliminación"
                message={`¿Deseas eliminar el registro de ${registroPendiente?.nombre ?? 'este usuario'}? Esta acción no se puede deshacer.`}
            />
            <ModalFormulario
                abierto={abierto}
                usuarioEditando={usuarioEditando}
                loadingRoles={loadingRoles}
                opcionesRoles={opcionesRoles}
                loading={loading}
                form={{
                    nombre,
                    correo,
                    contrasena,
                    rolSeleccionado,
                    fotoUsuario,
                    fotoPreview,
                }}
                errores={errores}
                onClose={() => {
                    setAbierto(false);
                    limpiarFormulario();
                }}
                onGuardar={guardar}
                onChange={manejarCambioFormulario}
                onFotoDrop={manejarFoto}
                onFotoReject={rechazarFoto}
            />

            <div className={classes.crudLayout}>
                <div className={classes.unifiedHeader}>
                    <Group gap="sm" align="center">
                        <ThemeIcon size={38} radius="md" variant="light" color="apex">
                            <IconUsers size={22} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={2} className={classes.unifiedTitle}>
                            Usuarios
                        </Title>
                    </Group>
                    <Button
                        className={classes.addButtonUnified}
                        onClick={abrirAgregar}
                        aria-label="Agregar usuario"
                        leftSection={<IconPlus size={18} stroke={2.2} />}
                        size="md"
                        radius="md"
                        styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
                    >
                        Agregar
                    </Button>
                </div>

                {error && <div className={classes.errorBanner}>{error}</div>}

                {loading && users.length === 0 ? (
                    <div className={classes.loadingBanner}>
                        <Group justify="center" gap="sm">
                            <Loader size="sm" color="apex" />
                            Cargando usuarios…
                        </Group>
                    </div>
                ) : (
                    <TablaRegistros
                        data={datosTabla}
                        columns={COLUMNAS_USUARIOS}
                        renderAcciones={renderAccionesFila}
                        entityLabel="usuario"
                        pageSizeOptions={[10, 25, 50, 100]}
                        loading={loading}
                        onReload={handleReload}
                        headerVariant="neutral"
                    />
                )}
            </div>
        </>
    );
}

export default Usuarios;
