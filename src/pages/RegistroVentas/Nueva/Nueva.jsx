
import classes from './Nueva.module.css';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';

import {
    Badge,
    Paper,
    Select,
    Tabs,
    TextInput,
    Title,
} from '@mantine/core';

import {
    IconBottle,
    IconClipboardList,
    IconCash,
    IconShoppingCart,
    IconSearch,
    IconClock,
} from '@tabler/icons-react';
import { EncabezadoTabla } from '../../../components/TablaRegistros/TablaRegistros.jsx';
import ExportarDocumento from '../../../components/exportar-documento/ExportarDocumento.jsx';
import { ListaProductos } from '../components/ListaProductos.jsx';
import { ModalCobroVenta } from '../components/ModalCobroVenta.jsx';
import { Ticket } from '../components/Ticket.jsx';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTicketVenta } from '../hooks/useTicketVenta.js';
import { useCatalogosVenta } from '../hooks/useCatalogosVenta.js';
import { useClientesVenta } from '../hooks/useClientesVenta.js';
import {
    calcularMontos,
    redondear,
} from '../utils/venta.utils.js';
import { obtenerVenta } from '../../../utils/ventaHelper/ventaHelpers.js';


const channel = new BroadcastChannel('app_sync_channel');

function triggerUpdate(data) {
    channel.postMessage({
        type: 'DATA_UPDATED',
        payload: data
    });
}

export function Nueva() {
    const [hora, setHora] = useState('');
    const [ventaCreada, setVentaCreada] = useState(null);
    const {
        listaProductos,
        cajaActual,
        cambiarCaja,
        agregarProducto,
        sumar,
        restar,
        eliminarProducto,
        eliminarTicket,
        limpiarTickets,
    } = useTicketVenta();
    const [tabCatalogo, setTabCatalogo] = useState('productos');
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [ordenCatalogo, setOrdenCatalogo] = useState(null);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [paginaCatalogo, setPaginaCatalogo] = useState(1);
    const { state } = useLocation();
    const empleadoId = state?.empleadoId != null ? String(state.empleadoId) : null;
    const aperturaCajaId = state?.aperturaCajaId != null ? String(state.aperturaCajaId) : null;
    const {
        categorias,
        metodosPago,
        productos,
        servicios,
        membresias,
        totalCatalogo,
        totalPaginasCatalogo,
        cargandoCatalogo,
        errorCatalogo,
        aperturaAsignada,
        asignacionValida,
    } = useCatalogosVenta(empleadoId, aperturaCajaId, {
        tipoItem: tabCatalogo,
        busqueda: busquedaCatalogo,
        pagina: paginaCatalogo,
        categoriaId: categoriaSeleccionada,
        orden: ordenCatalogo,
        onPaginaChange: setPaginaCatalogo,
    });
    const {
        busqueda: busquedaClientes,
        cambiarBusqueda: cambiarBusquedaClientes,
        pagina: paginaClientes,
        setPagina: setPaginaClientes,
        clientes,
        total: totalClientes,
        totalPaginas: totalPaginasClientes,
        cargando: cargandoClientes,
        error: errorClientes,
    } = useClientesVenta();
    const [clienteId, setClienteId] = useState(null);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [metodoPago, setMetodoPago] = useState(null);
    const [cobrando, setCobrando] = useState(false);
    const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
    const [montoRecibido, setMontoRecibido] = useState(0);


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

    const cambiarMetodoPago = (value) => {
        setMetodoPago(value);
        const metodo = metodosPago.find((item) => String(item.id) === String(value));
        const pagoEfectivo = metodo?.codigo === 'EFECTIVO';
        setMontoRecibido(
            value && !pagoEfectivo
                ? calcularMontos(listaProductos).total
                : 0
        );
    };

    const seleccionarCliente = (id) => {
        setClienteId(id);
        if (!id) {
            setClienteSeleccionado(null);
            cambiarBusquedaClientes('');
            return;
        }

        const cliente = clientes.find((registro) => String(registro.id) === String(id));
        setClienteSeleccionado(cliente ?? null);
        cambiarBusquedaClientes('');
    };

    const cambiarTabCatalogo = (tab) => {
        if (!tab) return;
        setTabCatalogo(tab);
        setPaginaCatalogo(1);
        if (tab !== 'productos') setCategoriaSeleccionada(null);
    };

    const abrirModalCobro = () => {
        if (listaProductos.length === 0) {
            notifications.show({
                color: 'yellow',
                message: 'Agrega al menos un artículo antes de cobrar.',
            });
            return;
        }

        setModalCobroAbierto(true);
    };

    const confirmarCobro = async () => {
        if (!asignacionValida || !empleadoId || !aperturaCajaId) {
            notifications.show({
                color: 'red',
                message: 'No hay una caja abierta asignada. Regresa al registro de ventas y selecciona una caja abierta.',
            });
            return;
        }
        if (!clienteId) {
            notifications.show({
                color: 'red',
                message: 'Selecciona un cliente para continuar con la venta.',
            });
            return;
        }
        if (!metodoPago) {
            notifications.show({ color: 'yellow', message: 'Selecciona un método de pago.' });
            return;
        }

    const {subtotal, total } = calcularMontos(listaProductos);
    const pagoEfectivo = metodoPagoSeleccionado?.codigo === 'EFECTIVO';
    const montoPagado = Number(montoRecibido) || 0;
    if (pagoEfectivo && montoPagado < total) {
        notifications.show({ color: 'yellow', message: 'El monto recibido no cubre el total de la venta.' });
        return;
    }

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
            ...(pagoEfectivo ? { montoRecibido: montoPagado } : {}),
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
            cliente: registro.cliente ?? clienteSeleccionado,
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
            montoRecibido: registro.montoRecibido ?? (pagoEfectivo ? montoPagado : total),
            cambio: registro.cambio ?? (pagoEfectivo ? Math.max(0, redondear(montoPagado - total)) : 0),
            createdAt: registro.createdAt ?? new Date().toISOString(),
            estado: registro.estado ?? 'completada',
        });
        setModalCobroAbierto(false);
        setMontoRecibido(0);
        setClienteId(null);
        setClienteSeleccionado(null);
        setMetodoPago(null);
        limpiarTickets();
        notifications.show({
            color: 'green',
            message: 'Venta creada correctamente.',
        });
    } catch (error) {
        notifications.show({
            color: 'red',
            message: error.message || 'No se pudo crear la venta.',
        });
    } finally {
        setCobrando(false);
    }
    };



    const totalVenta = calcularMontos(listaProductos).total;
    const metodoPagoSeleccionado = metodosPago.find(
        (metodo) => String(metodo.id) === String(metodoPago)
    );
    const esPagoEfectivo = metodoPagoSeleccionado?.codigo === 'EFECTIVO';
    const cambio = esPagoEfectivo
        ? Math.max(0, redondear((Number(montoRecibido) || 0) - totalVenta))
        : 0;

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
                            onChange={cambiarTabCatalogo}
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
                                    aria-label={tabCatalogo === 'productos'
                                        ? 'Buscar productos por nombre o código de barras'
                                        : `Buscar ${tabCatalogo} por nombre`}
                                    className={classes.busquedaCatalogo}
                                    placeholder={tabCatalogo === 'productos'
                                        ? 'Buscar por nombre o código de barras...'
                                        : 'Buscar por nombre...'}
                                    leftSection={<IconSearch size={17} />}
                                    value={busquedaCatalogo}
                                    onChange={(event) => {
                                        setBusquedaCatalogo(event.currentTarget.value);
                                        setPaginaCatalogo(1);
                                    }}
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
                                    onChange={(value) => {
                                        setOrdenCatalogo(value);
                                        setPaginaCatalogo(1);
                                    }}
                                    comboboxProps={{ zIndex: 1100 }}
                                    clearable
                                />
                                    {tabCatalogo === 'productos' && (
                                    <Select
                                        aria-label="Filtrar por categoría"
                                        className={classes.filtroCatalogo}
                                        placeholder="Todas las categorías"
                                        clearable
                                        value={categoriaSeleccionada}
                                        onChange={(value) => {
                                            setCategoriaSeleccionada(value);
                                            setPaginaCatalogo(1);
                                        }}
                                        data={categorias.map((categoria) => ({
                                            value: String(categoria.id),
                                            label: categoria.nombre,
                                        }))}
                                    />
                                    )}
                                </div>
                            </div>

                           <Tabs.Panel value="productos" className={classes.tabsPanel}>
                                <ListaProductos
                                    tipoItem="PRODUCTO"
                                    productos={productos}
                                    agregarProducto={agregarProducto}
                                    busqueda={busquedaCatalogo}
                                    categoriaId={categoriaSeleccionada}
                                    pagina={paginaCatalogo}
                                    totalPaginas={totalPaginasCatalogo}
                                    total={totalCatalogo}
                                    cargando={cargandoCatalogo}
                                    error={errorCatalogo}
                                    onPaginaChange={setPaginaCatalogo}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="servicios" className={classes.tabsPanel}>
                                <ListaProductos
                                    tipoItem="SERVICIO"
                                    productos={servicios}
                                    agregarProducto={agregarProducto}
                                    busqueda={busquedaCatalogo}
                                    pagina={paginaCatalogo}
                                    totalPaginas={totalPaginasCatalogo}
                                    total={totalCatalogo}
                                    cargando={cargandoCatalogo}
                                    error={errorCatalogo}
                                    onPaginaChange={setPaginaCatalogo}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="membresias" className={classes.tabsPanel}>
                                <ListaProductos
                                    tipoItem="MEMBRESIA"
                                    productos={membresias}
                                    agregarProducto={agregarProducto}
                                    busqueda={busquedaCatalogo}
                                    pagina={paginaCatalogo}
                                    totalPaginas={totalPaginasCatalogo}
                                    total={totalCatalogo}
                                    cargando={cargandoCatalogo}
                                    error={errorCatalogo}
                                    onPaginaChange={setPaginaCatalogo}
                                />
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
    onCobrar={abrirModalCobro}
    cobrando={cobrando}
    ></Ticket>
            <ModalCobroVenta
                opened={modalCobroAbierto}
                onClose={() => {
                    if (!cobrando) setModalCobroAbierto(false);
                }}
                asignacionValida={asignacionValida}
                clientes={clientes}
                clienteSeleccionado={clienteSeleccionado}
                clienteId={clienteId}
                busquedaCliente={busquedaClientes}
                onBusquedaClienteChange={cambiarBusquedaClientes}
                onClienteChange={seleccionarCliente}
                totalClientes={totalClientes}
                paginaClientes={paginaClientes}
                totalPaginasClientes={totalPaginasClientes}
                onPaginaClientesChange={setPaginaClientes}
                cargandoClientes={cargandoClientes}
                errorClientes={errorClientes}
                metodosPago={metodosPago}
                metodoPago={metodoPago}
                onMetodoPagoChange={cambiarMetodoPago}
                total={totalVenta}
                montoRecibido={montoRecibido}
                onMontoRecibidoChange={setMontoRecibido}
                esPagoEfectivo={esPagoEfectivo}
                cambio={cambio}
                cobrando={cobrando}
                onConfirm={confirmarCobro}
            />            {ventaCreada && (
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
