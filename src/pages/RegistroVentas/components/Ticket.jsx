import classes from '../Nueva/Nueva.module.css';
import {
    ActionIcon,
    Box,
    Button,
    Divider,
    Group,
    Image,
    NumberFormatter,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {
    IconBottle,
    IconCash,
    IconMinus,
    IconPlus,
    IconShoppingCart,
    IconTrash,
} from '@tabler/icons-react';
import {
    calcularDescuentoUnitario,
    calcularMontos,
    calcularPrecioUnitarioNeto,
    calcularSubtotalLinea,
    redondear,
} from '../utils/venta.utils.js';
export function Ticket({productos, sumar, restar, eliminarProducto, eliminarTicket, cambiarCaja, cajaActual, onCobrar, cobrando,
}) {
    const { subtotal, iva, total } = calcularMontos(productos);
   
    return (
        <Paper
            withBorder
            radius="md"
            shadow="sm"
            className={classes.ticket}
        >
            <Stack gap={0} h="100%">
                <Group
                    justify="space-between"
                    p="md"
                    className={classes.ticketHeader}
                >
                    <Group gap="sm">
                        <IconShoppingCart size={22} className={classes.ticketIcono} />

                        <div>
                            <Title order={4} className={classes.ticketTitulo}>
                                Ticket actual
                            </Title>

                            <Text size="xs" className={classes.ticketConteo}>
                                Productos ({productos.length})
                            </Text>
                        </div>
                    </Group>
                    <Select
                        aria-label="Canal de venta"
                        className={classes.selectorCaja}
                        size="xs"
                        value={String(cajaActual)}
                        onChange={(value) => value && cambiarCaja(Number(value))}
                        data={[
                            { value: '1', label: 'Canal 1' },
                            { value: '2', label: 'Canal 2' },
                        ]}
                        comboboxProps={{ zIndex: 1100 }}
                        allowDeselect={false}
                    />
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Vaciar ticket"
                        onClick={() => eliminarTicket()}
                    >
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>

                <Divider />

                <ScrollArea flex={1} p="md">
                    <Stack gap="sm">

                        {productos.map((producto) => {
                            const descuentoPorcentaje = producto.tipoItem === 'PRODUCTO'
                                ? Number(producto.descuentoPorcentaje ?? 0)
                                : 0;
                            const descuentoUnitario = calcularDescuentoUnitario(producto);
                            const precioUnitarioNeto = calcularPrecioUnitarioNeto(producto);
                            const subtotalLinea = calcularSubtotalLinea(producto);
                            return (
                                <Paper
                                    key={producto.id + producto.tipoItem}
                                    p="sm"
                                    radius="sm"
                                    withBorder
                                    className={classes.ticketProducto}
                                >
                                    <Group justify="space-between">
                                        <Group gap="sm" wrap="nowrap" className={classes.ticketProductoInfo}>
                                            <Box className={classes.ticketImagen}>
                                                {producto.imagen ? (
                                                    <Image
                                                        src={producto.imagen}
                                                        alt={producto.nombre}
                                                        w={60}
                                                        h={60}
                                                        fit="cover"
                                                    />
                                                ) : (
                                                    <IconBottle size={22} />
                                                )}
                                            </Box>
                                            <Box className={classes.ticketProductoTexto}>
                                                <Text size="md" fw={650} lineClamp={2}>
                                                    {producto.nombre}
                                                </Text>
                                                {descuentoPorcentaje > 0 ? (
                                                    <Group gap={6}>
                                                        <Text size="sm" c="dimmed" td="line-through">
                                                            <NumberFormatter prefix="$" value={producto.precio} thousandSeparator decimalScale={2} fixedDecimalScale />
                                                        </Text>
                                                        <Badge size="xs" color="red" variant="light">{descuentoPorcentaje}%</Badge>
                                                    </Group>
                                                ) : null}
                                                <Text size="sm" c={descuentoPorcentaje > 0 ? 'green.8' : 'dimmed'} fw={descuentoPorcentaje > 0 ? 650 : undefined}>
                                                    <NumberFormatter prefix="$" value={precioUnitarioNeto} thousandSeparator decimalScale={2} fixedDecimalScale /> c/u
                                                </Text>
                                            </Box>
                                        </Group>

                                        <Group gap={4} wrap="nowrap">
                                            <ActionIcon
                                                size="sm"
                                                variant="light"
                                                onClick={() => restar(producto)}
                                            >
                                                <IconMinus size={14} />
                                            </ActionIcon>

                                            <Text className={classes.cantidadProducto} size="sm" fw={600}>
                                                {producto.cantidad}
                                            </Text>

                                            <ActionIcon
                                                size="sm"
                                                variant="light"
                                                onClick={() => sumar(producto)}
                                            >
                                                <IconPlus size={14} />
                                            </ActionIcon>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="red"
                                                aria-label={`Eliminar ${producto.nombre} del ticket`}
                                                title="Eliminar del ticket"
                                                onClick={() => eliminarProducto(producto)}
                                            >
                                                <IconTrash size={15} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                    <Group justify="space-between" mt="xs" pl={producto.imagen ? 72 : 0}>
                                        {descuentoPorcentaje > 0 ? (
                                            <Text size="xs" c="dimmed">
                                                Descuento: -<NumberFormatter prefix="$" value={redondear(descuentoUnitario * producto.cantidad)} thousandSeparator decimalScale={2} fixedDecimalScale />
                                            </Text>
                                        ) : <span />}
                                        <Text size="sm" fw={700}>
                                            Importe: <NumberFormatter prefix="$" value={subtotalLinea} thousandSeparator decimalScale={2} fixedDecimalScale />
                                        </Text>
                                    </Group>
                            </Paper>
                            );
                        })}
                    </Stack>
                </ScrollArea>

                <Divider />

                <Stack p="md" gap="xs" className={classes.ticketFooter}>

                    <div className={classes.resumenMontos}>
                        <Group justify="space-between" className={classes.resumenFila}>
                            <Text size="sm">Subtotal</Text>
                            <Text fw={600}>
                                <NumberFormatter prefix="$" thousandSeparator="," decimalScale={2} fixedDecimalScale value={subtotal} />
                            </Text>
                        </Group>
                        <Group justify="space-between" className={classes.resumenFila}>
                            <Text size="sm">IVA (16%)</Text>
                            <Text fw={600}>
                                <NumberFormatter prefix="$" thousandSeparator="," decimalScale={2} fixedDecimalScale value={iva} />
                            </Text>
                        </Group>
                        <Group justify="space-between" className={classes.ticketTotal}>
                            <Text fw={750} size="lg">Total</Text>
                            <Text fw={800} size="xl">
                                <NumberFormatter prefix="$" thousandSeparator="," decimalScale={2} fixedDecimalScale value={total} />
                            </Text>
                        </Group>
                    </div>

                    <Button
                    className={classes.botonCobrar}
                    size="md"
    fullWidth
    mt="xs"
    loading={cobrando}
    onClick={onCobrar}
    disabled={cobrando}
    leftSection={<IconCash size={19} />}
>
    Cobrar
</Button>
                </Stack>
            </Stack>
        </Paper>
    );
}
