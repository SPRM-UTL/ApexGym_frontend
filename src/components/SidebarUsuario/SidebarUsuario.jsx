import {
    Avatar,
    Badge,
    Drawer,
    Text,
    Title,
} from '@mantine/core';
import {
    IconMail,
    IconShieldCheck,
} from '@tabler/icons-react';
import { resolverUrlImagen } from '../../scripts/constantes.js';
import classes from './SidebarUsuario.module.css';

const obtenerIniciales = (nombre = '') =>
    nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase())
        .join('') || 'AG';

/**
 * Sidebar lateral derecha que despliega los datos del usuario activo en estilo claro.
 */
export function SidebarUsuario({ opened, onClose, usuario }) {
    if (!usuario) return null;

    const iniciales = obtenerIniciales(usuario.nombre);
    const foto = resolverUrlImagen(usuario.fotoUrl);
    const roles = Array.isArray(usuario.roles) ? usuario.roles : [];
    const rolPrincipal = roles[0]?.nombre || 'Sin rol asignado';

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size="360px"
            title="Información del Usuario"
            classNames={{
                header: classes.drawerHeader,
                title: classes.drawerTitle,
                close: classes.drawerClose,
                body: classes.drawerBody,
            }}
        >
            {/* Tarjeta Hero del Perfil en Estilo Claro */}
            <div className={classes.profileHero}>
                <Avatar
                    src={foto}
                    radius="xl"
                    alt={usuario.nombre || 'Usuario'}
                    className={classes.avatar}
                >
                    <Text className={classes.avatarInitials}>
                        {iniciales}
                    </Text>
                </Avatar>

                <Title order={3} className={classes.userName}>
                    {usuario.nombre || 'Usuario ApexGym'}
                </Title>

                {usuario.email && (
                    <Text className={classes.userEmailSub}>
                        {usuario.email}
                    </Text>
                )}

                <div className={classes.rolesGroup}>
                    {roles.length > 0 ? (
                        roles.map((r, i) => (
                            <Badge
                                key={r.id || i}
                                size="sm"
                                radius="sm"
                                className={classes.roleBadge}
                            >
                                {r.nombre}
                            </Badge>
                        ))
                    ) : (
                        <Badge size="sm" radius="sm" className={classes.roleBadge}>
                            {rolPrincipal}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Tarjeta de detalles (únicamente correo y rol) */}
            <div className={classes.infoCard}>
                <div className={classes.cardSectionTitle}>Datos de la cuenta</div>

                <div className={classes.infoRow}>
                    <div className={classes.infoIconWrapper}>
                        <IconMail size={18} stroke={1.8} />
                    </div>
                    <div className={classes.infoMeta}>
                        <div className={classes.infoLabel}>Correo electrónico</div>
                        <div className={classes.infoValue}>{usuario.email || 'No registrado'}</div>
                    </div>
                </div>

                <div className={classes.infoRow}>
                    <div className={classes.infoIconWrapper}>
                        <IconShieldCheck size={18} stroke={1.8} />
                    </div>
                    <div className={classes.infoMeta}>
                        <div className={classes.infoLabel}>Rol principal</div>
                        <div className={classes.infoValue}>{rolPrincipal}</div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}

export default SidebarUsuario;
