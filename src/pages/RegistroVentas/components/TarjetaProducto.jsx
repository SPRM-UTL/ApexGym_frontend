import classes from '../Nueva/Nueva.module.css';
import { Card, Group, Image, NumberFormatter, Stack, Text } from '@mantine/core';

export function TarjetaProducto({ producto,tipoItem, agregarProducto }) {
    return (
        <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            className={classes.producto}
            onClick={() => agregarProducto({ ...producto, tipoItem })}
        >
            <Card.Section className={!producto.imagen ? classes.productoImagenFallback : undefined}>
                {producto.imagen && (
                    <Image
                        src={producto.imagen}
                        height={170}
                        alt={producto.nombre}
                        className={classes.productoImagen}
                    />
                )}
            </Card.Section>

            <Stack gap={5} mt="sm">

                <Group justify="space-between" align="flex-start">
                    <Text fw={650} size="md" lineClamp={2} className={classes.productoNombre}
                        variant='gradient' gradient={{ from: 'orange', to: 'orange', deg: 0 }}
                    >
                        {producto.nombre}
                    </Text>
                </Group>

                <Text className={classes.productoPrecio} variant="gradient"
                    gradient={{ from: 'green', to: 'green', deg: 0 }} fw={700} size="md">
                    <NumberFormatter
                        prefix="$"
                        value={producto.precio}
                        thousandSeparator
                        decimalScale={2}
                        fixedDecimalScale
                    />
                </Text>
            </Stack>
        </Card>
    );
}
