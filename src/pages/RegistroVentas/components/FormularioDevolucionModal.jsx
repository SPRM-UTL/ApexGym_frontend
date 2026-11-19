import { useEffect, useMemo, useRef, useState } from 'react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
    Badge,
    Button,
    Checkbox,
    Group,
    Loader,
    Modal,
    NumberInput,
    Paper,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Textarea,
} from '@mantine/core';
import { IconArrowBackUp, IconCashBanknote, IconPackage } from '@tabler/icons-react';
import { api } from '../../../scripts/services/api.js';
import {
    obtenerMensajeSeguroVenta,
    obtenerRegistros,
} from '../../../utils/ventaHelper/ventaHelpers.js';
import classes from './DetalleVentaModal.module.css';

const moneda = (valor) => `$${Number(valor ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const nombreArticulo = (detalle) =>
    detalle.articuloNombre
    ?? detalle.producto?.nombre
    ?? detalle.servicio?.nombre
    ?? detalle.tipoMembresia?.nombre
    ?? detalle.descripcion
    ?? 'Artículo';

function obtenerDetallesDisponibles(respuesta) {
    const detallesDisponibles = respuesta?.data?.detalles;
    if (!Array.isArray(detallesDisponibles)) {
        throw new Error('El servidor devolvió datos de disponibilidad no válidos.');
    }

    return detallesDisponibles.map((detalle) => {
        const id = Number(detalle.detalleVentaId);
        const cantidad = Number(detalle.cantidad);
        const cantidadDisponible = Number(detalle.cantidadDisponible);
        if (
            !Number.isSafeInteger(id)
            || id <= 0
            || !Number.isSafeInteger(cantidad)
            || cantidad < 0
            || !Number.isSafeInteger(cantidadDisponible)
            || cantidadDisponible < 0
            || cantidadDisponible > cantidad
        ) {
            throw new Error('El servidor devolvió cantidades disponibles no válidas.');
        }

        return {
            ...detalle,
            id,
            cantidad,
            cantidadDisponible,
            tipoItem: String(detalle.tipoItem ?? '').toUpperCase(),
        };
    });
}

function crearSeleccionInicial(detalles) {
    return Object.fromEntries(detalles.map((detalle) => [
        detalle.id,
        { cantidad: 0, regresaAStock: false },
    ]));
}

export function FormularioDevolucionModal({ venta, cargando, onClose, onSuccess }) {
    const ventaId = venta?.id;
    const [aperturas, setAperturas] = useState([]);
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [aperturaCajaId, setAperturaCajaId] = useState('');
    const [cargandoAperturas, setCargandoAperturas] = useState(false);
    const [cargandoDevolucion, setCargandoDevolucion] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [folioCancelacion, setFolioCancelacion] = useState('');
    const [confirmacionTerminal, setConfirmacionTerminal] = useState(false);
    const [seleccion, setSeleccion] = useState({});
    const [previsualizacion, setPrevisualizacion] = useState(null);
    const [cargandoPrevisualizacion, setCargandoPrevisualizacion] = useState(false);
    const [errorPrevisualizacion, setErrorPrevisualizacion] = useState(false);
    const [intentoPrevisualizacion, setIntentoPrevisualizacion] = useState(0);
    const ejecucionEnCurso = useRef(false);

    const detalles = useMemo(() => (disponibilidad?.detalles ?? []).map((detalle) => ({
        ...detalle,
        id: detalle.detalleVentaId,
        tipoItem: String(detalle.tipoItem ?? '').toUpperCase(),
    })), [disponibilidad]);
    const cantidadesNoDisponibles = !disponibilidad
        || detalles.some((detalle) => detalle.cantidadDisponible === null);
    const lineasSeleccionadas = useMemo(() => detalles.filter((detalle) => (
        Number(seleccion[detalle.id]?.cantidad ?? 0) > 0
    )), [detalles, seleccion]);
    const detallesSolicitados = useMemo(() => lineasSeleccionadas.map((detalle) => ({
        detalleVentaId: Number(detalle.id),
        cantidad: Number(seleccion[detalle.id].cantidad),
        regresaAStock: detalle.tipoItem === 'PRODUCTO'
            && Boolean(seleccion[detalle.id].regresaAStock),
    })), [lineasSeleccionadas, seleccion]);
    const claveSolicitud = JSON.stringify(detallesSolicitados);
    const cotizacionVigente = previsualizacion?.claveSolicitud === claveSolicitud
        ? previsualizacion.data
        : null;
    const desglose = cotizacionVigente?.desglose;
    const descuentoTotal = cotizacionVigente?.detalles?.reduce(
        (total, detalle) => total + Number(detalle.descuentoUnitario ?? 0) * Number(detalle.cantidad ?? 0),
        0
    );
    const metodoPago = disponibilidad?.metodoPago ?? venta?.metodoPago;
    const codigoMetodoPago = String(metodoPago?.codigo ?? '').toUpperCase();
    const esMercadoPago = codigoMetodoPago === 'MERCADO_PAGO';
    const esTerminal = codigoMetodoPago === 'TARJETA';

    useEffect(() => {
        let activo = true;
        if (!ventaId) {
            setAperturas([]);
            setDisponibilidad(null);
            setAperturaCajaId('');
            setMotivo('');
            setSeleccion({});
            setFolioCancelacion('');
            setConfirmacionTerminal(false);
            setPrevisualizacion(null);
            setCargandoPrevisualizacion(false);
            setErrorPrevisualizacion(false);
            return undefined;
        }

        setCargandoAperturas(true);
        setFolioCancelacion('');
        setConfirmacionTerminal(false);
        setDisponibilidad(null);
        setPrevisualizacion(null);
        setCargandoPrevisualizacion(false);
        setErrorPrevisualizacion(false);
        Promise.all([
            api.aperturaCaja.obtenerAbiertas(),
            api.venta.obtenerDisponibilidadDevolucion(ventaId),
        ]).then(([respuestaAperturas, respuestaDisponibilidad]) => {
            if (!activo) return;
            if (respuestaAperturas.responseFlag !== 0) {
                throw new Error(respuestaAperturas.message || 'No se pudieron cargar las cajas abiertas.');
            }
            if (respuestaDisponibilidad.responseFlag !== 0) {
                throw new Error(respuestaDisponibilidad.message || 'No se pudo cargar la disponibilidad de devolución.');
            }
            const detallesDisponibles = obtenerDetallesDisponibles(respuestaDisponibilidad);
            const listaAperturas = obtenerRegistros(respuestaAperturas, 'aperturas de caja')
                .filter((apertura) => String(apertura.estado ?? '').toUpperCase() === 'ABIERTA');
            setAperturas(listaAperturas);
            setAperturaCajaId(listaAperturas.length === 1 ? String(listaAperturas[0].id) : '');
            setDisponibilidad(respuestaDisponibilidad.data);
            setSeleccion(crearSeleccionInicial(detallesDisponibles));
            if (listaAperturas.length === 0) {
                notifications.show({
                    color: 'yellow',
                    title: 'No hay caja abierta',
                    message: 'Abre una caja antes de registrar la devolución.',
                });
            }
        }).catch(() => {
            if (activo) {
                setAperturas([]);
                setDisponibilidad(null);
                notifications.show({
                    color: 'red',
                    title: 'No se pudieron cargar los datos de devolución',
                    message: 'Intenta abrir nuevamente la devolución.',
                });
            }
        }).finally(() => {
            if (activo) setCargandoAperturas(false);
        });

        return () => {
            activo = false;
        };
    }, [ventaId]);

    useEffect(() => {
        let activo = true;
        if (!ventaId || !disponibilidad || detallesSolicitados.length === 0) {
            setCargandoPrevisualizacion(false);
            setErrorPrevisualizacion(false);
            return undefined;
        }

        const solicitudActual = JSON.stringify(detallesSolicitados);
        setCargandoPrevisualizacion(true);
        setErrorPrevisualizacion(false);
        api.venta.previsualizarDevolucion(ventaId, detallesSolicitados)
            .then((respuesta) => {
                if (!activo) return;
                if (respuesta.responseFlag !== 0) {
                    throw new Error(respuesta.message || 'No se pudo calcular la devolución.');
                }
                if (!respuesta.data?.desglose || !Array.isArray(respuesta.data?.detalles)) {
                    throw new Error('El servidor devolvió una previsualización no válida.');
                }
                setPrevisualizacion({
                    claveSolicitud: solicitudActual,
                    data: respuesta.data,
                });
            })
            .catch((error) => {
                if (activo) {
                    setErrorPrevisualizacion(true);
                    notifications.show({
                        color: 'red',
                        title: 'No se pudo calcular la devolución',
                        message: obtenerMensajeSeguroVenta(error, 'la devolución'),
                    });
                }
            })
            .finally(() => {
                if (activo) setCargandoPrevisualizacion(false);
            });

        return () => {
            activo = false;
        };
    }, [ventaId, disponibilidad, detallesSolicitados, intentoPrevisualizacion]);

    const actualizarSeleccion = (detalleId, cambios) => {
        setSeleccion((actual) => ({
            ...actual,
            [detalleId]: { ...actual[detalleId], ...cambios },
        }));
        setPrevisualizacion(null);
        setErrorPrevisualizacion(false);
    };

    const ejecutarDevolucion = async () => {
        if (!aperturaCajaId) return;
        if (!motivo.trim()) return;
        if (cantidadesNoDisponibles || lineasSeleccionadas.length === 0) return;
        if (!cotizacionVigente || cargandoPrevisualizacion) return;
        if (esTerminal && (!folioCancelacion.trim() || !confirmacionTerminal)) return;
        if (ejecucionEnCurso.current) return;

        ejecucionEnCurso.current = true;
        setCargandoDevolucion(true);
        try {
            const respuesta = await api.venta.crearDevolucion(venta.id, {
                aperturaCajaId: Number(aperturaCajaId),
                motivo: motivo.trim(),
                detalles: detallesSolicitados,
                montoPrevisualizado: cotizacionVigente.desglose.montoTotal,
                cantidadesDevueltasPrevisualizadas: cotizacionVigente.cantidadesDevueltasPrevisualizadas,
                folioCancelacion: esTerminal ? folioCancelacion.trim() : null,
                confirmacionTerminal,
            });
            if (respuesta.responseFlag !== 0) {
                throw new Error(respuesta.message || 'No se pudo registrar la devolución.');
            }
            await onSuccess?.(respuesta.data);
            onClose();
        } catch (error) {
            const datosError = error.data?.data ?? error.data;
            if (datosError?.code === 'COTIZACION_DESACTUALIZADA') {
                try {
                    const respuestaDisponibilidad = await api.venta.obtenerDisponibilidadDevolucion(venta.id);
                    if (respuestaDisponibilidad.responseFlag !== 0) {
                        throw new Error(
                            respuestaDisponibilidad.message
                            || 'No se pudo actualizar la disponibilidad de devolución.'
                        );
                    }
                    const detallesDisponibles = obtenerDetallesDisponibles(respuestaDisponibilidad);
                    setDisponibilidad(respuestaDisponibilidad.data);
                    setSeleccion(crearSeleccionInicial(detallesDisponibles));
                    notifications.show({
                        color: 'yellow',
                        title: 'La disponibilidad cambió',
                        message: 'Se actualizaron las cantidades; vuelve a seleccionar las líneas para confirmar.',
                    });
                } catch {
                    notifications.show({
                        color: 'red',
                        title: 'No se pudo actualizar la disponibilidad',
                        message: 'Vuelve a cargar los datos de devolución e inténtalo nuevamente.',
                    });
                }
            } else {
                const mensajeSeguro = obtenerMensajeSeguroVenta(error, 'la devolución');
                notifications.show({
                    color: 'red',
                    title: 'No se pudo completar la devolución',
                    message: mensajeSeguro,
                    autoClose: 8000,
                });
            }
        } finally {
            ejecucionEnCurso.current = false;
            setCargandoDevolucion(false);
        }
    };

    const confirmar = () => {
        if (ejecucionEnCurso.current || !aperturaCajaId || !motivo.trim() || !lineasSeleccionadas.length
            || cantidadesNoDisponibles || !cotizacionVigente || cargandoPrevisualizacion
            || (esTerminal && (!folioCancelacion.trim() || !confirmacionTerminal))) {
            return;
        }

        modals.openConfirmModal({
            centered: true,
            zIndex: 1000002,
            title: '¿Confirmas la devolución?',
            children: (
                <Stack gap="xs">
                    <Text size="sm">Monto: <strong>{moneda(cotizacionVigente.desglose.montoTotal)}</strong></Text>
                    <Text size="sm">Método de devolución: <strong>{esMercadoPago ? 'Efectivo' : metodoPago?.nombre ?? 'No identificado'}</strong></Text>
                    <Text size="sm" c="red" fw={500}>Esta acción no se puede deshacer.</Text>
                </Stack>
            ),
            labels: { confirm: 'Confirmar devolución', cancel: 'Volver' },
            confirmProps: { color: 'orange' },
            onConfirm: ejecutarDevolucion,
        });
    };

    const lineasCotizadas = new Map(
        (cotizacionVigente?.detalles ?? []).map((detalle) => [detalle.detalleVentaId, detalle])
    );
    const aperturasData = aperturas.map((apertura) => ({
        value: String(apertura.id),
        label: `${apertura.caja?.nombre ?? `Caja #${apertura.cajaId ?? '—'}`} — ${apertura.empleado?.nombre ?? 'Empleado'} — Apertura #${apertura.id}`,
    }));

    return (
        <Modal
            opened={Boolean(venta)}
            onClose={() => !cargandoDevolucion && onClose()}
            title={(
                <Group gap="md" wrap="nowrap" className={classes.tituloGrupo}>
                    <span className={classes.tituloIcono}><IconArrowBackUp size={26} /></span>
                    <Text className={classes.titulo}>Devolución de venta #{venta?.folioVentaId ?? venta?.id ?? ''}</Text>
                </Group>
            )}
            centered
            size="calc(100vw - 48px)"
            padding={0}
            radius="lg"
            withCloseButton
            closeButtonProps={{ 'aria-label': 'Cerrar devolución' }}
            closeOnClickOutside={!cargandoDevolucion}
            closeOnEscape={!cargandoDevolucion}
            overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
            zIndex={1000001}
            classNames={{
                content: classes.modal,
                header: classes.header,
                title: classes.modalTitle,
                close: classes.closeButton,
                body: classes.body,
            }}
        >
            {cargando || cargandoAperturas ? (
                <div className={classes.content}><Loader size="sm" /><Text>Cargando datos de devolución...</Text></div>
            ) : venta ? (
                <Stack gap={0}>
                    <div className={classes.content}>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {aperturas.length > 0 && (
                                <Select
                                    label="Caja abierta para registrar el reembolso"
                                    placeholder={aperturas.length > 1 ? 'Selecciona una apertura' : undefined}
                                    data={aperturasData}
                                    value={aperturaCajaId}
                                    onChange={(value) => {
                                        setAperturaCajaId(value);
                                    }}
                                    disabled={aperturas.length === 1}
                                    searchable
                                    comboboxProps={{ zIndex: 1000002 }}
                                />
                            )}
                            <Paper p="sm" radius="md" withBorder>
                                <Group gap="xs">
                                    <IconCashBanknote size={19} />
                                    <Text size="sm" c="dimmed">Método de devolución</Text>
                                    <Badge color="blue" variant="light">
                                        {esMercadoPago
                                            ? 'Efectivo'
                                            : disponibilidad?.metodoPago?.nombre ?? venta.metodoPago?.nombre ?? 'No identificado'}
                                    </Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mt={4}>
                                    {esMercadoPago
                                        ? 'Se entregará efectivo y se registrará la salida en caja. No se solicitará un reembolso a Mercado Pago.'
                                        : esTerminal
                                            ? 'La devolución requiere cancelar primero el cobro en la terminal.'
                                            : 'El reembolso se registra mediante el método de pago original.'}
                                </Text>
                            </Paper>
                        </SimpleGrid>

                        {esTerminal && (
                            <Paper p="sm" radius="md" withBorder>
                                <Stack gap="xs">
                                    <TextInput
                                        label="Folio de cancelación de la terminal"
                                        placeholder="Ingresa el folio del voucher cancelado"
                                        required
                                        maxLength={100}
                                        value={folioCancelacion}
                                        onChange={(event) => setFolioCancelacion(event.currentTarget.value)}
                                        disabled={cargandoDevolucion}
                                    />
                                    <Checkbox
                                        label="Confirmo que ya cancelé este cobro en la terminal y devolví el dinero al cliente."
                                        checked={confirmacionTerminal}
                                        onChange={(event) => setConfirmacionTerminal(event.currentTarget.checked)}
                                        disabled={cargandoDevolucion}
                                    />
                                </Stack>
                            </Paper>
                        )}

                        <div className={classes.tabla}>
                            <Table horizontalSpacing="sm" verticalSpacing="xs" miw={1050}>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Artículo</Table.Th>
                                        <Table.Th ta="center">Disponible</Table.Th>
                                        <Table.Th ta="center">Devolver</Table.Th>
                                        <Table.Th ta="right">Precio unitario</Table.Th>
                                        <Table.Th ta="right">Descuento</Table.Th>
                                        <Table.Th ta="right">Subtotal</Table.Th>
                                        <Table.Th ta="right">IVA</Table.Th>
                                        <Table.Th ta="right">Ajuste</Table.Th>
                                        <Table.Th ta="right">Reembolso</Table.Th>
                                        <Table.Th>Inventario</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {detalles.map((detalle) => {
                                        const cantidad = Number(seleccion[detalle.id]?.cantidad ?? 0);
                                        const cotizacionLinea = lineasCotizadas.get(detalle.id);
                                        const esMembresia = detalle.tipoItem === 'MEMBRESIA';
                                        const noDisponible = detalle.cantidadDisponible === null || detalle.cantidadDisponible === 0;
                                        return (
                                            <Table.Tr key={detalle.id}>
                                                <Table.Td>
                                                    <Group gap="xs" wrap="nowrap">
                                                        <IconPackage size={18} className={classes.iconoNaranja} />
                                                        <div>
                                                            <Text fw={600}>{nombreArticulo(detalle)}</Text>
                                                            {esMembresia && <Text size="xs" c="red">Devoluciones de membresía no disponibles</Text>}
                                                        </div>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td ta="center">{detalle.cantidadDisponible ?? '—'}</Table.Td>
                                                <Table.Td>
                                                    <NumberInput
                                                        aria-label={`Cantidad a devolver de ${nombreArticulo(detalle)}`}
                                                        min={0}
                                                        max={detalle.cantidadDisponible ?? 0}
                                                        allowDecimal={false}
                                                        value={cantidad}
                                                        disabled={esMembresia || noDisponible}
                                                        onChange={(value) => actualizarSeleccion(detalle.id, {
                                                            cantidad: Math.min(
                                                                detalle.cantidadDisponible ?? 0,
                                                                Math.max(0, Math.floor(Number(value) || 0))
                                                            ),
                                                        })}
                                                        w={86}
                                                    />
                                                </Table.Td>
                                                <Table.Td ta="right">{moneda(detalle.precioUnitario)}</Table.Td>
                                                <Table.Td ta="right">
                                                    {cotizacionLinea
                                                        ? moneda(Number(cotizacionLinea.descuentoUnitario ?? 0) * Number(cotizacionLinea.cantidad))
                                                        : '—'}
                                                </Table.Td>
                                                <Table.Td ta="right">{cotizacionLinea ? moneda(cotizacionLinea.subtotal) : '—'}</Table.Td>
                                                <Table.Td ta="right">{cotizacionLinea ? moneda(cotizacionLinea.iva) : '—'}</Table.Td>
                                                <Table.Td ta="right">{cotizacionLinea ? moneda(cotizacionLinea.ajusteRedondeo) : '—'}</Table.Td>
                                                <Table.Td ta="right" fw={650}>{cotizacionLinea ? moneda(cotizacionLinea.monto) : '—'}</Table.Td>
                                                <Table.Td>
                                                    {detalle.tipoItem === 'PRODUCTO' ? (
                                                        <Checkbox
                                                            label="Reingresar"
                                                            size="xs"
                                                            checked={Boolean(seleccion[detalle.id]?.regresaAStock)}
                                                            disabled={cantidad === 0 || esMembresia}
                                                            onChange={(event) => actualizarSeleccion(detalle.id, {
                                                                regresaAStock: event.currentTarget.checked,
                                                            })}
                                                        />
                                                    ) : <Text size="xs" c="dimmed">No aplica</Text>}
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </div>

                        <Textarea
                            label="Motivo de devolución"
                            placeholder="Describe el motivo"
                            required
                            maxLength={500}
                            minRows={2}
                            value={motivo}
                            onChange={(event) => setMotivo(event.currentTarget.value)}
                        />

                        <Paper className={classes.resumen} p="sm" style={{ width: '100%' }}>
                            <Stack gap={4}>
                                <Group justify="space-between">
                                    <Text>Descuento</Text>
                                    <Text fw={600}>{descuentoTotal == null ? '—' : `-${moneda(descuentoTotal)}`}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text>Subtotal</Text>
                                    <Text fw={600}>{desglose ? moneda(desglose.subtotal) : '—'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text>IVA (16%)</Text>
                                    <Text fw={600}>{desglose ? moneda(desglose.iva) : '—'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text>Ajuste de redondeo</Text>
                                    <Text fw={600}>{desglose ? moneda(desglose.ajusteRedondeo) : '—'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text fw={750}>Reembolso</Text>
                                    <Text fw={800} c="orange.8">{desglose ? moneda(desglose.montoTotal) : '—'}</Text>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    El desglose y el importe son calculados por el servidor antes de confirmar.
                                </Text>
                            </Stack>
                        </Paper>
                    </div>

                    <div className={classes.footer}>
                        <Group justify="flex-end">
                            {errorPrevisualizacion && (
                                <Button
                                    variant="light"
                                    disabled={cargandoPrevisualizacion}
                                    onClick={() => setIntentoPrevisualizacion((actual) => actual + 1)}
                                >
                                    Reintentar cálculo
                                </Button>
                            )}
                            <Button variant="default" disabled={cargandoDevolucion} onClick={onClose}>Cancelar</Button>
                            <Button
                                color="orange"
                                loading={cargandoDevolucion}
                                disabled={
                                    !aperturaCajaId
                                    || !motivo.trim()
                                    || !lineasSeleccionadas.length
                                    || cantidadesNoDisponibles
                                    || errorPrevisualizacion
                                    || !cotizacionVigente
                                    || cargandoPrevisualizacion
                                    || (esTerminal && (!folioCancelacion.trim() || !confirmacionTerminal))
                                }
                                onClick={confirmar}
                            >
                                {esMercadoPago && cargandoDevolucion ? 'Reembolsando…' : 'Confirmar devolución'}
                            </Button>
                        </Group>
                    </div>
                </Stack>
            ) : null}
        </Modal>
    );
}
