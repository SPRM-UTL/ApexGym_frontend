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
    IconCash,
    IconClipboardList,
    IconClock,
    IconSearch,
    IconShoppingCart,
    IconWifiOff,
} from '@tabler/icons-react';
import { EncabezadoTabla } from '../../../components/TablaRegistros/TablaRegistros.jsx';
import ExportarDocumento from '../../../components/exportar-documento/ExportarDocumento.jsx';
import { ListaProductos } from '../components/ListaProductos.jsx';
import { ModalCobroVenta } from '../components/ModalCobroVenta.jsx';
import { ModalEsperaPagoMercadoPago } from '../components/ModalEsperaPagoMercadoPago.jsx';
import { Ticket } from '../components/Ticket.jsx';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTicketVenta } from '../hooks/useTicketVenta.js';
import { useCatalogosVenta } from '../hooks/useCatalogosVenta.js';
import { useClientesVenta } from '../hooks/useClientesVenta.js';
import { useCaja } from '../context/useCaja.js';
import { useOffline } from '../../../context/OfflineContext.jsx';
import {
    calcularMontos,
    calcularDescuentoUnitario,
    calcularSubtotalLinea,
    redondear,
} from '../utils/venta.utils.js';
import {
    esErrorCajaCerrada,
    obtenerMensajeSeguroVenta,
    obtenerVenta,
} from '../../../utils/ventaHelper/ventaHelpers.js';
import {
    esMetodoPagoEfectivo,
    normalizarCodigoMetodoPago,
    validarCobroWeb,
} from '../../../utils/offline/pagosValidacion.js';
import { registrarVentaOffline } from '../../../utils/offline/offlineSales.js';


const channel = new BroadcastChannel('app_sync_channel');
const VENTA_PENDIENTE_KEY = 'venta_pendiente_apertura_caja';

function leerVentaPendiente() {
    try {
        const guardado = sessionStorage.getItem(VENTA_PENDIENTE_KEY);
        if (!guardado) return null;

        return JSON.parse(guardado);
    } catch (error) {
        console.error('No se pudo leer o restaurar la venta pendiente.', error);
        try {
            sessionStorage.removeItem(VENTA_PENDIENTE_KEY);
        } catch (errorAlLimpiar) {
            console.error('No se pudo limpiar el carrito pendiente inválido.', errorAlLimpiar);
        }
        notifications.show({
            color: 'red',
            message: 'No se pudo recuperar el carrito guardado.',
        });
        return null;
    }
}

function limpiarVentaPendiente() {
    try {
        sessionStorage.removeItem(VENTA_PENDIENTE_KEY);
    } catch (error) {
        console.error('La venta se registró, pero no se pudo borrar el carrito pendiente.', error);
        notifications.show({
            color: 'yellow',
            message: 'La venta se registró, pero no se pudo borrar el carrito guardado. Recarga antes de continuar para evitar duplicarla.',
        });
    }
}

function triggerUpdate(data) {
    channel.postMessage({
        type: 'DATA_UPDATED',
        payload: data
    });
}

export function Nueva() {
    const location = useLocation();
    const navigate = useNavigate();
    const { aperturas } = useCaja();
    const { isOnline, refrescarEstadoLocal } = useOffline();
    const [ventaPendiente] = useState(leerVentaPendiente);
    const [hora, setHora] = useState('');
    const [ventaCreada, setVentaCreada] = useState(null);
    const [esperaMp, setEsperaMp] = useState(null);
    const {
        listaProductos,
        listaCaja1,
        listaCaja2,
        cajaActual,
        cambiarCaja,
        agregarProducto,
        sumar,
        restar,
        eliminarProducto,
        eliminarTicket,
        limpiarTickets,
        filtrarArticulosDisponibles,
    } = useTicketVenta(ventaPendiente ?? {});
    const [tabCatalogo, setTabCatalogo] = useState('productos');
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
    const [ordenCatalogo, setOrdenCatalogo] = useState(null);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [paginaCatalogo, setPaginaCatalogo] = useState(1);
    const { state } = location;
    const aperturaFallback = aperturas.length === 1 ? aperturas[0] : null;
    const aperturaCajaId = state?.aperturaCajaId != null
        ? String(state.aperturaCajaId)
        : (aperturaFallback ? String(aperturaFallback.id) : null);
    const empleadoId = state?.empleadoId != null
        ? String(state.empleadoId)
        : (aperturaFallback ? String(aperturaFallback.empleadoId ?? aperturaFallback.empleado?.id ?? '') : null);
    const aperturaSeleccionada = aperturas.find(
        (apertura) => String(apertura.id) === String(aperturaCajaId)
    );
    const {
        categorias,
        metodosPago,
        productos,
        servicios,
        membresias,
        catalogosDisponibles,
        sucursalId,
        catalogosSucursalId,
        recargarCatalogosVenta,
        totalCatalogo,
        totalPaginasCatalogo,
        cargandoCatalogo,
        aperturaAsignada,
        asignacionValida,
    } = useCatalogosVenta(empleadoId, aperturaCajaId, aperturaSeleccionada, {
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
        clienteDefault,
        total: totalClientes,
        totalPaginas: totalPaginasClientes,
        cargando: cargandoClientes,
        error: errorClientes,
    } = useClientesVenta();
    const [clienteId, setClienteId] = useState(ventaPendiente?.clienteId ?? null);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(ventaPendiente?.clienteSeleccionado ?? null);
    const [metodoPago, setMetodoPago] = useState(ventaPendiente?.metodoPago ?? null);
    const [datosTarjeta, setDatosTarjeta] = useState({
        folioVoucher: '',
        tipoTarjeta: 'DEBITO',
        marcaTarjeta: 'VISA',
        ultimosDigitos: '',
    });
    const [datosTransferencia, setDatosTransferencia] = useState({
        referencia: '',
        confirmada: false,
    });
    const [cobrando, setCobrando] = useState(false);
    const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
    const [montoRecibido, setMontoRecibido] = useState(ventaPendiente?.montoRecibido ?? 0);
    const llaveIdempotenciaRef = useRef(null);
    const limpiarTicketsRef = useRef(limpiarTickets);
    limpiarTicketsRef.current = limpiarTickets;

    useEffect(() => {
        if (!clienteId && !clienteSeleccionado && clienteDefault) {
            setClienteId(String(clienteDefault.id));
            setClienteSeleccionado(clienteDefault);
        }
    }, [clienteId, clienteSeleccionado, clienteDefault]);

    useEffect(() => {
        if (isOnline || metodosPago.length === 0) return;
        const seleccionado = metodosPago.find((m) => String(m.id) === String(metodoPago));
        if (seleccionado && esMetodoPagoEfectivo(seleccionado)) return;

        const efectivo = metodosPago.find((m) => esMetodoPagoEfectivo(m));
        if (efectivo) {
            setMetodoPago(String(efectivo.id));
            setMontoRecibido(0);
        }
    }, [isOnline, metodosPago, metodoPago]);

    useEffect(() => {
        triggerUpdate(listaProductos);
    }, [listaProductos]);

    useEffect(() => {
        if (!sucursalId || catalogosSucursalId !== sucursalId) return;

        filtrarArticulosDisponibles({
            PRODUCTO: new Set(catalogosDisponibles.productos.map((item) => String(item.id))),
            SERVICIO: new Set(catalogosDisponibles.servicios.map((item) => String(item.id))),
            MEMBRESIA: new Set(catalogosDisponibles.membresias.map((item) => String(item.id))),
        });
    }, [
        sucursalId,
        catalogosSucursalId,
        catalogosDisponibles,
        filtrarArticulosDisponibles,
    ]);

    useEffect(() => {
        const actualizarHora = () => {
            setHora(new Date().toLocaleString('es-MX'));
        };

        actualizarHora();

        const intervalo = setInterval(actualizarHora, 1000);

        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        if (!empleadoId || !aperturaCajaId || !aperturaSeleccionada) {
            notifications.show({
                color: 'yellow',
                message: 'Selecciona una caja abierta para iniciar una nueva venta.',
            });
            navigate('/registro-de-ventas', { replace: true });
        }
    }, [empleadoId, aperturaCajaId, aperturaSeleccionada, navigate]);

    const finalizarVentaCompletada = ({ registro, detalleRegistrado, metodoPagoUsado, totalVenta, montoRecibidoVenta, cambioVenta }) => {
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
            metodoPago: registro.metodoPago ?? metodoPagoUsado ?? { nombre: 'Mercado Pago' },
            detalleVenta: detalleRegistrado,
            subtotal: registro.subtotal ?? totalVenta,
            total: registro.total ?? totalVenta,
            montoRecibido: registro.montoRecibido ?? montoRecibidoVenta,
            cambio: registro.cambio ?? cambioVenta,
            createdAt: registro.createdAt ?? new Date().toISOString(),
            estado: registro.estado ?? 'completada',
        });
        setModalCobroAbierto(false);
        setCobrando(false);
        setMontoRecibido(0);
        setClienteId(clienteDefault ? String(clienteDefault.id) : null);
        setClienteSeleccionado(clienteDefault ?? null);
        setMetodoPago(null);
        setDatosTarjeta({ folioVoucher: '', tipoTarjeta: 'DEBITO', marcaTarjeta: 'VISA', ultimosDigitos: '' });
        setDatosTransferencia({ referencia: '', confirmada: false });
        limpiarVentaPendiente();
        limpiarTickets();
        llaveIdempotenciaRef.current = null;
    };

    const manejarPagoAprobadoMp = (ventaActualizada) => {
        if (!esperaMp) return;
        const ventaFinal = ventaActualizada ? { ...esperaMp.registro, ...ventaActualizada } : esperaMp.registro;
        const detalleFinal = esperaMp.detalleRegistrado;
        const metodoFinal = esperaMp.metodoPagoUsado;
        const totalFinal = esperaMp.total;
        setEsperaMp(null);
        finalizarVentaCompletada({
            registro: ventaFinal,
            detalleRegistrado: detalleFinal,
            metodoPagoUsado: metodoFinal,
            totalVenta: totalFinal,
            montoRecibidoVenta: totalFinal,
            cambioVenta: 0,
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('mp_return') !== '1') return undefined;

        const ventaId = Number(params.get('ventaId'));
        const paymentId = params.get('payment_id') ?? params.get('collection_id');
        if (!ventaId) return undefined;

        let cancelado = false;
        const verificarRetorno = async () => {
            try {
                const res = await api.venta.consultarEstadoPago(ventaId, paymentId);
                if (cancelado) return;
                const estadoVenta = String(res.data?.venta?.estado ?? '').toLowerCase();
                if (estadoVenta === 'completada') {
                    notifications.show({
                        color: 'green',
                        title: '¡Pago Confirmado!',
                        message: `Venta #${res.data?.venta?.folioVentaId ?? ventaId} confirmada con éxito.`,
                    });
                    if (res.data?.venta) {
                        setVentaCreada({
                            ...res.data.venta,
                            estado: 'completada',
                        });
                        limpiarVentaPendiente();
                        limpiarTicketsRef.current();
                    }
                }
            } catch (err) {
                console.error('[Mercado Pago Retorno]:', err);
            } finally {
                if (!cancelado) navigate(location.pathname, { replace: true });
            }
        };
        verificarRetorno();
        return () => { cancelado = true; };
    }, [location.pathname, location.search, navigate]);

    const cambiarMetodoPago = (value) => {
        setMetodoPago(value);
        const metodo = metodosPago.find((item) => String(item.id) === String(value));
        const pagoEfectivo = esMetodoPagoEfectivo(metodo);
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

        const todosLosClientes = [
            ...(clienteDefault ? [clienteDefault] : []),
            ...clientes,
        ];
        const cliente = todosLosClientes.find((registro) => String(registro.id) === String(id));
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
        if (!sucursalId) {
            notifications.show({
                color: 'red',
                message: 'La apertura seleccionada no tiene una sucursal asignada. Regresa y selecciona una caja asociada a una sucursal.',
            });
            return;
        }
        if (catalogosSucursalId !== sucursalId) {
            notifications.show({
                color: 'red',
                message: 'No se pudieron validar los artículos de esta sucursal. Recarga los catálogos antes de continuar.',
            });
            return;
        }
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

        const { subtotal, iva, total } = calcularMontos(listaProductos);
        const metodoActual = metodosPago.find((item) => String(item.id) === String(metodoPago));
        const codigoMetodo = normalizarCodigoMetodoPago(metodoActual);
        const pagoEfectivo = codigoMetodo === 'EFECTIVO';
        const pagoMercadoPago = codigoMetodo === 'MERCADO_PAGO';
        const montoPagado = Number(montoRecibido) || 0;
        const enLineaActual = isOnline && (typeof navigator === 'undefined' || navigator.onLine !== false);

        const validacion = validarCobroWeb({
            metodoCodigo: codigoMetodo,
            isOnline: enLineaActual,
            total,
            montoRecibido: montoPagado,
            datosTarjeta,
            datosTransferencia,
        });

        if (!validacion.valido) {
            notifications.show({
                color: validacion.codigoError === 'SOLO_EFECTIVO_OFFLINE' ? 'red' : 'yellow',
                message: validacion.mensaje,
            });
            return;
        }

        const detalleVenta = listaProductos.map((item) => {
            const precioUnitario = Number(item.precio);
            const linea = {
                tipoItem: item.tipoItem,
                articuloNombre: item.nombre,
                cantidad: item.cantidad,
                precioUnitario,
                descuentoUnitario: calcularDescuentoUnitario(item),
                subtotal: calcularSubtotalLinea(item),
            };

            if (item.tipoItem === 'PRODUCTO') linea.productoId = item.id;
            if (item.tipoItem === 'SERVICIO') linea.servicioId = item.id;
            if (item.tipoItem === 'MEMBRESIA') linea.tipoMembresiaId = item.id;

            return linea;
        });

        setCobrando(true);

        if (!enLineaActual) {
            try {
                const registroOffline = await registrarVentaOffline({
                    sucursalId: Number(sucursalId),
                    empleadoId: Number(empleadoId),
                    aperturaCajaId: Number(aperturaCajaId),
                    clienteId: Number(clienteId),
                    metodoPagoId: Number(metodoPago),
                    metodoPago: metodoActual,
                    subtotal,
                    iva,
                    total,
                    montoRecibido: montoPagado,
                    detalleVenta,
                    cliente: clienteSeleccionado,
                    empleado: {
                        id: Number(empleadoId),
                        nombre: aperturaAsignada?.label?.split(' — ')[1] ?? 'Empleado',
                    },
                    aperturaCaja: {
                        id: Number(aperturaCajaId),
                        caja: { nombre: aperturaAsignada?.label?.split(' — ')[0] ?? 'Caja' },
                    },
                });
                await refrescarEstadoLocal(Number(sucursalId));

                finalizarVentaCompletada({
                    registro: {
                        ...registroOffline,
                        folioVentaId: registroOffline.folioLocal,
                        estado: 'PENDIENTE_SYNC (Offline)',
                    },
                    detalleRegistrado: detalleVenta,
                    metodoPagoUsado: metodoActual,
                    totalVenta: total,
                    montoRecibidoVenta: montoPagado,
                    cambioVenta: registroOffline.cambio,
                });

                notifications.show({
                    color: 'green',
                    title: 'Venta offline guardada',
                    message: `Folio local ${registroOffline.folioLocal}. Se sincronizará automáticamente al recuperar la conexión.`,
                });
            } catch (error) {
                notifications.show({
                    color: 'red',
                    title: 'No se pudo guardar la venta offline',
                    message: error?.message || 'Verifica los datos e inténtalo de nuevo.',
                });
                setCobrando(false);
            }
            return;
        }

        const detallePayload = detalleVenta.map((linea) => {
            const copia = { ...linea };
            delete copia.articuloNombre;
            return copia;
        });

        try {
            const uuidIdempotencia = pagoMercadoPago
                ? (llaveIdempotenciaRef.current ??= window.crypto.randomUUID())
                : null;
            const respuesta = await api.venta.crearVenta({
                empleadoId: Number(empleadoId),
                aperturaCajaId: Number(aperturaCajaId),
                clienteId: Number(clienteId),
                metodoPagoId: Number(metodoPago),
                ...(pagoEfectivo ? { montoRecibido: montoPagado } : {}),
                subtotal,
                total,
                detalleVenta: detallePayload,
                ...(validacion.payloadPago ? { pago: validacion.payloadPago } : {}),
            }, sucursalId, uuidIdempotencia);

            const registro = obtenerVenta(respuesta) ?? {};

            const detalleRegistrado = Array.isArray(registro.detalleVenta)
                ? registro.detalleVenta
                : listaProductos.map((item) => {
                    const detalle = detallePayload.find((linea) =>
                        String(linea.tipoItem ?? '').toUpperCase() === item.tipoItem &&
                        String(linea.productoId ?? linea.servicioId ?? linea.tipoMembresiaId) === String(item.id)
                    );
                    return {
                        ...detalle,
                        articuloNombre: item.nombre,
                        cantidad: item.cantidad,
                        precioUnitario: Number(item.precio),
                        descuentoUnitario: calcularDescuentoUnitario(item),
                        subtotal: calcularSubtotalLinea(item),
                        tipoItem: item.tipoItem,
                    };
                });

            if (pagoMercadoPago) {
                if (registro.pagoDigital?.yaPagada || registro.estado === 'completada') {
                    notifications.show({ color: 'green', message: 'Esta venta ya cuenta con un pago confirmado.' });
                    finalizarVentaCompletada({
                        registro,
                        detalleRegistrado,
                        metodoPagoUsado: metodoActual,
                        totalVenta: total,
                        montoRecibidoVenta: total,
                        cambioVenta: 0,
                    });
                    return;
                }
                const urlCheckout = registro.pagoDigital?.urlCheckout;
                if (!urlCheckout) {
                    throw new Error('La venta quedó pendiente, pero Mercado Pago no devolvió el enlace de pago. Reintenta sin cambiar el carrito.');
                }

                window.open(urlCheckout, '_blank');

                setEsperaMp({
                    ventaId: registro.id,
                    folio: registro.folioVentaId ?? registro.id,
                    total,
                    urlCheckout,
                    registro,
                    detalleRegistrado,
                    metodoPagoUsado: metodoActual,
                    estado: 'ESPERANDO',
                });
                setModalCobroAbierto(false);
                setCobrando(false);
                return;
            }

            finalizarVentaCompletada({
                registro,
                detalleRegistrado,
                metodoPagoUsado: metodoActual,
                totalVenta: total,
                montoRecibidoVenta: pagoEfectivo ? montoPagado : total,
                cambioVenta: pagoEfectivo ? Math.max(0, redondear(montoPagado - total)) : 0,
            });
            notifications.show({
                color: 'green',
                message: 'Venta creada correctamente.',
            });
        } catch (error) {
            if (pagoMercadoPago && error.statusCode && error.statusCode < 500) {
                llaveIdempotenciaRef.current = null;
            }
            if (esErrorCajaCerrada(error)) {
                try {
                    sessionStorage.setItem(VENTA_PENDIENTE_KEY, JSON.stringify({
                        listaProductos,
                        listaCaja1,
                        listaCaja2,
                        cajaActual,
                        clienteId,
                        clienteSeleccionado,
                        metodoPago,
                        montoRecibido,
                    }));
                } catch (errorAlGuardar) {
                    console.error('No se pudo conservar el carrito antes de abrir la caja.', errorAlGuardar);
                    notifications.show({
                        color: 'yellow',
                        message: 'No se pudo guardar el carrito. Anota los artículos antes de continuar.',
                    });
                }
                notifications.show({
                    color: 'red',
                    message: 'La caja ya no está abierta. Abre una caja para continuar con la venta.',
                });
                navigate('/apertura-caja', { replace: true, state: { from: location } });
                return;
            }

            const detalleError = String(error.message ?? '');
            notifications.show({
                color: 'red',
                title: 'No se pudo completar la venta',
                message: obtenerMensajeSeguroVenta(error, 'la venta'),
            });
            if (
                error.statusCode === 400
                && /producto|servicio|membres[ií]a|disponible|inactiv[oa]/i.test(detalleError)
            ) {
                await recargarCatalogosVenta();
            }
        } finally {
            setCobrando(false);
        }
    };

    const totalVenta = calcularMontos(listaProductos).total;
    const metodoPagoSeleccionado = metodosPago.find(
        (metodo) => String(metodo.id) === String(metodoPago)
    );
    const esPagoEfectivo = esMetodoPagoEfectivo(metodoPagoSeleccionado);
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
                            {!isOnline && (
                                <Badge
                                    size="lg"
                                    color="red"
                                    variant="filled"
                                    leftSection={<IconWifiOff size={15} />}
                                >
                                    Sin conexión · Solo efectivo
                                </Badge>
                            )}
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
                                        leftSection={<IconBottle size={17} />}
                                    >
                                        Productos
                                    </Tabs.Tab>

                                    <Tabs.Tab
                                        value="servicios"
                                        leftSection={<IconCash size={17} />}
                                    >
                                        Servicios
                                    </Tabs.Tab>

                                    <Tabs.Tab
                                        value="membresias"
                                        leftSection={<IconClipboardList size={17} />}
                                    >
                                        Membresías
                                    </Tabs.Tab>
                                </Tabs.List>
                                <div className={classes.catalogoFiltrosToolbar}>
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
                                                comboboxProps={{ zIndex: 1100 }}
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
                                    onPaginaChange={setPaginaCatalogo}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </div>
            </div>
            <Ticket
                productos={listaProductos}
                sumar={sumar}
                restar={restar}
                eliminarProducto={eliminarProducto}
                eliminarTicket={eliminarTicket}
                cambiarCaja={cambiarCaja}
                cajaActual={cajaActual}
                onCobrar={abrirModalCobro}
                cobrando={cobrando}
            />
            <ModalCobroVenta
                opened={modalCobroAbierto}
                onClose={() => {
                    if (!cobrando) setModalCobroAbierto(false);
                }}
                asignacionValida={asignacionValida}
                isOnline={isOnline}
                clientes={clientes}
                clienteDefault={clienteDefault}
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
                datosTarjeta={datosTarjeta}
                onDatosTarjetaChange={setDatosTarjeta}
                datosTransferencia={datosTransferencia}
                onDatosTransferenciaChange={setDatosTransferencia}
                cobrando={cobrando}
                onConfirm={confirmarCobro}
            />
            <ModalEsperaPagoMercadoPago
                datosPago={esperaMp}
                onPagoAprobado={manejarPagoAprobadoMp}
                onClose={() => setEsperaMp(null)}
            />
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
