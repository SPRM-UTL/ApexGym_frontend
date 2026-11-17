import { useState } from 'react';
import {
    Avatar,
    Badge,
    Drawer,
    Group,
    Modal,
    Stack,
    Text,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconMail,
    IconShieldCheck,
    IconUser,
    IconZoomIn,
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
 * Sidebar lateral derecha que despliega los datos del usuario activo en estilo homologado.
 */
export function SidebarUsuario({ opened, onClose, usuario }) {
    const [lightboxAbierto, setLightboxAbierto] = useState(false);

    if (!usuario) return null;

    const iniciales = obtenerIniciales(usuario.nombre);
    const foto = resolverUrlImagen(usuario.fotoUrl);
    const roles = Array.isArray(usuario.roles) ? usuario.roles : [];
    const rolPrincipal = roles[0]?.nombre || 'Sin rol asignado';

    return (
        <>
            <Drawer
                opened={opened}
                onClose={onClose}
                position="right"
                size="380px"
                overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
                zIndex={999999}
                title={
                    <Group gap="sm">
                        <IconUser size={22} stroke={1.8} color="var(--ag-color-primary)" />
                        <div>
                            <Title order={4} fw={700} c="#1E293B">
                                Información del Usuario
                            </Title>
                            <Text size="xs" c="dimmed">
                                Detalles del perfil y permisos de la cuenta
                            </Text>
                        </div>
                    </Group>
                }
                classNames={{
                    header: classes.drawerHeader,
                    title: classes.drawerTitle,
                    close: classes.drawerClose,
                    body: classes.drawerBody,
                }}
            >
                {/* Tarjeta Hero del Perfil en Estilo Claro */}
                <div className={classes.profileHero}>
                    <Tooltip
                        label={foto ? 'Clic para ampliar fotografía' : 'Sin fotografía'}
                        withArrow
                        openDelay={200}
                    >
                        <div
                            className={`${classes.avatarContainer} ${foto ? classes.avatarClickable : ''}`}
                            onClick={() => foto && setLightboxAbierto(true)}
                        >
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
                            {foto && (
                                <div className={classes.zoomBadge} aria-label="Ampliar imagen">
                                    <IconZoomIn size={14} stroke={2.2} />
                                </div>
                            )}
                        </div>
                    </Tooltip>

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

            {/* Modal Lightbox / Zoom para fotografía de perfil */}
            <Modal
                opened={lightboxAbierto}
                onClose={() => setLightboxAbierto(false)}
                centered
                size="auto"
                padding="md"
                radius="lg"
                zIndex={1000001}
                title={
                    <Text fw={600} size="sm" c="#1E293B">
                        Fotografía de {usuario.nombre || 'Perfil'}
                    </Text>
                }
                overlayProps={{
                    backgroundOpacity: 0.65,
                    blur: 5,
                }}
            >
                <Stack align="center" gap="xs">
                    <div className={classes.lightboxImageWrapper}>
                        <img
                            src={foto}
                            alt={usuario.nombre || 'Fotografía de perfil'}
                            className={classes.lightboxImage}
                        />
                    </div>
                    {usuario.nombre && (
                        <Text size="xs" c="dimmed" ta="center">
                            {usuario.nombre}
                        </Text>
                    )}
                </Stack>
            </Modal>
        </>
    );
}

export default SidebarUsuario;
