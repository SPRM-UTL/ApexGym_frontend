import classes from './Cliente.module.css';
import { useState, useEffect } from 'react';
import { Image } from '@mantine/core';

import {
    Badge,
    Card,
    Divider,
    Group,
    Paper,
    Stack,
    Table,
    Text,
    Title,
    NumberFormatter,
    ThemeIcon,
} from '@mantine/core';

import {
    IconBottle,
    IconShoppingCart,
    IconClock,
    IconReceipt,
} from '@tabler/icons-react';

const channel = new BroadcastChannel('app_sync_channel');

export function ClienteVenta() {

    const [hora, setHora] = useState('');
    const [ticket, setTicket] = useState([]);

    useEffect(() => {

        const actualizarHora = () => {

            setHora(
                new Date().toLocaleString('es-MX')
            );

        };

        actualizarHora();

        const intervalo = setInterval(
            actualizarHora,
            1000
        );

        return () => {
            clearInterval(intervalo);
        };

    }, []);


    // ==========================================
    // SINCRONIZACIÓN
    // ==========================================

    useEffect(() => {

        const recibirDatos = (event) => {

            const { type, payload } = event.data;

            if (type === 'DATA_UPDATED') {

                console.log(
                    'Cambio recibido:',
                    payload
                );

                if (payload) {
                    setTicket(payload);
                }
            }
        };


        channel.addEventListener(
            'message',
            recibirDatos
        );


        return () => {

            channel.removeEventListener(
                'message',
                recibirDatos
            );

        };

    }, []);

    let subtotal = 0;
    let iva = 0;
    ticket.forEach(p => {
        subtotal += (p.precio * p.cantidad);
    });
    iva = parseFloat((subtotal * 0.16).toFixed(2));
    let total = parseFloat((subtotal + iva).toFixed(2));

    return (

        <div className={classes.principal}>

            <Stack
                maw={1000}
                mx="auto"
                w="100%"
                gap="lg"
            >

                <Paper
                    withBorder
                    radius="md"
                    p="lg"
                    shadow="sm"
                >

                    <Group
                        justify="space-between"
                        align="center"
                    >

                        <Group>

                            <ThemeIcon
                                size={50}
                                radius="md"
                                variant="light"
                                color="blue"
                            >
                                <IconShoppingCart
                                    size={28}
                                />
                            </ThemeIcon>

                            <div>

                                <Title order={2}>
                                    ApexGym
                                </Title>

                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Gracias por tu preferencia
                                </Text>

                            </div>

                        </Group>


                        <Badge
                            size="lg"
                            variant="light"
                            color="blue"
                            leftSection={
                                <IconClock size={15} />
                            }
                        >
                            {hora}
                        </Badge>

                    </Group>

                </Paper>

                <Card
                    withBorder
                    radius="md"
                    shadow="sm"
                    padding="xl"
                >

                    <Group
                        justify="space-between"
                        mb="xl"
                    >

                        <Group>

                            <ThemeIcon
                                size={45}
                                radius="md"
                                variant="light"
                                color="green"
                            >

                                <IconReceipt
                                    size={25}
                                />

                            </ThemeIcon>


                            <div>

                                <Text
                                    size="xs"
                                    fw={700}
                                    c="dimmed"
                                    tt="uppercase"
                                >
                                    Ticket actual
                                </Text>

                                <Title order={3}>
                                    Mi compra
                                </Title>

                            </div>

                        </Group>


                        <Badge
                            size="lg"
                            variant="light"
                            color="green"
                        >
                            Compra en proceso
                        </Badge>

                    </Group>

                    <Table.ScrollContainer h="200px" offsetScrollbars>
                        <Table stickyHeader
                            verticalSpacing="md"
                            highlightOnHover
                        >

                            <Table.Thead>

                                <Table.Tr>

                                    <Table.Th>
                                        Producto / Servicio
                                    </Table.Th>

                                    <Table.Th ta="center">
                                        Cant.
                                    </Table.Th>

                                    <Table.Th ta="right">
                                        Precio
                                    </Table.Th>

                                    <Table.Th ta="right">
                                        Subtotal
                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ticket.map(
                                    (producto) => (

                                        <Table.Tr
                                            key={producto.id}
                                        >

                                            <Table.Td>

                                                <Group gap="sm">

                                                    <ThemeIcon
                                                        size={50}
                                                        radius="md"
                                                        variant="light"
                                                    >
                                                        <Image
                                                            fit="contain"
                                                            src={producto.imagen}
                                                        />

                                                    </ThemeIcon>

                                                    <Text fw={500}>
                                                        {
                                                            producto.nombre
                                                        }
                                                    </Text>

                                                </Group>

                                            </Table.Td>


                                            <Table.Td ta="center">

                                                <Badge
                                                    variant="light"
                                                    color="gray"
                                                >
                                                    {
                                                        producto.cantidad
                                                    }
                                                </Badge>

                                            </Table.Td>


                                            <Table.Td ta="right">

                                                <NumberFormatter
                                                    prefix="$"
                                                    thousandSeparator=","
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    value={
                                                        producto.precio
                                                    }
                                                />

                                            </Table.Td>

                                            <Table.Td ta="right">

                                                <Text fw={600}>

                                                    <NumberFormatter
                                                        prefix="$"
                                                        thousandSeparator=","
                                                        decimalScale={2}
                                                        fixedDecimalScale
                                                        value={
                                                            producto.precio *
                                                            producto.cantidad
                                                        }
                                                    />

                                                </Text>

                                            </Table.Td>

                                        </Table.Tr>

                                    )
                                )}

                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    <Stack
                        gap="xs"
                        mt="xl"
                    >
                        <Group justify="space-between">
                            <Text c="dimmed">
                                Subtotal
                            </Text>
                            <Text>
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
                            <Text c="dimmed">
                                IVA (16%)
                            </Text>
                            <Text>
                                <NumberFormatter
                                    prefix="$"
                                    thousandSeparator=","
                                    decimalScale={2}
                                    fixedDecimalScale
                                    value={iva}
                                />
                            </Text>
                        </Group>
                        <Divider />

                        <Paper
                            p="lg"
                            radius="md"
                            withBorder
                            bg="blue.0"
                        >
                            <Group
                                justify="space-between"
                                align="center"
                            >
                                <div>
                                    <Text
                                        size="sm"
                                        fw={600}
                                        c="blue.8"
                                    >
                                        TOTAL A PAGAR
                                    </Text>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        Impuestos incluidos
                                    </Text>
                                </div>

                                <Text
                                    size="2rem"
                                    fw={800}
                                    c="blue.7"
                                >

                                    <NumberFormatter
                                        prefix="$"
                                        thousandSeparator=","
                                        decimalScale={2}
                                        fixedDecimalScale
                                        value={total}
                                    />

                                </Text>

                            </Group>

                        </Paper>

                    </Stack>

                </Card>

            </Stack>

        </div>

    );
}