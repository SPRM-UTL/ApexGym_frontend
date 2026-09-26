import { Button, PasswordInput, TextInput, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState ,useRef} from 'react';
import { TableSort } from '../../components/TableSort/TableSort.jsx';
import { exportXLSX, exportCSV, exportPDF, exportPDFCanvas } from '../../components/ReportComponent/ReporFile.jsx';

export function Usuarios() {
    const defaultUsuarios = [
        { Nombre: "Raul", Correo: "correo@gmail.com", Rol: "Admin" },
        { Nombre: "Raul2", Correo: "correo2@gmail.com", Rol: "Usuario" }
    ];

    const tablaRef = useRef(null);

    const [usuarios, setUsuarios] = useState(defaultUsuarios);
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

    const guardar = () => {
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

        if (usuarioEditando) {
            setUsuarios(usuarios.map(u =>
                u.Correo === usuarioEditando ? { Nombre: nombre, Correo: correo, Rol: rol } : u
            ));
            notifications.show({ title: 'Actualizado', message: 'Usuario actualizado correctamente.', color: 'green' });
        } else {
            setUsuarios([...usuarios, { Nombre: nombre, Correo: correo, Rol: rol }]);
            notifications.show({ title: 'Guardado', message: 'Usuario agregado correctamente.', color: 'green' });
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
        setUsuarioEditando(usuario.Correo);
        setNombre(usuario.Nombre);
        setCorreo(usuario.Correo);
        setRol(usuario.Rol);
        setContrasena(''); // No mostramos la contraseña actual por seguridad
        setErrores({});
        setAbierto(true);
    };

    const handleEliminar = (usuario) => {
        setUsuarios(usuarios.filter(u => u.Correo !== usuario.Correo));
        notifications.show({ title: 'Eliminado', message: 'Usuario eliminado correctamente.', color: 'blue' });
    };

    const handleReload = () => {
        setUsuarios(defaultUsuarios);
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
                    <Button variant='ontline' color='green' onClick={()=> exportXLSX(usuarios,'Reporte-Usuarios')}>XLSX</Button>
                    <Button variant='ontline' color='green' onClick={()=> exportCSV(usuarios,'Reporte-Usuarios')}>CSV</Button>
                    <Button variant='ontline' color='green' onClick={()=> exportPDF(usuarios,'Reporte-Usuarios', 'Usuarios del GYM')}>PDF</Button>
                    <Button variant='ontline' color='green' onClick={()=> exportPDFCanvas(tablaRef.current,'Reporte-Usuarios')}>PDF CANVAS</Button>
                </div>

                <br />
                <div ref={tablaRef} className='pdf-export-container'>
                    <TableSort
                    data={usuarios}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                />
                </div>
                
            </div>
        </>
    );
}