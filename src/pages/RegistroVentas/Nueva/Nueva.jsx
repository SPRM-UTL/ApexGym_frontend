
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

function TarjetaProducto({ producto }) {
    return (
        <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            className={classes.producto}
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

function ListaProductos({ productos }) {
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
                    />
                ))}
            </SimpleGrid>
        </ScrollArea>
    );
}

function Ticket() {
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
                                3 productos
                            </Text>
                        </div>
                    </Group>

                    <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Vaciar ticket"
                    >
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>

                <Divider />

                <ScrollArea flex={1} p="md">
                    <Stack gap="sm">
                        <Paper
                            p="sm"
                            radius="sm"
                            withBorder
                        >
                            <Group justify="space-between">
                                <div>
                                    <Text size="sm" fw={600}>
                                        Producto 1
                                    </Text>

                                    <Text size="xs" c="dimmed">
                                        $150.00 c/u
                                    </Text>
                                </div>

                                <Group gap={4}>
                                    <ActionIcon
                                        size="sm"
                                        variant="light"
                                    >
                                        <IconMinus size={14} />
                                    </ActionIcon>

                                    <Text size="sm" fw={600}>
                                        1
                                    </Text>

                                    <ActionIcon
                                        size="sm"
                                        variant="light"
                                    >
                                        <IconPlus size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <Group justify="space-between" mt="xs">
                                <Text size="xs" c="dimmed">
                                    Cantidad: 1
                                </Text>

                                <Text fw={700}>
                                    $150.00
                                </Text>
                            </Group>
                        </Paper>

                        <Paper
                            p="sm"
                            radius="sm"
                            withBorder
                        >
                            <Group justify="space-between">
                                <div>
                                    <Text size="sm" fw={600}>
                                        Producto 2
                                    </Text>

                                    <Text size="xs" c="dimmed">
                                        $250.00 c/u
                                    </Text>
                                </div>

                                <Group gap={4}>
                                    <ActionIcon
                                        size="sm"
                                        variant="light"
                                    >
                                        <IconMinus size={14} />
                                    </ActionIcon>

                                    <Text size="sm" fw={600}>
                                        2
                                    </Text>

                                    <ActionIcon
                                        size="sm"
                                        variant="light"
                                    >
                                        <IconPlus size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <Group justify="space-between" mt="xs">
                                <Text size="xs" c="dimmed">
                                    Cantidad: 2
                                </Text>

                                <Text fw={700}>
                                    $500.00
                                </Text>
                            </Group>
                        </Paper>
                    </Stack>
                </ScrollArea>

                <Divider />

                <Stack p="md" gap="xs">
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Subtotal
                        </Text>

                        <Text fw={500}>
                            $650.00
                        </Text>
                    </Group>

                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            IVA
                        </Text>

                        <Text fw={500}>
                            $104.00
                        </Text>
                    </Group>

                    <Divider my="xs" />

                    <Group justify="space-between">
                        <Text fw={700} size="lg">
                            Total
                        </Text>

                        <Text fw={800} size="xl">
                            $754.00
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
                        29/09/2026 6:21 p.m
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
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="servicios">
                                <ListaProductos
                                    productos={servicios}
                                />
                            </Tabs.Panel>
                            
                            <Tabs.Panel value="membresias">
                                <ListaProductos
                                    productos={servicios}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </div>
            </div>
            <Ticket></Ticket>
        </div>
    );
}