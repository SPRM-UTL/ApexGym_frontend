import { Button, PasswordInput, TextInput, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { TableSort } from '../../components/TableSort/TableSort.jsx';
import { api } from '../../scripts/services/api.js';

export function Usuarios() {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);

            const response = await api.user.obtenerTodos();

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al obtener usuarios');
            }

            setUsers(response.data);
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
    const [rol, setRol] = useState('');
    const [errores, setErrores] = useState({});

    const verificarCorreo = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const guardar = async () => {
        const nuevosErrores = {};

        if (!nombre.trim()) nuevosErrores.nombre = "El nombre es requerido";

        if (!correo.trim()) {
            nuevosErrores.correo = "El correo es requerido";
        } else if (!verificarCorreo(correo)) {
            nuevosErrores.correo = "El correo no es válido";
        }

        // Si estamos editando, la contraseña es opcional
        if (!contrasena.trim() && !usuarioEditando) nuevosErrores.contrasena = "La contraseña es requerida";

        if (!rol.trim()) nuevosErrores.rol = "El rol es requerido";

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
                alerta = { title: "Actualizado", message: "Usuario actualizado correctamente", color: "green" };
            } else {
                response = await api.user.register(nombre, correo, contrasena);
                alerta = { title: "Agregado", message: "Usuario agregado correctamente", color: "green" };
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
        setRol('');
        setErrores({});
        setUsuarioEditando(null);
    };

    const handleEditar = (usuario) => {
        setUsuarioEditando(usuario.id);
        setNombre(usuario.nombre);
        setCorreo(usuario.email);
        setRol(usuario.rol ?? '');
        setContrasena(''); // No mostramos la contraseña actual por seguridad
        setErrores({});
        setAbierto(true);
    };

    const handleEliminar = async (usuario) => {
        try {
            setLoading(true);

            const response = await api.user.eliminarUsuario(usuario.id);

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al eliminar usuario');
            }

            await fetchData();
            notifications.show({ title: 'Eliminado', message: 'Usuario eliminado correctamente.', color: 'blue' });
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

    const handleReload = () => {
        fetchData();
        notifications.show({ title: 'Recargado', message: 'Datos recargados exitosamente.', color: 'teal' });
    };

    return (
        <>
            <Modal
                opened={abierto}
                onClose={() => {
                    setAbierto(false);
                    limpiarFormulario();
                }}
                title={usuarioEditando ? "Editar Usuario" : "Agregar Usuario"}
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
                    label={usuarioEditando ? "Nueva Contraseña (opcional)" : "Contraseña"}
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
                <TextInput
                    label="Rol"
                    placeholder="Admin"
                    size="md"
                    radius="md"
                    mt="md"
                    value={rol}
                    onChange={(e) => {
                        setRol(e.target.value);
                        setErrores((prev) => ({ ...prev, rol: null }));
                    }}
                    error={errores.rol}
                />
                <Button fullWidth onClick={guardar} mt="xl">
                    {usuarioEditando ? "Actualizar" : "Guardar"}
                </Button>
            </Modal>

            <div>
                <h2>Usuarios</h2>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <Button onClick={() => setAbierto(true)}>
                        Agregar
                    </Button>
                    <Button variant="light" onClick={handleReload}>
                        Recargar
                    </Button>
                </div>

                <br />
                <TableSort
                    data={users}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                />
            </div>
        </>
    );
}