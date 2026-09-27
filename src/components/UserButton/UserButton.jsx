import { Avatar, Group, Text, UnstyledButton } from '@mantine/core';
import classes from './UserButton.module.css';

const obtenerIniciales = (nombre = '') => nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'AG';

export function UserButton({ usuario }) {
    const rol = usuario?.roles?.[0]?.nombre || 'Sin rol asignado';

    return (
        <UnstyledButton className={classes.user} aria-label="Información del usuario actual">
            <Group gap="sm" wrap="nowrap">
                <Avatar
                    src={usuario?.fotoUrl || null}
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
    );
}
