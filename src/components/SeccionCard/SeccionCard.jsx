import { Badge, Card, Text } from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import classes from './SeccionCard.module.css';

/**
 * Tarjeta de sección con imagen de fondo al estilo Mantine ImageCard.
 *
 * @param {{ seccion: { id, nombre, descripcion, imagenUrl, modulos: Array }, onClick: Function }} props
 */
export function SeccionCard({ seccion, onClick }) {
    const tieneImagen = !!seccion.imagenUrl;
    const cantidadModulos = seccion.modulos?.length ?? 0;

    return (
        <Card
            padding={0}
            radius="md"
            shadow="md"
            className={classes.card}
            onClick={() => onClick?.(seccion)}
        >
            {tieneImagen ? (
                <div
                    className={classes.image}
                    style={{ backgroundImage: `url(${seccion.imagenUrl})` }}
                />
            ) : (
                <div className={classes.placeholder}>
                    <IconLayoutGrid size={48} className={classes.placeholderIcon} stroke={1.2} />
                </div>
            )}

            <div className={classes.overlay} />

            <div className={classes.content}>
                <Badge size="sm" variant="filled" className={classes.badge}>
                    {cantidadModulos} {cantidadModulos === 1 ? 'módulo' : 'módulos'}
                </Badge>
                <Text size="lg" fw={700} className={classes.title}>
                    {seccion.nombre}
                </Text>
                {seccion.descripcion && (
                    <Text size="xs" className={classes.description} lineClamp={2}>
                        {seccion.descripcion}
                    </Text>
                )}
            </div>
        </Card>
    );
}

export default SeccionCard;
