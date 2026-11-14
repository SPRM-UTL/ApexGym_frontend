import { Badge, Card, Group, Text } from '@mantine/core';
import { IconBuildingStore, IconCheck } from '@tabler/icons-react';
import gymBackground from '../../assets/gym_image.png';
import classes from './SucursalCard.module.css';

/**
 * Tarjeta de sucursal que respeta estrictamente el patrón de diseño de SeccionCard / ModuloCard.
 *
 * @param {{ sucursal: object, esActiva: boolean, onClick: Function }} props
 */
export function SucursalCard({ sucursal, esActiva = false, onClick }) {
    const ubicacion = [sucursal.direccion, sucursal.ciudad, sucursal.estado]
        .filter(Boolean)
        .join(', ');

    return (
        <Card
            component="button"
            type="button"
            padding={0}
            radius="md"
            shadow="md"
            className={`${classes.card} ${esActiva ? classes.cardActiva : ''}`}
            onClick={() => onClick?.(sucursal)}
        >
            <div
                className={classes.image}
                style={{ backgroundImage: `url(${gymBackground})` }}
            />

            <div className={classes.overlay} />

            <div className={classes.content}>
                <Group justify="space-between" align="center" mb={6}>
                    <Badge
                        size="sm"
                        variant="filled"
                        className={`${classes.badge} ${esActiva ? classes.badgeActiva : ''}`}
                    >
                        {esActiva ? 'SUCURSAL ACTIVA' : (sucursal.codigo || 'SUCURSAL')}
                    </Badge>
                    {esActiva && <IconCheck size={18} color="#22c55e" stroke={2.5} />}
                </Group>

                <Text size="lg" fw={700} className={classes.title}>
                    {sucursal.nombre}
                </Text>

                <Text size="xs" className={classes.description} lineClamp={2}>
                    {ubicacion || 'Sede operativa de ApexGym'}
                    {sucursal.telefono ? ` • Tel: ${sucursal.telefono}` : ''}
                </Text>
            </div>
        </Card>
    );
}

export default SucursalCard;
