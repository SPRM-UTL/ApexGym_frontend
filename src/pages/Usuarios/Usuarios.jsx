import { Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
import { ModalFormulario } from '../../components/ModalFormulario/ModalFormulario.jsx';
import { TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../../components/BarraAcciones/BarraAcciones.jsx';
import { api } from '../../scripts/services/api.js';
import classes from './Usuarios.module.css';

const COLUMNAS_USUARIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'email', label: 'Correo', sortable: true, filterable: true },
    { key: 'rolesLabel', label: 'Rol(es)', sortable: false, filterable: true },
];

export function Usuarios() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Carga de usuarios ────────────────────────────────────────────────────
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

    // ── Carga de roles ───────────────────────────────────────────────────────
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
            if (fotoPreview) URL.revokeObjectURL(fotoPreview);
        },
        [fotoPreview]
    );

    // Opciones para el Select de rol
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
                rolesLabel: userRoles.map((r) => r.nombre).join(', ') || '—',
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
                title: 'Error en el formulario',
                message: 'Por favor, revise los campos marcados en rojo.',
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
                    contrasena || undefined
                );
                alerta = {
                    title: 'Actualizado',
                    message: 'Usuario actualizado correctamente',
                    color: 'green',
                };
            } else {
                response = await api.user.register(nombre, correo, contrasena);
                alerta = {
                    title: 'Agregado',
                    message: 'Usuario agregado correctamente',
                    color: 'green',
                };
                usuarioId = response.data?.id;
            }

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al guardar usuario');
            }

            // Gestionar rol si hay un ID de usuario
            if (usuarioId) {
                const usuarioActual = users.find((u) => u.id === usuarioId);
                const rolActualId = String((usuarioActual?.roles ?? [])[0]?.id ?? '');
                const rolNuevoId = rolSeleccionado ?? '';

                if (rolNuevoId !== rolActualId) {
                    if (rolActualId) {
                        await api.user.removerRol(usuarioId, Number(rolActualId)).catch(() => null);
                    }
                    if (rolNuevoId) {
                        await api.user.asignarRol(usuarioId, Number(rolNuevoId)).catch(() => null);
                    }
                }
            }

            notifications.show(alerta);
            await fetchData();
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al guardar usuario',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }

        limpiarFormulario();
        setAbierto(false);
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
                <BarraAcciones onAdd={abrirAgregar} onReload={handleReload} />

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
                        onEditar={handleEditar}
                        onEliminar={solicitarEliminacion}
                        pageSizeOptions={[10, 25, 50, 100]}
                        loading={loading}
                    />
                )}
            </div>
        </>
    );
}
