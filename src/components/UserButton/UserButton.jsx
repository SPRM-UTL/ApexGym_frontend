import { Avatar, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { resolverUrlImagen } from '../../scripts/constantes.js';
import { SidebarUsuario } from '../SidebarUsuario/SidebarUsuario.jsx';
import classes from './UserButton.module.css';

const obtenerIniciales = (nombre = '') =>
    nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase())
        .join('') || 'AG';

export function UserButton({ usuario }) {
    const [opened, { open, close }] = useDisclosure(false);
    const rol = usuario?.roles?.[0]?.nombre || 'Sin rol asignado';

    return (
        <>
            <UnstyledButton
                className={classes.user}
                aria-label="Información del usuario actual"
                onClick={open}
            >
                <Group gap="sm" wrap="nowrap">
                    <Avatar
                        src={resolverUrlImagen(usuario?.fotoUrl)}
                        radius="xl"
                        color="apex"
                        alt={usuario?.nombre || 'Usuario actual'}
                        className={classes.avatar}
                    >
                        {obtenerIniciales(usuario?.nombre)}
                    </Avatar>

                    <div className={classes.details}>
                        <Text size="sm" fw={700} className={classes.name} truncate>
                            {usuario?.nombre || 'Usuario actual'}
                        </Text>

                        <Text size="xs" className={classes.meta} truncate>
                            {rol}
                        </Text>
                    </div>
                </Group>
            </UnstyledButton>

            <SidebarUsuario
                opened={opened}
                onClose={close}
                usuario={usuario}
            />
        </>
    );
}

export default UserButton;
