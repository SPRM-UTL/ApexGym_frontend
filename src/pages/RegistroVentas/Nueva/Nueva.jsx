
import classes from './Nueva.module.css';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';

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
    TextInput,
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
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { obtenerUsuarioActual } from '../../../scripts/constantes.js';


const channel = new BroadcastChannel('app_sync_channel');

function triggerUpdate(data) {
    channel.postMessage({
        type: 'DATA_UPDATED',
        payload: data
    });
}

const normalizar = (lista) =>
    (lista ?? []).map((x) => ({ ...x, precio: Number(x.precioVenta ?? x.precio) }));

const obtenerLista = (respuesta) => {
    if (Array.isArray(respuesta)) return respuesta;
    if (Array.isArray(respuesta?.data)) return respuesta.data;
    throw new Error('El servidor devolvió un formato de catálogo no válido.');
};


    const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function calcularMontos(items) {
    const subtotal = redondear(
        items.reduce((acc, p) => acc + redondear(p.precio * p.cantidad), 0)
    );
    const iva = redondear(subtotal * 0.16);
    const total = redondear(subtotal + iva);
    return { subtotal, iva, total };
}

function TarjetaProducto({ producto,tipoItem, agregarProducto }) {
    return (
        <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            className={classes.producto}
            onClick={() => agregarProducto({ ...producto, tipoItem })}
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

function ListaProductos({ productos, tipoItem, agregarProducto }) {
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
                          <TarjetaProducto key={producto.id} producto={producto} tipoItem={tipoItem} agregarProducto={agregarProducto} />
                ))}
            </SimpleGrid>
        </ScrollArea>
    );
}

function Ticket({productos, sumar, restar, eliminarTicket, cambiarCaja, onCobrar, cobrando,
    clientes, metodosPago, aperturaAsignada,
    aperturaCajaId, clienteId, setClienteId, metodoPago, setMetodoPago,
    modoEdicion, cargandoVenta, cargaFallida}) {
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
                            key={producto.id +producto.tipoItem}
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

                    {!modoEdicion && (
                        <>
                            <TextInput
                                label="Caja de apertura asignada"
                                value={aperturaAsignada?.label ?? 'No hay caja abierta asignada a tu usuario'}
                                readOnly
                            />
                            <Select
                                label="Cliente"
                                placeholder="Selecciona cliente"
                                searchable
                                disabled={clientes.length === 0}
                                value={clienteId}
                                onChange={setClienteId}
                                comboboxProps={{ zIndex: 1000 }}
                                data={clientes.map((c) => ({
                                    value: String(c.id),
                                    label: [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' '),
                                }))}
                            />
                        </>
                    )}
                    <Select
                        label="Método de pago"
                        placeholder="Selecciona método de pago"
                        disabled={metodosPago.length === 0}
                        value={metodoPago}
                        onChange={setMetodoPago}
                        comboboxProps={{ zIndex: 1000 }}
                        data={metodosPago.map((m) => ({ value: String(m.id), label: m.nombre }))}
                    />
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
    loading={cobrando || cargandoVenta}
    onClick={onCobrar}
    disabled={
        productos.length === 0
        || cargandoVenta
        || cargaFallida
        || (!modoEdicion && (!aperturaCajaId || !clienteId || !metodoPago))
    }
    leftSection={<IconCash size={19} />}
>
    {modoEdicion ? 'Guardar cambios' : 'Cobrar'}
</Button>
                </Stack>
            </Stack>
        </Paper>
    );
}



export function Nueva({ modoEdicion = false }) {

    const { ventaId } = useParams();
    const navigate = useNavigate();
    const [hora, setHora] = useState('');
    const [listaProductos, setListaProductos] = useState([]);
    const [listaCaja1, setCaja1] = useState([]);
    const [listaCaja2, setCaja2] = useState([]);

    const [aperturaAsignada, setAperturaAsignada] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [aperturaCajaId, setAperturaCajaId] = useState(null);
    const { state } = useLocation();
    const [clienteId, setClienteId] = useState(state?.clienteId != null ? String(state.clienteId) : null);
    const [metodoPago, setMetodoPago] = useState(state?.clienteId != null ? String(state.metodoPagoId) : null);
    const [cobrando, setCobrando] = useState(false);
    const [cargandoVenta, setCargandoVenta] = useState(modoEdicion);
    const [cargaFallida, setCargaFallida] = useState(false);

    const [productos, setProductos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [membresias, setMembresias] = useState([]);

    useEffect(() => {
        const cargar = async () => {
            const usuarioActual = obtenerUsuarioActual();
            const resultados = await Promise.allSettled([
                api.aperturaCaja.obtenerTodos(),
                api.empleado.obtenerTodos(),
                api.cliente.obtenerTodos(),
                api.metodosPago.obtenerTodos(),
                api.producto.obtenerTodos(),
                api.servicio.obtenerTodos(),
                api.tipoMembresia.obtenerTodos(),
            ]);

            const etiquetasCatalogos = [
                'Aperturas de caja',
                'Empleados',
                'Clientes',
                'Métodos de pago',
                'Productos',
                'Servicios',
                'Membresías',
            ];
            const listas = resultados.map((resultado, indice) => {
                if (resultado.status === 'rejected') {
                    const error = resultado.reason;
                    notifications.show({
                        color: 'red',
                        message: `${etiquetasCatalogos[indice]}: ${error.message || 'No se pudo cargar'}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`,
                    });
                    return null;
                }

                try {
                    return obtenerLista(resultado.value);
                } catch (error) {
                    notifications.show({ color: 'red', message: `${etiquetasCatalogos[indice]}: ${error.message}` });
                    return null;
                }
            });

            const [aperturas, empleados, listaDeClientes, listaDeMetodos, listaDeProductos, listaDeServicios, listaDeMembresias] = listas;
            if (listaDeClientes) setClientes(listaDeClientes);
            if (listaDeMetodos) setMetodosPago(listaDeMetodos);
            if (listaDeProductos) setProductos(normalizar(listaDeProductos));
            if (listaDeServicios) setServicios(normalizar(listaDeServicios));
            if (listaDeMembresias) setMembresias(normalizar(listaDeMembresias));

            if (aperturas && empleados && !modoEdicion) {
                const usuarioIdActual =
                    usuarioActual?.id ?? usuarioActual?.usuarioId ?? usuarioActual?.usuario?.id;
                const usuarioId = Number(usuarioIdActual);
                const empleado = usuarioActual?.empleado
                    ?? (usuarioIdActual != null
                        ? empleados.find((registro) =>
                            Number(registro.usuarioId ?? registro.usuario?.id) === usuarioId
                        )
                        : null);

                if (!empleado?.id) {
                    notifications.show({
                        color: 'red',
                        message: 'Tu usuario no está asociado a un empleado; no se puede asignar una caja.',
                    });
                } else {
                    const aperturasEmpleado = aperturas.filter((apertura) =>
                        apertura.estado === 'ABIERTA'
                        && Number(apertura.empleadoId ?? apertura.empleado?.id) === Number(empleado.id)
                    );

                    if (aperturasEmpleado.length === 1) {
                        const apertura = aperturasEmpleado[0];
                        setAperturaAsignada({
                            label: `Apertura ${apertura.id}${apertura.caja?.nombre ? ` - ${apertura.caja.nombre}` : ''}`,
                        });
                        setAperturaCajaId(String(apertura.id));
                    } else {
                        notifications.show({
                            color: 'red',
                            message: aperturasEmpleado.length === 0
                                ? 'No tienes una caja abierta asignada a tu usuario.'
                                : 'Tienes varias cajas abiertas asignadas. Contacta al administrador.',
                        });
                    }
                }
            }

            try {
                if (modoEdicion) {
                    const respuestaVenta = await api.venta.obtenerPorId(ventaId);
                    const venta = respuestaVenta?.data?.venta ?? respuestaVenta?.data ?? respuestaVenta;
                    const detalles = venta.detalleVenta ?? venta.detalles;

                    if (!Array.isArray(detalles)) {
                        throw new Error('La venta no contiene un detalle válido.');
                    }

                    const catalogosPorTipo = {
                        PRODUCTO: normalizar(listaDeProductos ?? []),
                        SERVICIO: normalizar(listaDeServicios ?? []),
                        MEMBRESIA: normalizar(listaDeMembresias ?? []),
                    };
                    const detalleCargado = detalles.map((detalle) => {
                        const tipoItem = String(detalle.tipoItem ?? '').toUpperCase();
                        const entidad = tipoItem === 'PRODUCTO'
                            ? detalle.producto
                            : tipoItem === 'SERVICIO'
                                ? detalle.servicio
                                : detalle.tipoMembresia ?? detalle.membresia;
                        const id = detalle.productoId
                            ?? detalle.servicioId
                            ?? detalle.tipoMembresiaId
                            ?? entidad?.id;
                        const catalogo = catalogosPorTipo[tipoItem];
                        const item = catalogo?.find((producto) => Number(producto.id) === Number(id));

                        if (!tipoItem || !id || !item) {
                            throw new Error('No se pudo identificar un artículo del detalle de la venta.');
                        }

                        return {
                            ...item,
                            tipoItem,
                            cantidad: Number(detalle.cantidad),
                            precio: Number(detalle.precioUnitario ?? detalle.precio ?? item.precio),
                        };
                    });

                    setListaProductos(detalleCargado);
                    setMetodoPago(
                        venta.metodoPagoId != null
                            ? String(venta.metodoPagoId)
                            : venta.metodoPago?.id != null
                                ? String(venta.metodoPago.id)
                                : null
                    );
                }
            } catch (error) {
                if (modoEdicion) setCargaFallida(true);
                notifications.show({
                    color: 'red',
                    message: [
                        error.message || 'No se pudieron cargar los catálogos.',
                        error.statusCode ? `(HTTP ${error.statusCode})` : null,
                    ].filter(Boolean).join(' '),
                });
            } finally {
                setCargandoVenta(false);
            }
        };

        cargar();
    }, [modoEdicion, ventaId]);
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
            const existe = listaAnterior.find(p => p.id === producto.id &&   p.tipoItem === producto.tipoItem);

            if (existe) {
                return listaAnterior.map(p =>
                    p.id === producto.id &&   p.tipoItem === producto.tipoItem
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
                p.id === producto.id &&   p.tipoItem === producto.tipoItem
                    ? { ...p, cantidad: p.cantidad + 1 }
                    : p
            );
        })
    }

    const cobrar = async () => {
    if ((!modoEdicion && (!aperturaCajaId || !clienteId)) || !metodoPago || listaProductos.length === 0) {
        notifications.show({
            color: 'yellow',
            message: modoEdicion
                ? 'Selecciona un método de pago y agrega artículos al ticket.'
                : 'Selecciona apertura, cliente y método de pago; agrega productos al ticket.',
        });
        return;
    }
    const {subtotal, total } = calcularMontos(listaProductos);
    const detalleVenta = listaProductos.map((item) => {
        const precioUnitario = Number(item.precio);
        const linea = {
            tipoItem: item.tipoItem,
            cantidad: item.cantidad,
            precioUnitario,
            subtotal: redondear(precioUnitario * item.cantidad),
        };

        if (item.tipoItem === 'PRODUCTO') linea.productoId = item.id;
        if (item.tipoItem === 'SERVICIO') linea.servicioId = item.id;
        if (item.tipoItem === 'MEMBRESIA') linea.tipoMembresiaId = item.id;

        return linea;
    });
    setCobrando(true);

    try {
        if (modoEdicion) {
            await api.venta.actualizarVenta(Number(ventaId), Number(metodoPago), subtotal, total, detalleVenta);
        } else {
            await api.venta.crearVenta({
                aperturaCajaId: Number(aperturaCajaId),
                clienteId: Number(clienteId),
                metodoPagoId: Number(metodoPago),
                subtotal,
                total,
                detalleVenta
            });
        }

        notifications.show({
            color: 'green',
            message: modoEdicion ? 'Venta actualizada correctamente.' : 'Venta creada correctamente.',
        });
        if (modoEdicion) {
            navigate('/registro-de-ventas');
        } else {
            setListaProductos([]);
        }
    } catch (error) {
        notifications.show({
            color: 'red',
            message: error.message || 'No se pudo crear la venta.',
        });
    } finally {
        setCobrando(false);
    }
};



    const restar = (producto) => {
        setListaProductos(listaAnterior => {

            if (producto.cantidad > 1) {
                return listaAnterior.map(p =>
                    p.id === producto.id &&   p.tipoItem === producto.tipoItem
                        ? { ...p, cantidad: p.cantidad - 1 }
                        : p
                );
            }
            return listaAnterior.filter(p =>
                !(p.id === producto.id &&   p.tipoItem === producto.tipoItem)
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
                        <Title order={2}>{modoEdicion ? `Editar venta #${ventaId}` : 'ApexGym'}</Title>
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
                                <ListaProductos tipoItem="PRODUCTO" productos={productos} agregarProducto={agregarProducto} />
                            </Tabs.Panel>

                            <Tabs.Panel value="servicios">
                                <ListaProductos tipoItem="SERVICIO" productos={servicios} agregarProducto={agregarProducto} />
                            </Tabs.Panel>

                            <Tabs.Panel value="membresias">
                                <ListaProductos tipoItem="MEMBRESIA" productos={membresias} agregarProducto={agregarProducto} />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </div>
            </div>
            <Ticket  productos={listaProductos}
    sumar={sumar}
    restar={restar}
    eliminarTicket={eliminarTicket}
    cambiarCaja={cambiarCaja}
    onCobrar={cobrar}
    cobrando={cobrando}
    aperturaAsignada={aperturaAsignada}
    clientes={clientes}
    metodosPago={metodosPago}
    aperturaCajaId={aperturaCajaId}
    clienteId={clienteId} setClienteId={setClienteId}
    metodoPago={metodoPago} setMetodoPago={setMetodoPago}
    modoEdicion={modoEdicion}
    cargandoVenta={cargandoVenta}
    cargaFallida={cargaFallida}></Ticket>
        </div>
    );

    
}