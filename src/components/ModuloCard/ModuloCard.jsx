import { Badge, Card, Text } from '@mantine/core';
import classes from './ModuloCard.module.css';

export function ModuloCard({ modulo, icon: Icono, onClick, disabled = false }) {
    const tieneImagen = Boolean(modulo.imagenUrl);

    return (
        <Card
            component="button"
            type="button"
            padding={0}
            radius="md"
            shadow="md"
            className={classes.card}
            onClick={onClick}
            disabled={disabled}
            data-disabled={disabled || undefined}
        >
            {tieneImagen ? (
                <img
                    className={classes.image}
                    src={modulo.imagenUrl}
                    alt={modulo.nombre}
                />
            ) : (
                <div className={classes.placeholder}>
                    <Icono size={48} className={classes.placeholderIcon} stroke={1.2} />
                </div>
            )}

            <div className={classes.overlay} />

            <div className={classes.content}>
                <Badge size="sm" variant="filled" className={classes.badge}>
                    {disabled ? 'No disponible' : 'Módulo'}
                </Badge>
                <Text size="lg" fw={700} className={classes.title}>
                    {modulo.nombre}
                </Text>
                {modulo.descripcion && (
                    <Text size="xs" className={classes.description} lineClamp={2}>
                        {modulo.descripcion}
                    </Text>
                )}
                {disabled && (
                    <Text size="xs" className={classes.description} mt={6}>
                        Ruta no configurada
                    </Text>
                )}
            </div>
        </Card>
    );
}

export default ModuloCard;
