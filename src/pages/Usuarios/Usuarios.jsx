import { IconBulb, IconCheckbox, IconSearch, IconUser, IconLogout, IconPlus } from '@tabler/icons-react';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Code,
    PasswordInput,
    Group,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
    Modal // <-- Importamos Modal directamente aquí
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { UserButton } from '../../components/UserButton/UserButton.jsx';
import classes from './Usuarios.module.css';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { TableSort } from '../../components/TableSort/TableSort.jsx';

const links = [
    { icon: IconBulb, label: 'Activity', notifications: 3 },
    { icon: IconCheckbox, label: 'Tasks', notifications: 4 },
    { icon: IconUser, label: 'Contacts' },
];

const collections = [
    { emoji: '👍', label: 'Sales', ruta: '/otra' },
    { emoji: '🚚', label: 'Deliveries', ruta: '/otra' },
    { emoji: '💸', label: 'Discounts', ruta: '/otra' },
    { emoji: '💰', label: 'Profits', ruta: '/otra' },
    { emoji: '✨', label: 'Reports', ruta: '/otra' },
    { emoji: '🛒', label: 'Orders', ruta: '/otra' },
    { emoji: '📅', label: 'Events', ruta: '/otra' },
    { emoji: '🙈', label: 'Debts', ruta: '/otra' },
    { emoji: '💁‍♀️', label: 'Usuarios', ruta: '/usuarios' },
];

export function Usuarios({ onLogout }) {
    // 1. Estado para abrir y cerrar el modal
    const [abierto, setAbierto] = useState(false);

    // 2. Estados del formulario para agregar usuario
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [rol, setRol] = useState('');

    const usuarios = [
        { Nombre: "Raul", Correo: "correo@gmail.com", Rol: "Admin" },
        { Nombre: "Raul2", Correo: "correo2@gmail.com", Rol: "Usuario" }
    ];

    const verificarCorreo = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const guardar = () => {
        if (!nombre || !correo || !contrasena || !rol || !verificarCorreo(correo)) {
            notifications.show({
                title: 'Campos incompletos o inválidos',
                message: 'Por favor, complete todos los campos correctamente.',
                color: 'red',
            });
            return;
        }

        const nuevoUsuario = { Nombre: nombre, Correo: correo, Contrasena: contrasena, Rol: rol };
        console.log("Usuario guardado:", nuevoUsuario);
        usuarios.push(nuevoUsuario);

        // Limpiar formulario y cerrar modal
        setNombre('');
        setCorreo('');
        setContrasena('');
        setRol('');
        setAbierto(false);
    };

    const mainLinks = links.map((link) => (
        <UnstyledButton key={link.label} className={classes.mainLink}>
            <div className={classes.mainLinkInner}>
                <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
                <span>{link.label}</span>
            </div>
            {link.notifications && (
                <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
                    {link.notifications}
                </Badge>
            )}
        </UnstyledButton>
    ));

    const collectionLinks = collections.map((collection) => (
        <Link to={collection.ruta} key={collection.label} className={classes.collectionLink}>
            <Box component="span" mr={9} fz={16}>{collection.emoji}</Box>{' '}
            {collection.label}
        </Link>
    ));

    return (
        <>
        <Modal
            opened={abierto}
            onClose={() => setAbierto(false)}
            title="Agregar Usuario"
            zIndex={999999}
            withinPortal={true}
            centered
        >
            <TextInput
                label="Nombre"
                placeholder="Juán Pérez"
                size="md"
                radius="md"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
            />
            <TextInput
                label="Correo electrónico"
                placeholder="hola@gmail.com"
                size="md"
                radius="md"
                mt="md"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
            />
            <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                mt="md"
                size="md"
                radius="md"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
            />
            <TextInput
                label="Rol"
                placeholder="Admin"
                size="md"
                radius="md"
                mt="md"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
            />
            <Button fullWidth onClick={guardar} mt="xl">
                Guardar
            </Button>
        </Modal>

        <div className={classes.layout}> 
            <nav className={classes.navbar}>
                <div className={classes.section}>
                    <UserButton />                    
                </div>

                <TextInput
                    placeholder="Search"
                    size="xs"
                    leftSection={<IconSearch size={12} stroke={1.5} />}
                    rightSectionWidth={70}
                    rightSection={<Code className={classes.searchCode}>Ctrl + K</Code>}
                    styles={{ section: { pointerEvents: 'none' } }}
                    mb="sm"
                    aria-label="Search"
                />

                <div className={classes.section}>
                    <div className={classes.mainLinks}>{mainLinks}</div>
                </div>

                <div className={`${classes.section} ${classes.collectionsWrapper}`}>
                    <Group className={classes.collectionsHeader} justify="space-between">
                        <Text size="xs" fw={500} c="dimmed">Collections</Text>
                        <Tooltip label="Create collection" withArrow position="right">
                            <ActionIcon variant="default" size={18} aria-label="Create collection">
                                <IconPlus size={12} stroke={1.5} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <div className={classes.collections}>{collectionLinks}</div>
                </div>

                <div className={classes.section}>
                    <div>
                        <a href="#" className={classes.link} onClick={(event) => { event.preventDefault(); onLogout(); }}>
                            <IconLogout className={classes.linkIcon} stroke={1.5} />
                            <span>Logout</span>
                        </a>
                    </div>
                </div>
            </nav>

            <div className={classes.content}>
                <h2>Usuarios</h2>

                <Button onClick={() => setAbierto(true)} mt="md">
                    Agregar
                </Button>
                
                <br /><br />
                <TableSort data={usuarios} onEditar={() => {}} onEliminar={() => {}}/>
            </div>
        </div>
        </>
    );
}