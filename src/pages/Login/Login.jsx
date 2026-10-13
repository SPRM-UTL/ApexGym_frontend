import {
    Anchor,
    Button,
    Checkbox,
    Paper,
    PasswordInput,
    Text,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState , useRef} from 'react';
import classes from './Login.module.css';
import { cambioNombreWeb } from '../../scripts/globales';
import { api } from '../../scripts/services/api.js';
import BackgruondLogin  from '../../components/BackgroudLogin/BackgroudLogin.jsx'
import logoImg from '../../assets/apex_gym.png';

export function Login({ onLoginAceptado }) {
    cambioNombreWeb('Iniciar sesión');

    const [errorCorreo, setErrorCorreo] = useState(false);
    const [errorContrasena, setErrorContrasena] = useState(false);
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');

    const [esPersistente, setEsPersistente] = useState(false);

    const passwordRef = useRef(null);
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

        try {
            const response = await api.user.login(correo, contrasena, esPersistente);

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al iniciar sesión');
            }

            notifications.show({
                title: '¡Bienvenido!',
                message: 'Has iniciado sesión correctamente.',
                color: 'green',
            });
            onLoginAceptado(/**response.data.token,**/ esPersistente, response.data.usuario); //Evitamos que ya no conteste con el token
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.message || 'Error al iniciar sesión',
                color: 'red',
            });
        }
    };

    return (
        <div className={classes.wrapper}>
            <BackgruondLogin />
            <Paper className={classes.form}>
                <div className={classes.logoContent}>
                    <img src={logoImg} alt="Apex Gym Logo" className={classes.brandIcon} />
                </div>

                <TextInput
                    label="Correo electrónico"
                    placeholder="hola@gmail.com"
                    size="md"
                    radius="md"
                    className='input'
                    value={correo}
                    onChange={(e) => {
                        setCorreo(e.target.value);
                        if (errorCorreo) setErrorCorreo(false);
                    }}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter'){
                            passwordRef.current?.focus();
                        }
                    }}
                    error={errorCorreo}
                />

                <PasswordInput
                    ref={passwordRef}
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
                    onKeyDown={(e)=> {
                        if(e.key === 'Enter'){
                            verificarLogin();
                        }
                    }}
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
            </Paper>
            
        </div>
        
        
    );
}

export default Login;
