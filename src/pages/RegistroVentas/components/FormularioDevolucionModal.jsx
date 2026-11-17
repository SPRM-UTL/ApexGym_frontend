import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
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
    Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconArrowBackUp, IconCashBanknote, IconPackage } from '@tabler/icons-react';
import { api } from '../../../scripts/services/api.js';
import { obtenerRegistros } from '../../../utils/ventaHelper/ventaHelpers.js';
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
    const [errorAperturas, setErrorAperturas] = useState('');
    const [motivo, setMotivo] = useState('');
    const [seleccion, setSeleccion] = useState({});
    const [previsualizacion, setPrevisualizacion] = useState(null);
    const [cargandoPrevisualizacion, setCargandoPrevisualizacion] = useState(false);
    const [errorPrevisualizacion, setErrorPrevisualizacion] = useState('');
    const [intentoPrevisualizacion, setIntentoPrevisualizacion] = useState(0);

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

    useEffect(() => {
        let activo = true;
        if (!ventaId) {
            setAperturas([]);
            setDisponibilidad(null);
            setAperturaCajaId('');
            setMotivo('');
            setSeleccion({});
            setErrorAperturas('');
            setPrevisualizacion(null);
            setCargandoPrevisualizacion(false);
            setErrorPrevisualizacion('');
            return undefined;
        }

        setCargandoAperturas(true);
        setErrorAperturas('');
        setDisponibilidad(null);
        setPrevisualizacion(null);
        setCargandoPrevisualizacion(false);
        setErrorPrevisualizacion('');
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
        }).catch((error) => {
            if (activo) setErrorAperturas(error.message || 'No se pudieron cargar los datos de devolución.');
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
            setErrorPrevisualizacion('');
            return undefined;
        }

        const solicitudActual = JSON.stringify(detallesSolicitados);
        setCargandoPrevisualizacion(true);
        setErrorPrevisualizacion('');
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
                    setErrorPrevisualizacion(error.message || 'No se pudo calcular la devolución.');
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
        setErrorPrevisualizacion('');
        setErrorAperturas('');
    };

    const confirmar = async () => {
        if (!aperturaCajaId) return;
        if (!motivo.trim()) return;
        if (cantidadesNoDisponibles || lineasSeleccionadas.length === 0) return;
        if (!cotizacionVigente || cargandoPrevisualizacion) return;

        setCargandoDevolucion(true);
        try {
            const respuesta = await api.venta.crearDevolucion(venta.id, {
                aperturaCajaId: Number(aperturaCajaId),
                motivo: motivo.trim(),
                detalles: detallesSolicitados,
                montoPrevisualizado: cotizacionVigente.desglose.montoTotal,
                cantidadesDevueltasPrevisualizadas: cotizacionVigente.cantidadesDevueltasPrevisualizadas,
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
                    setErrorAperturas(
                        'La disponibilidad cambió. Se actualizaron las cantidades; vuelve a seleccionar las líneas para confirmar.'
                    );
                } catch (errorDisponibilidad) {
                    setErrorAperturas(
                        errorDisponibilidad.message
                        || 'La cotización cambió y no se pudo actualizar la disponibilidad.'
                    );
                }
            } else {
                setErrorAperturas(error.message || 'No se pudo registrar la devolución.');
            }
        } finally {
            setCargandoDevolucion(false);
        }
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
                        {errorAperturas && <Alert color="red" title="No se pudo completar la operación">{errorAperturas}</Alert>}
                        {errorPrevisualizacion && (
                            <Alert color="red" title="No se pudo calcular la devolución">
                                <Group justify="space-between" align="center">
                                    <Text size="sm">{errorPrevisualizacion}</Text>
                                    <Button
                                        size="xs"
                                        variant="light"
                                        color="red"
                                        onClick={() => setIntentoPrevisualizacion((actual) => actual + 1)}
                                    >
                                        Reintentar
                                    </Button>
                                </Group>
                            </Alert>
                        )}
                        {aperturas.length === 0 && !errorAperturas && (
                            <Alert color="red" icon={<IconAlertCircle size={18} />} title="No hay caja abierta">
                                Abre una caja antes de registrar la devolución.
                            </Alert>
                        )}
                        {cantidadesNoDisponibles && (
                            <Alert color="yellow" title="Faltan datos de devolución">
                                No se recibieron cantidades disponibles válidas. No se puede confirmar la devolución.
                            </Alert>
                        )}
                        {cargandoPrevisualizacion && (
                            <Alert color="blue" title="Calculando devolución">
                                El servidor está calculando el desglose y el importe del reembolso.
                            </Alert>
                        )}

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {aperturas.length > 0 && (
                                <Select
                                    label="Caja abierta para registrar el reembolso"
                                    placeholder={aperturas.length > 1 ? 'Selecciona una apertura' : undefined}
                                    data={aperturasData}
                                    value={aperturaCajaId}
                                    onChange={(value) => {
                                        setAperturaCajaId(value);
                                        setErrorAperturas('');
                                    }}
                                    disabled={aperturas.length === 1}
                                    searchable
                                    comboboxProps={{ zIndex: 1000002 }}
                                />
                            )}
                            <Paper p="sm" radius="md" withBorder>
                                <Group gap="xs">
                                    <IconCashBanknote size={19} />
                                    <Text size="sm" c="dimmed">Método de pago original</Text>
                                    <Badge color="blue" variant="light">
                                        {disponibilidad?.metodoPago?.nombre ?? venta.metodoPago?.nombre ?? 'No identificado'}
                                    </Badge>
                                </Group>
                                <Text size="xs" c="dimmed" mt={4}>
                                    El reembolso usa el método original. Si es tarjeta, procesa también el reembolso en la terminal o proveedor de pago.
                                </Text>
                            </Paper>
                        </SimpleGrid>

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
                            <Button variant="default" disabled={cargandoDevolucion} onClick={onClose}>Cancelar</Button>
                            <Button
                                color="orange"
                                loading={cargandoDevolucion}
                                disabled={
                                    !aperturaCajaId
                                    || !motivo.trim()
                                    || !lineasSeleccionadas.length
                                    || cantidadesNoDisponibles
                                    || Boolean(errorAperturas)
                                    || Boolean(errorPrevisualizacion)
                                    || !cotizacionVigente
                                    || cargandoPrevisualizacion
                                }
                                onClick={confirmar}
                            >
                                Confirmar devolución
                            </Button>
                        </Group>
                    </div>
                </Stack>
            ) : null}
        </Modal>
    );
}
