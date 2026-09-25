import { Button, PasswordInput, TextInput, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { TableSort } from '../../components/TableSort/TableSort.jsx';

export function Usuarios() {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true); // Iniciamos carga (opcional si el estado inicial ya es true)

            const response = await fetch("http://localhost:3000/api/usuarios");

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const jsonData = await response.json();
            setUsers(jsonData.data);
            setError(null);
        } catch (err) {
            setError(err.message);
            setUsers(null);
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

            const usuario = {
                    nombre: nombre,
                    email: correo,
                    contrasenia: contrasena
                }

            const alerta = {
                title: "Agregado",
                message: "Usuario agregado correctamente",
                color: "green"
            }
            
            let ruta = "http://localhost:3000/api/usuarios/registrarUsuario";
            let metodo = "POST";

            if (usuarioEditando) {

                usuario.id = usuarioEditando;
                ruta = "http://localhost:3000/api/usuarios/actualizarUsuario";
                metodo = "PUT";
                alerta.title = "Actualizado";
                alerta.message = "Usuario actualizado correctamente";

            } 

            const response = await fetch(
                    ruta,
                    {
                        method: metodo,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(usuario)
                    }
                );

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            notifications.show({ title: alerta.title, message: alerta.message, color: alerta.color });
            fetchData()
        } catch (err) {
            setError(err.message);
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
        console.log("usuario: " + usuario.nombre)
        setUsuarioEditando(usuario.id);
        setNombre(usuario.nombre);
        setCorreo(usuario.email);
        setRol(usuario.rol);
        setContrasena(''); // No mostramos la contraseña actual por seguridad
        setErrores({});
        setAbierto(true);
    };

    const handleEliminar = async (usuario) => {
        try {
            setLoading(true);

            const response = await fetch("http://localhost:3000/api/usuarios/eliminarUsuario", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: usuario.id
                }),
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            fetchData()
            notifications.show({ title: 'Eliminado', message: 'Usuario eliminado correctamente.', color: 'blue' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        fetchData()
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