import { Button, Group, Loader, Modal, PasswordInput, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    IconPencil,
    IconPlus,
    IconReload,
} from '@tabler/icons-react';
import { TableSort } from '../../components/TableSort/TableSort.jsx';
import { api } from '../../scripts/services/api.js';
import classes from './Usuarios.module.css';

const COLUMNAS_USUARIOS = [
    { key: 'id', label: 'ID', sortable: true, filterable: true },
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'email', label: 'Correo', sortable: true, filterable: true },
];

function exportarCsv(filas, columnas) {
    const headers = columnas.map((c) => c.label).join(',');
    const body = filas
        .map((fila) =>
            columnas
                .map((c) => {
                    const valor = String(fila[c.key] ?? '').replace(/"/g, '""');
                    return `"${valor}"`;
                })
                .join(',')
        )
        .join('\n');

    const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function Usuarios() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [seleccionados, setSeleccionados] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const response = await api.user.obtenerTodos();

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al obtener usuarios');
            }

            setUsers(response.data ?? []);
            setError(null);
        } catch (err) {
            setError(err.message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const [abierto, setAbierto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);

    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [errores, setErrores] = useState({});

    const datosTabla = useMemo(
        () =>
            users.map(({ id, nombre: n, email }) => ({
                id,
                nombre: n,
                email,
            })),
        [users]
    );

    const verificarCorreo = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
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
            }

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al guardar usuario');
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

    const limpiarFormulario = () => {
        setNombre('');
        setCorreo('');
        setContrasena('');
        setErrores({});
        setUsuarioEditando(null);
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
            setErrores({});
            setAbierto(true);
        },
        [users]
    );

    const editarSeleccionado = () => {
        if (seleccionados.length !== 1) {
            notifications.show({
                title: 'Selección requerida',
                message: 'Selecciona un solo usuario para editar.',
                color: 'orange',
            });
            return;
        }
        handleEditar(seleccionados[0]);
    };

    const handleEliminar = async (usuario) => {
        try {
            setLoading(true);

            const response = await api.user.eliminarUsuario(usuario.id);

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
            setLoading(false);
        }
    };

    const handleExport = () => {
        const filas = seleccionados.length > 0 ? seleccionados : datosTabla;
        exportarCsv(filas, COLUMNAS_USUARIOS);
        notifications.show({
            title: 'Exportación',
            message: 'Archivo CSV generado.',
            color: 'teal',
        });
    };

    const handleSettings = () => {
        notifications.show({
            title: 'Configuración',
            message: 'Opciones avanzadas del módulo próximamente.',
            color: 'gray',
        });
    };

    return (
        <>
            <Modal
                opened={abierto}
                onClose={() => {
                    setAbierto(false);
                    limpiarFormulario();
                }}
                title={usuarioEditando ? 'Editar usuario' : 'Agregar usuario'}
                zIndex={999999}
                centered
            >
                <TextInput
                    label="Nombre"
                    placeholder="Juán Pérez"
                    size="md"
                    radius="md"
                    value={nombre}
                    onChange={(e) => {
                        setNombre(e.target.value);
                        setErrores((prev) => ({ ...prev, nombre: null }));
                    }}
                    error={errores.nombre}
                />
                <TextInput
                    label="Correo electrónico"
                    placeholder="hola@gmail.com"
                    size="md"
                    radius="md"
                    mt="md"
                    value={correo}
                    onChange={(e) => {
                        setCorreo(e.target.value);
                        setErrores((prev) => ({ ...prev, correo: null }));
                    }}
                    error={errores.correo}
                />
                <PasswordInput
                    label={usuarioEditando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                    placeholder="Tu contraseña"
                    mt="md"
                    size="md"
                    radius="md"
                    value={contrasena}
                    onChange={(e) => {
                        setContrasena(e.target.value);
                        setErrores((prev) => ({ ...prev, contrasena: null }));
                    }}
                    error={errores.contrasena}
                />
                <Button fullWidth onClick={guardar} mt="xl">
                    {usuarioEditando ? 'Actualizar' : 'Guardar'}
                </Button>
            </Modal>

            <div className={classes.crudLayout}>
                <div className={classes.actionBar}>
                    <div className={classes.actionGroup}>
                        <Button
                            className={classes.btnAdd}
                            onClick={abrirAgregar}
                        >
                            <IconPlus size={16} stroke={2} />   
                        </Button>
                    </div>
                    <div className={classes.actionGroup}>
                        <Button
                            className={classes.btnSettings}
                            px="sm"
                            aria-label="Configuración"
                            onClick={handleSettings}
                        >
                            <IconReload size={18} stroke={1.8} />
                        </Button>
                    </div>
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
                    <TableSort
                        data={datosTabla}
                        columns={COLUMNAS_USUARIOS}
                        onEditar={handleEditar}
                        onEliminar={handleEliminar}
                        onSelectionChange={setSeleccionados}
                        pageSizeOptions={[10, 25, 50, 100]}
                    />
                )}
            </div>
        </>
    );
}
