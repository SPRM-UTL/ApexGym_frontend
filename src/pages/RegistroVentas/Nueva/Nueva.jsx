
import classes from './Nueva.module.css';

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    Image,
    NumberFormatter,
    Paper,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Title,
} from '@mantine/core';

import {
    IconBottle,
    IconClipboardList,
    IconCash,
    IconMinus,
    IconPlus,
    IconShoppingCart,
    IconTrash,
    IconClock,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';

const productos = [
    {
        id: 1,
        nombre: 'Producto 1',
        categoria: 'Producto',
        precio: 150,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 2,
        nombre: 'Producto 2',
        categoria: 'Producto',
        precio: 250,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 3,
        nombre: 'Producto 3',
        categoria: 'Producto',
        precio: 99,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 4,
        nombre: 'Producto 4',
        categoria: 'Producto',
        precio: 320,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 5,
        nombre: 'Producto 5',
        categoria: 'Producto',
        precio: 180,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 6,
        nombre: 'Producto 6',
        categoria: 'Producto',
        precio: 450,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
];

const servicios = [
    {
        id: 1,
        nombre: 'Servicio 1',
        categoria: 'Servicio',
        precio: 200,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 2,
        nombre: 'Servicio 2',
        categoria: 'Servicio',
        precio: 350,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 3,
        nombre: 'Servicio 3',
        categoria: 'Servicio',
        precio: 500,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
];

const membresias = [
    {
        id: 1,
        nombre: 'Membresias 1',
        categoria: 'Membresias',
        precio: 200,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 2,
        nombre: 'Membresias 2',
        categoria: 'Membresias',
        precio: 350,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
    {
        id: 3,
        nombre: 'Membresias 3',
        categoria: 'Membresias',
        precio: 500,
        imagen:
            'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-8.png',
    },
];

const channel = new BroadcastChannel('app_sync_channel');

// Enviar un mensaje o evento de cambio
function triggerUpdate(data) {
    channel.postMessage({
        type: 'DATA_UPDATED',
        payload: data
    });
}

function TarjetaProducto({ producto, agregarProducto }) {
    return (
        <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            className={classes.producto}
            onClick={() => agregarProducto(producto)}
        >
            <Card.Section>
                <Image
                    src={producto.imagen}
                    height={130}
                    alt={producto.nombre}
                />
            </Card.Section>

            <Stack gap={5} mt="sm">
                <Group justify="space-between" align="flex-start">
                    <Text fw={650} size="md"
                        variant='gradient' gradient={{ from: 'orange', to: 'orange', deg: 0 }}
                    >
                        {producto.nombre}
                    </Text>
                </Group>

                <Text variant="gradient"
                    gradient={{ from: 'green', to: 'green', deg: 0 }} fw={700} size="md">
                    <NumberFormatter
                        prefix="$"
                        value={producto.precio}
                        thousandSeparator
                        decimalScale={2}
                    />
                </Text>
            </Stack>
        </Card>
    );
}

function ListaProductos({ productos, agregarProducto }) {
    return (
        <ScrollArea h="calc(100vh - 230px)" offsetScrollbars>
            <SimpleGrid
                cols={{
                    base: 1,
                    sm: 2,
                    md: 3,
                    lg: 5,
                }}
                spacing="md"
                pr="sm"
            >
                {productos.map((producto) => (
                    <TarjetaProducto
                        key={producto.id}
                        producto={producto}
                        agregarProducto={agregarProducto}
                    />
                ))}
            </SimpleGrid>
        </ScrollArea>
    );
}

function Ticket({ productos, sumar, restar, eliminarTicket, cambiarCaja }) {

    let subtotal = 0;
    let iva = 0;
    productos.forEach(p => {
        subtotal += (p.precio * p.cantidad);
    });
    iva = parseFloat((subtotal * 0.16).toFixed(2));
    let total = parseFloat((subtotal + iva).toFixed(2));
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
                        <IconShoppingCart size={22} />

                        <div>
                            <Title order={4}>
                                Ticket actual
                            </Title>

                            <Text size="xs" c="dimmed">
                                Productos ({productos.length})
                            </Text>
                        </div>
                    </Group>
                    <select onChange={(e) => cambiarCaja(Number(e.target.value))}>
                        <option value={1}>Canal 1</option>
                        <option value={2}>Canal 2</option>
                    </select>
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

                        {productos.map((producto) => (
                            <Paper
                                p="sm"
                                radius="sm"
                                withBorder
                            >
                                <Group justify="space-between">
                                    <div>
                                        <Text size="sm" fw={600}>
                                            {producto.nombre}
                                        </Text>

                                        <Text size="xs" c="dimmed">
                                            ${producto.precio} c/u
                                        </Text>
                                    </div>

                                    <Group gap={4}>
                                        <ActionIcon
                                            size="sm"
                                            variant="light"
                                            onClick={() => restar(producto)}
                                        >
                                            <IconMinus size={14} />
                                        </ActionIcon>

                                        <Text size="sm" fw={600}>
                                            {producto.cantidad}
                                        </Text>

                                        <ActionIcon
                                            size="sm"
                                            variant="light"
                                            onClick={() => sumar(producto)}
                                        >
                                            <IconPlus size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea>

                <Divider />

                <Stack p="md" gap="xs">
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Subtotal
                        </Text>

                        <Text fw={500}>
                            <NumberFormatter
                                prefix="$"
                                thousandSeparator=","
                                decimalScale={2}
                                fixedDecimalScale
                                value={subtotal}
                            />
                        </Text>
                    </Group>

                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            IVA
                        </Text>

                        <Text fw={500}>
                            <NumberFormatter
                                prefix="$"
                                thousandSeparator=","
                                decimalScale={2}
                                fixedDecimalScale
                                value={iva}
                            />
                        </Text>
                    </Group>

                    <Divider my="xs" />

                    <Group justify="space-between">
                        <Text fw={700} size="lg">
                            Total
                        </Text>

                        <Text fw={800} size="xl">
                            <NumberFormatter
                                prefix="$"
                                thousandSeparator=","
                                decimalScale={2}
                                fixedDecimalScale
                                value={total}
                            />
                        </Text>
                    </Group>

                    <Button
                        size="md"
                        fullWidth
                        mt="xs"
                        leftSection={<IconCash size={19} />}
                    >
                        Cobrar
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}

export function Nueva() {

    const [hora, setHora] = useState('');
    const [listaProductos, setListaProductos] = useState([]);
    const [listaCaja1, setCaja1] = useState([]);
    const [listaCaja2, setCaja2] = useState([]);

    const cambiarCaja = (caja) => {
        if (caja < 2) {
            console.log("Caja 1")
            setCaja1(listaProductos)
            setListaProductos(listaCaja2)
        }
        else {
            console.log("Caja 2")
            setCaja2(listaProductos)
            setListaProductos(listaCaja1)
        }
    }

    useEffect(() => {
        triggerUpdate(listaProductos);
    }, [listaProductos]);

    useEffect(() => {
        const actualizarHora = () => {
            setHora(new Date().toLocaleString('es-MX'));
        };

        actualizarHora();

        const intervalo = setInterval(actualizarHora, 1000);

        return () => clearInterval(intervalo);
    }, []);

    const agregarProducto = (producto) => {
        setListaProductos(listaAnterior => {
            const existe = listaAnterior.find(p => p.id === producto.id && p.categoria === producto.categoria);

            if (existe) {
                return listaAnterior.map(p =>
                    p.id === producto.id && p.categoria === producto.categoria
                        ? { ...p, cantidad: p.cantidad + 1 }
                        : p
                );
            }

            return [
                ...listaAnterior,
                { ...producto, cantidad: 1 }
            ];
        });
    }

    const sumar = (producto) => {
        setListaProductos(listaAnterior => {
            return listaAnterior.map(p =>
                p.id === producto.id && p.categoria === producto.categoria
                    ? { ...p, cantidad: p.cantidad + 1 }
                    : p
            );
        })
    }

    const restar = (producto) => {
        setListaProductos(listaAnterior => {

            if (producto.cantidad > 1) {
                return listaAnterior.map(p =>
                    p.id === producto.id && p.categoria === producto.categoria
                        ? { ...p, cantidad: p.cantidad - 1 }
                        : p
                );
            }
            return listaAnterior.filter(p =>
                !(p.id === producto.id && p.categoria === producto.categoria)
            );
        })
    }

    const eliminarTicket = () => {
        setListaProductos([]);
    }

    return (
        <div className={classes.principal}>
            <div>
                <Group
                    justify="space-between"
                    mb="md"
                    align="flex-end"
                    className={classes.header}
                >
                    <div>
                        <Title order={2}>
                            ApexGym
                        </Title>
                    </div>
                    <div>
                        <Title order={2}>
                            Caja 1
                        </Title>
                    </div>

                    <Badge
                        size="lg"
                        variant="light"
                        leftSection={<IconClock size={15} />}
                    >
                        {hora}
                    </Badge>
                </Group>

                <div className={classes.catalogo}>
                    <Paper
                        withBorder
                        radius="md"
                        p="md"
                        className={classes.catalogo}
                    >
                        <Tabs
                            defaultValue="productos"
                            variant="pills"
                        >
                            <Tabs.List mb="md">
                                <Tabs.Tab
                                    value="productos"
                                    leftSection={
                                        <IconBottle size={17} />
                                    }
                                >
                                    Productos
                                </Tabs.Tab>

                                <Tabs.Tab
                                    value="servicios"
                                    leftSection={
                                        <IconCash size={17} />
                                    }
                                >
                                    Servicios
                                </Tabs.Tab>

                                <Tabs.Tab
                                    value="membresias"
                                    leftSection={
                                        <IconClipboardList size={17} />
                                    }
                                >
                                    Membresias
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="productos">
                                <ListaProductos
                                    productos={productos}
                                    agregarProducto={agregarProducto}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="servicios">
                                <ListaProductos
                                    productos={servicios}
                                    agregarProducto={agregarProducto}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="membresias">
                                <ListaProductos
                                    productos={membresias}
                                    agregarProducto={agregarProducto}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </div>
            </div>
            <Ticket productos={listaProductos} sumar={sumar} restar={restar} eliminarTicket={eliminarTicket} cambiarCaja={cambiarCaja}></Ticket>
        </div>
    );
}