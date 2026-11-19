import classes from '../Nueva/Nueva.module.css';
import { Badge, Card, Group, Image, NumberFormatter, Stack, Text } from '@mantine/core';
import { calcularPrecioUnitarioNeto } from '../utils/venta.utils.js';

export function TarjetaProducto({ producto, tipoItem, agregarProducto }) {
    const categoriaNombre = producto.categoria?.nombre ?? (typeof producto.categoria === 'string' ? producto.categoria : null);
    const descuentoPorcentaje = tipoItem === 'PRODUCTO' ? Number(producto.descuentoPorcentaje ?? 0) : 0;
    const precioConDescuento = calcularPrecioUnitarioNeto({ ...producto, tipoItem });
    const stockActual = tipoItem === 'PRODUCTO' ? Number(producto.stockActual ?? 0) : null;
    const sinStock = stockActual !== null && stockActual <= 0;

    return (
        <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            className={classes.producto}
            style={sinStock ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            onClick={() => !sinStock && agregarProducto({ ...producto, tipoItem })}
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
                <Group justify="space-between" align="center">
                    {categoriaNombre && (
                        <Badge size="xs" variant="light" color="orange" radius="sm">
                            {categoriaNombre}
                        </Badge>
                    )}
                    {stockActual !== null && (
                        <Badge
                            size="xs"
                            variant="light"
                            color={stockActual > 5 ? 'teal' : stockActual > 0 ? 'yellow' : 'red'}
                            radius="sm"
                        >
                            Stock: {stockActual}
                        </Badge>
                    )}
                </Group>

                <Group justify="space-between" align="flex-start">
                    <Text fw={650} size="md" lineClamp={2} className={classes.productoNombre}
                        variant='gradient' gradient={{ from: 'orange', to: 'orange', deg: 0 }}
                    >
                        {producto.nombre}
                    </Text>
                </Group>

                {descuentoPorcentaje > 0 && (
                    <Badge size="sm" variant="light" color="red" radius="sm" style={{ alignSelf: 'flex-start' }}>
                        {descuentoPorcentaje}% de descuento
                    </Badge>
                )}
                <Stack gap={0}>
                    {descuentoPorcentaje > 0 && (
                        <Text size="sm" c="dimmed" td="line-through">
                            <NumberFormatter prefix="$" value={producto.precio} thousandSeparator decimalScale={2} fixedDecimalScale />
                        </Text>
                    )}
                    <Text className={classes.productoPrecio} variant="gradient"
                        gradient={{ from: 'green', to: 'green', deg: 0 }} fw={700} size="md">
                        <NumberFormatter
                            prefix="$"
                            value={precioConDescuento}
                            thousandSeparator
                            decimalScale={2}
                            fixedDecimalScale
                        />
                    </Text>
                </Stack>
            </Stack>
        </Card>
    );
}
