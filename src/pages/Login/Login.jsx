import {
    Anchor,
    Button,
    Checkbox,
    Paper,
    PasswordInput,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import PantallaCarga from '../../components/PantallaCarga';
import { useState } from 'react';
import classes from './Login.module.css';
import { cambioNombreWeb } from '../../scripts/globales';
import { useNavigate } from 'react-router-dom';

export function Login({ onLoginAceptado }) {
    const navigate = useNavigate();

    cambioNombreWeb('Iniciar sesión');

    const [cargando, setCargando] = useState(false);

    const [errorCorreo, setErrorCorreo] = useState(false);
    const [errorContrasena, setErrorContrasena] = useState(false);
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');

    const [esPersistente, setEsPersistente] = useState(false);

    const verificarDatos = () => {
        let hayError = false;

        if (correo === '' || !verificarCorreo(correo)) {
            setErrorCorreo(true);
            hayError = true;
        } else {
            setErrorCorreo(false);
        }

        if (contrasena === '') {
            setErrorContrasena(true);
            hayError = true;
        } else {
            setErrorContrasena(false);
        }

        if (hayError) {
            notifications.show({
                title: 'Campos incompletos',
                message: 'Por favor, complete todos los campos.',
                color: 'red',
            });
            return false;
        }
        return true;
    }

    const verificarCorreo = (correo) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(correo);
    }

    const verificarLogin = async () => {
        if (!verificarDatos()) return;

        setCargando(true);

        try {
            let response = await new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ responseFlag: 0, message: 'Éxito' });
                }, 1000);
            });

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al iniciar sesión');
            } else {
                notifications.show({
                    title: '¡Bienvenido!',
                    message: 'Has iniciado sesión correctamente.',
                    color: 'green',
                });
                onLoginAceptado("TOKEN_DE_EJEMPLO", esPersistente);
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.message || 'Error al iniciar sesión',
                color: 'red',
            });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.form}>
                <Title order={2} className={classes.title}>
                    Bienvenido a ApexGym
                </Title>

                <TextInput
                    label="Correo electrónico"
                    placeholder="hola@gmail.com"
                    size="md"
                    radius="md"
                    value={correo}
                    onChange={(e) => {
                        setCorreo(e.target.value);
                        if (errorCorreo) setErrorCorreo(false);
                    }}
                    error={errorCorreo}
                />

                <PasswordInput
                    label="Contraseña"
                    placeholder="Tu contraseña"
                    mt="md"
                    size="md"
                    radius="md"
                    value={contrasena}
                    onChange={(e) => {
                        setContrasena(e.target.value);
                        if (errorContrasena) setErrorContrasena(false);
                    }}
                    error={errorContrasena}
                />

                <Checkbox
                    label="Mantenerme conectado"
                    mt="xl"
                    size="md"
                    checked={esPersistente}
                    onChange={(e) => setEsPersistente(e.target.checked)}
                />

                <Button fullWidth mt="xl" size="md" radius="md" onClick={verificarLogin}>
                    Iniciar sesión
                </Button>
                {cargando && <PantallaCarga />}
            </Paper>
        </div>
    );
}

export default Login;
