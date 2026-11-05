
import classes from './Nueva.module.css';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';
import { resolverUrlImagen } from '../../../scripts/constantes.js';

import {
    ActionIcon,
    Badge,
    Box,
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
    IconSearch,
    IconTrash,
    IconClock,
    IconUser,
    IconCreditCard,
    IconPackage,
} from '@tabler/icons-react';
import { EncabezadoTabla } from '../../../components/TablaRegistros/TablaRegistros.jsx';
import ExportarDocumento from '../../../components/exportar-documento/ExportarDocumento.jsx';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { obtenerVenta } from '../../../utils/ventaHelper/ventaHelpers.js';


const channel = new BroadcastChannel('app_sync_channel');

function triggerUpdate(data) {
    channel.postMessage({
        type: 'DATA_UPDATED',
        payload: data
    });
}

const normalizar = (lista) =>
    (lista ?? []).map((x) => ({
        ...x,
        imagen: resolverUrlImagen(x.imagenUrl ?? x.imagen),
        precio: Number(x.precioVenta ?? x.precio),
    }));

const obtenerLista = (respuesta) => {
    let contenido = respuesta;
    while (!Array.isArray(contenido) && contenido?.data != null) {
        contenido = contenido.data;
    }
    if (Array.isArray(contenido)) return contenido;
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

function normalizarTextoBusqueda(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();
}

function ListaProductos({
    productos,
    tipoItem,
    agregarProducto,
    busqueda,
    ordenCatalogo,
}) {
    const termino = normalizarTextoBusqueda(busqueda);
    const productosFiltrados = productos
        .filter((producto) => {
            const coincideBusqueda = !termino
                || [producto.nombre, producto.codigoBarras]
                    .some((valor) => normalizarTextoBusqueda(valor).includes(termino));
            return coincideBusqueda;
        })
        .sort((a, b) => {
            if (ordenCatalogo === 'nombre-asc') {
                return normalizarTextoBusqueda(a.nombre).localeCompare(normalizarTextoBusqueda(b.nombre));
            }
            if (ordenCatalogo === 'nombre-desc') {
                return normalizarTextoBusqueda(b.nombre).localeCompare(normalizarTextoBusqueda(a.nombre));
            }
            if (ordenCatalogo === 'precio-asc') return a.precio - b.precio;
            if (ordenCatalogo === 'precio-desc') return b.precio - a.precio;
            return 0;
        });

    return (
        <ScrollArea className={classes.listaProductos} h="100%" offsetScrollbars>
            {productosFiltrados.length > 0 ? (
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
                    {productosFiltrados.map((producto) => (
                        <TarjetaProducto key={producto.id} producto={producto} tipoItem={tipoItem} agregarProducto={agregarProducto} />
                    ))}
                </SimpleGrid>
            ) : (
                <div className={classes.catalogoVacio}>
                    <IconPackage size={88} stroke={1.35} aria-hidden="true" />
                    <Text fw={700}>
                    {termino
                        ? 'No se encontraron artículos con esos filtros.'
                        : 'No hay artículos disponibles.'}
                    </Text>
                </div>
            )}
        </ScrollArea>
    );
}

function Ticket({productos, sumar, restar, eliminarProducto, eliminarTicket, cambiarCaja, cajaActual, onCobrar, cobrando,
    clientes, metodosPago, aperturaAsignada,
    clienteId, setClienteId, metodoPago, setMetodoPago,
    asignacionValida}) {
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

                        {productos.map((producto) => (
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
                                            <Text size="sm" c="dimmed">
                                                ${producto.precio} c/u
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
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea>

                <Divider />

                <Stack p="md" gap="xs" className={classes.ticketFooter}>

                    <Select
                        label={<span className={classes.selectLabel}><IconUser size={18} />Cliente</span>}
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
                    <Select
                        label={<span className={classes.selectLabel}><IconCreditCard size={18} />Método de pago</span>}
                        placeholder="Selecciona método de pago"
                        disabled={metodosPago.length === 0}
                        value={metodoPago}
                        onChange={setMetodoPago}
                        comboboxProps={{ zIndex: 1000 }}
                        data={metodosPago.map((m) => ({ value: String(m.id), label: m.nombre }))}
                    />
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
    disabled={
        productos.length === 0
        || !asignacionValida
        || !clienteId
        || !metodoPago
    }
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
    const navigate = useNavigate();
    const [hora, setHora] = useState('');
    const [ventaCreada, setVentaCreada] = useState(null);
    const [listaProductos, setListaProductos] = useState([]);
    const [listaCaja1, setCaja1] = useState([]);
    const [listaCaja2, setCaja2] = useState([]);
    const [cajaActual, setCajaActual] = useState(1);
    const [tabCatalogo, setTabCatalogo] = useState('productos');
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [ordenCatalogo, setOrdenCatalogo] = useState(null);

    const [clientes, setClientes] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const { state } = useLocation();
    const empleadoId = state?.empleadoId != null ? String(state.empleadoId) : null;
    const [aperturaAsignada, setAperturaAsignada] = useState(null);
    const aperturaCajaId = state?.aperturaCajaId != null ? String(state.aperturaCajaId) : null;
    const [asignacionValida, setAsignacionValida] = useState(false);
    const [clienteId, setClienteId] = useState(null);
    const [metodoPago, setMetodoPago] = useState(null);
    const [cobrando, setCobrando] = useState(false);

    const [productos, setProductos] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [membresias, setMembresias] = useState([]);

    useEffect(() => {
        const cargar = async () => {
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

            const [
                aperturas,
                empleados,
                listaDeClientes,
                listaDeMetodos,
                listaDeProductos,
                listaDeServicios,
                listaDeMembresias,
            ] = listas;
            if (listaDeClientes) setClientes(listaDeClientes);
            if (listaDeMetodos) setMetodosPago(listaDeMetodos);
            if (listaDeProductos) setProductos(normalizar(listaDeProductos));
            if (listaDeServicios) setServicios(normalizar(listaDeServicios));
            if (listaDeMembresias) setMembresias(normalizar(listaDeMembresias));

            if (aperturas && empleados && empleadoId && aperturaCajaId) {
                const apertura = aperturas.find(
                    (registro) => String(registro.id) === String(aperturaCajaId)
                );
                const empleado = empleados.find(
                    (registro) => String(registro.id) === String(empleadoId)
                );
                const aperturaEmpleadoId = apertura?.empleadoId ?? apertura?.empleado?.id;

                if (
                    String(apertura?.estado).toUpperCase() === 'ABIERTA'
                    && empleado
                    && String(aperturaEmpleadoId) === String(empleado.id)
                ) {
                    const nombreEmpleado = [
                        empleado.nombre,
                        empleado.apellidoPaterno,
                        empleado.apellidoMaterno,
                    ].filter(Boolean).join(' ');
                    setAsignacionValida(true);
                    setAperturaAsignada({
                        label: `${apertura.caja?.nombre ?? `Caja #${apertura.cajaId ?? '—'}`} — ${nombreEmpleado} — Apertura #${apertura.id}`,
                    });
                } else {
                    setAsignacionValida(false);
                    notifications.show({
                        color: 'red',
                        message: 'La caja abierta ya no está disponible o no corresponde al empleado seleccionado.',
                    });
                }
            }

        };

        cargar();
    }, [empleadoId, aperturaCajaId]);
    const cambiarCaja = (caja) => {
        if (caja === cajaActual) return;

        if (cajaActual === 1) {
            setCaja1(listaProductos);
        } else {
            setCaja2(listaProductos);
        }

        setListaProductos(caja === 1 ? listaCaja1 : listaCaja2);
        setCajaActual(caja);
    };

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
        if (
            (!asignacionValida || !empleadoId || !aperturaCajaId || !clienteId)
            || !metodoPago
            || listaProductos.length === 0
        ) {
            notifications.show({
                color: 'yellow',
                message: 'Se requiere una caja abierta, cliente y método de pago.',
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
        const respuesta = await api.venta.crearVenta({
            empleadoId: Number(empleadoId),
            aperturaCajaId: Number(aperturaCajaId),
            clienteId: Number(clienteId),
            metodoPagoId: Number(metodoPago),
            subtotal,
            total,
            detalleVenta
        });

        const registro = obtenerVenta(respuesta) ?? {};
        const detalleRegistrado = Array.isArray(registro.detalleVenta)
            ? registro.detalleVenta
            : listaProductos.map((item) => {
                const detalle = detalleVenta.find((linea) =>
                    String(linea.tipoItem ?? '').toUpperCase() === item.tipoItem &&
                    String(linea.productoId ?? linea.servicioId ?? linea.tipoMembresiaId) === String(item.id)
                );
                return {
                    ...detalle,
                    articuloNombre: item.nombre,
                    cantidad: item.cantidad,
                    precioUnitario: Number(item.precio),
                    subtotal: redondear(Number(item.precio) * item.cantidad),
                    tipoItem: item.tipoItem,
                };
            });
        setVentaCreada({
            ...registro,
            cliente: registro.cliente ?? clientes.find((cliente) => String(cliente.id) === clienteId),
            empleado: registro.empleado ?? {
                nombre: aperturaAsignada?.label?.split(' — ')[1] ?? 'Empleado',
            },
            aperturaCaja: registro.aperturaCaja ?? {
                id: Number(aperturaCajaId),
                caja: { nombre: aperturaAsignada?.label?.split(' — ')[0] ?? 'Caja' },
            },
            metodoPago: registro.metodoPago ?? metodosPago.find((metodo) => String(metodo.id) === metodoPago),
            detalleVenta: detalleRegistrado,
            subtotal: registro.subtotal ?? subtotal,
            total: registro.total ?? total,
            createdAt: registro.createdAt ?? new Date().toISOString(),
            estado: registro.estado ?? 'completada',
        });
        setClienteId(null);
        setMetodoPago(null);
        setCaja1([]);
        setCaja2([]);
        notifications.show({
            color: 'green',
            message: 'Venta creada correctamente.',
        });
        setListaProductos([]);
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

    const eliminarProducto = (producto) => {
        setListaProductos((listaAnterior) => listaAnterior.filter((item) =>
            !(item.id === producto.id && item.tipoItem === producto.tipoItem)
        ));
    };

    return (
        <div className={classes.principal}>
            <div className={classes.header}>
                <EncabezadoTabla
                    title="Nueva venta"
                    icon={IconShoppingCart}
                    rightContent={(
                        <>
                            <Title order={4}>Caja {cajaActual}</Title>
                            <Badge size="lg" variant="light" leftSection={<IconClock size={15} />}>
                                {hora}
                            </Badge>
                        </>
                    )}
                />
            </div>
            <div className={classes.catalogoLayout}>
                <div className={classes.catalogo}>
                    <Paper
                        withBorder
                        radius="md"
                        p="md"
                        className={classes.catalogoPaper}
                    >
                        <Tabs
                            value={tabCatalogo}
                            onChange={setTabCatalogo}
                            variant="pills"
                            className={classes.tabs}
                        >
                            <div className={classes.catalogoToolbar}>
                                <Tabs.List className={classes.tabsList}>
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
                                <TextInput
                                    aria-label="Buscar artículos por nombre o código de barras"
                                    className={classes.busquedaCatalogo}
                                    placeholder="Buscar por nombre o código de barras..."
                                    leftSection={<IconSearch size={17} />}
                                    value={busquedaCatalogo}
                                    onChange={(event) => setBusquedaCatalogo(event.currentTarget.value)}
                                />
                                <div className={classes.filtrosCatalogo}>
                                <Select
                                    aria-label="Ordenar catálogo"
                                    className={classes.filtroCatalogo}
                                    placeholder="Ordenar por"
                                    data={[
                                        { value: 'nombre-asc', label: 'Nombre: A-Z' },
                                        { value: 'nombre-desc', label: 'Nombre: Z-A' },
                                        { value: 'precio-asc', label: 'Precio: menor a mayor' },
                                        { value: 'precio-desc', label: 'Precio: mayor a menor' },
                                    ]}
                                    value={ordenCatalogo}
                                    onChange={setOrdenCatalogo}
                                    comboboxProps={{ zIndex: 1100 }}
                                    clearable
                                />
                                </div>
                            </div>

                           <Tabs.Panel value="productos" className={classes.tabsPanel}>
                                <ListaProductos
                                    tipoItem="PRODUCTO"
                                    productos={productos}
                                    agregarProducto={agregarProducto}
                                    busqueda={busquedaCatalogo}
                                    ordenCatalogo={ordenCatalogo}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="servicios" className={classes.tabsPanel}>
                                <ListaProductos tipoItem="SERVICIO" productos={servicios} agregarProducto={agregarProducto} busqueda={busquedaCatalogo} ordenCatalogo={ordenCatalogo} />
                            </Tabs.Panel>

                            <Tabs.Panel value="membresias" className={classes.tabsPanel}>
                                <ListaProductos tipoItem="MEMBRESIA" productos={membresias} agregarProducto={agregarProducto} busqueda={busquedaCatalogo} ordenCatalogo={ordenCatalogo} />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </div>
            </div>
            <Ticket  productos={listaProductos}
    sumar={sumar}
    restar={restar}
    eliminarProducto={eliminarProducto}
    eliminarTicket={eliminarTicket}
    cambiarCaja={cambiarCaja}
    cajaActual={cajaActual}
    onCobrar={cobrar}
    cobrando={cobrando}
    clientes={clientes}
    metodosPago={metodosPago}
    aperturaAsignada={aperturaAsignada}
    asignacionValida={asignacionValida}
    clienteId={clienteId} setClienteId={setClienteId}
    metodoPago={metodoPago} setMetodoPago={setMetodoPago}
    ></Ticket>
            {ventaCreada && (
                <ExportarDocumento
                    crearDocumento={async () => {
                        const { default: DocumentoTicketVenta } = await import(
                            '../../../documents/DocumentoTicketVenta.jsx'
                        );
                        return <DocumentoTicketVenta venta={ventaCreada} />;
                    }}
                    nombreArchivo={`ticket-${ventaCreada.folioVentaId ?? ventaCreada.id}.pdf`}
                    abrirAlMontar
                    ocultarBoton
                    onClose={() => setVentaCreada(null)}
                />
            )}
        </div>
    );

    
}
