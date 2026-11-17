import { createElement } from 'react';
import { Badge, Button, Divider, Group, Modal, Paper, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import {
    IconAlertTriangle,
    IconBriefcase2,
    IconCashBanknote,
    IconCheck,
    IconCreditCard,
    IconPackage,
    IconReceipt,
    IconRefresh,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { obtenerNombreCliente, obtenerNombreEmpleado } from '../../../utils/ventaHelper/ventaHelpers.js';
import classes from './DetalleVentaModal.module.css';

const moneda = (valor) => `$${Number(valor ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

function formatearFecha(valor) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
        ? 'Fecha no disponible'
        : fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function nombreEmpleadoDevolucion(devolucion) {
    const nombre = devolucion.empleadoNombre
        ?? [
            devolucion.empleado?.nombre,
            devolucion.empleado?.apellidoPaterno,
            devolucion.empleado?.apellidoMaterno,
        ].filter(Boolean).join(' ');
    return nombre || 'No identificado';
}

function Dato({ icon: Icono, label, children }) {
    return (
        <div className={classes.dato}>
            <span className={classes.datoIcono}>{createElement(Icono, { size: 21, stroke: 2 })}</span>
            <div className={classes.datoContenido}>
                <Text size="sm" c="dimmed">{label}</Text>
                <Text component="div" fw={650} lineClamp={2}>{children ?? '—'}</Text>
            </div>
        </div>
    );
}

export function DetalleVentaModal({ venta, cargando, onClose, onReturn }) {
    const subtotal = Number(venta?.subtotal ?? 0);
    const total = Number(venta?.total ?? 0);
    const iva = Number(venta?.iva ?? venta?.impuestoIVA ?? total - subtotal);
    const montoRecibido = venta?.montoRecibido;
    const cambio = venta?.cambio;
    const estado = venta?.estado ?? 'Completada';
    const detalles = venta?.detalleVenta ?? [];
    const devoluciones = Array.isArray(venta?.devoluciones) ? venta.devoluciones : [];
    const cantidadVendida = detalles.reduce((acumulado, detalle) => (
        acumulado + Number(detalle.cantidad ?? 0)
    ), 0);
    const cantidadDevuelta = detalles.reduce((acumulado, detalle) => (
        acumulado + Number(detalle.cantidadDevuelta ?? 0)
    ), 0);
    const hayDevoluciones = cantidadDevuelta > 0 || devoluciones.length > 0;
    const estadoDevolucion = !hayDevoluciones
        ? null
        : cantidadVendida > 0 && cantidadDevuelta >= cantidadVendida
            ? 'Devuelta totalmente'
            : 'Devuelta parcialmente';
    const puedeRegistrarDevolucion = detalles.some((detalle) => {
        const tipoItem = String(detalle.tipoItem ?? '').toUpperCase();
        const esMembresia = tipoItem === 'MEMBRESIA'
            || detalle.tipoMembresiaId != null
            || Boolean(detalle.tipoMembresia);
        const cantidad = Number(detalle.cantidad ?? 0);
        const cantidadDisponible = detalle.cantidadDisponible == null
            ? cantidad - Number(detalle.cantidadDevuelta ?? 0)
            : Number(detalle.cantidadDisponible);
        return !esMembresia
            && Number.isFinite(cantidadDisponible)
            && cantidadDisponible > 0;
    });
    const totalDevuelto = Number(
        venta?.resumenDevoluciones?.totalDevuelto
        ?? devoluciones.reduce((acumulado, devolucion) => acumulado + Number(devolucion.monto ?? 0), 0)
    );
    const neto = Number(venta?.resumenDevoluciones?.neto ?? total - totalDevuelto);

    return (
        <Modal
            opened={Boolean(venta) || cargando}
            onClose={() => !cargando && onClose()}
            title={(
                <Group gap="md" wrap="nowrap" className={classes.tituloGrupo}>
                    <span className={classes.tituloIcono}><IconReceipt size={26} /></span>
                    <Text className={classes.titulo}>Detalle del ticket #{venta?.folioVentaId ?? venta?.id ?? ''}</Text>
                </Group>
            )}
            centered
            size="xl"
            padding={0}
            radius="lg"
            withCloseButton
            closeButtonProps={{ icon: <IconX size={20} />, 'aria-label': 'Cerrar detalle del ticket' }}
            closeOnClickOutside={!cargando}
            closeOnEscape={!cargando}
            overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
            zIndex={1000000}
            classNames={{
                content: classes.modal,
                header: classes.header,
                title: classes.modalTitle,
                close: classes.closeButton,
                body: classes.body,
            }}
        >
            {cargando ? (
                <div className={classes.content}><Text>Cargando detalle de la venta…</Text></div>
            ) : venta ? (
                <Stack gap={0}>
                    <div className={classes.content}>
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                            <Dato icon={IconUser} label="Cliente">{obtenerNombreCliente(venta.cliente)}</Dato>
                            <Dato icon={IconBriefcase2} label="Empleado">{obtenerNombreEmpleado(venta.empleado)}</Dato>
                            <Dato icon={IconCashBanknote} label="Caja">
                                {venta.aperturaCaja?.caja?.nombre ?? '—'} · Apertura #{venta.aperturaCajaId ?? venta.aperturaCaja?.id ?? '—'}
                            </Dato>
                            <Dato icon={IconCreditCard} label="Método de pago">{venta.metodoPago?.nombre}</Dato>
                            <Dato icon={IconCheck} label="Estado">{estado}</Dato>
                            {estadoDevolucion && (
                                <Dato icon={IconRefresh} label="Estado de devolución">
                                    <Badge color={estadoDevolucion === 'Devuelta totalmente' ? 'teal' : 'orange'}>
                                        {estadoDevolucion}
                                    </Badge>
                                </Dato>
                            )}
                        </SimpleGrid>

                        <Divider color="#e2e8f0" />

                        <div className={classes.tabla}>
                            <Table horizontalSpacing="md" verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Producto</Table.Th>
                                        <Table.Th ta="center">Cantidad</Table.Th>
                                        <Table.Th ta="center">Devuelto</Table.Th>
                                        <Table.Th ta="right">Precio unitario</Table.Th>
                                        <Table.Th ta="right">Descuento</Table.Th>
                                        <Table.Th ta="right">Importe</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {detalles.map((item, index) => {
                                        const nombre = item.articuloNombre
                                            ?? item.producto?.nombre
                                            ?? item.servicio?.nombre
                                            ?? item.tipoMembresia?.nombre
                                            ?? item.descripcion
                                            ?? 'Artículo';
                                        const precio = item.subtotal ?? item.cantidad * item.precioUnitario;
                                        const descuento = Number(item.descuentoUnitario ?? 0) * Number(item.cantidad ?? 0);
                                        return (
                                            <Table.Tr key={item.id ?? `${item.tipoItem}-${index}`}>
                                                <Table.Td>
                                                    <Group gap="sm" wrap="nowrap">
                                                        <IconPackage size={19} className={classes.iconoNaranja} />
                                                        <Text fw={550}>{nombre}</Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td ta="center">{item.cantidad}</Table.Td>
                                                <Table.Td ta="center">
                                                    {Number(item.cantidadDevuelta ?? 0)} de {item.cantidad}
                                                </Table.Td>
                                                <Table.Td ta="right">{moneda(item.precioUnitario)}</Table.Td>
                                                <Table.Td ta="right">{descuento > 0 ? `-${moneda(descuento)}` : moneda(0)}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{moneda(precio)}</Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </div>

                        {devoluciones.length > 0 && (
                            <Paper className={classes.devoluciones} radius="md" p="md" withBorder>
                                <Stack gap="sm">
                                    <Group justify="space-between" align="center">
                                        <Text fw={700} c="dark.8">Reembolsos registrados</Text>
                                        <Badge color="orange" variant="light">
                                            {devoluciones.length} {devoluciones.length === 1 ? 'devolución' : 'devoluciones'}
                                        </Badge>
                                    </Group>
                                    <Stack gap={0}>
                                        {devoluciones.map((devolucion) => (
                                            <Group
                                                key={devolucion.id}
                                                justify="space-between"
                                                align="center"
                                                className={classes.devolucionFila}
                                            >
                                                <div>
                                                    <Text fw={600}>{formatearFecha(devolucion.createdAt)}</Text>
                                                    <Text size="sm" c="dimmed">
                                                        Empleado: {nombreEmpleadoDevolucion(devolucion)}
                                                    </Text>
                                                </div>
                                                <Text fw={700}>{moneda(devolucion.monto)}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                    <Divider color="#e2e8f0" />
                                    <Group justify="space-between">
                                        <Text>Total devuelto</Text>
                                        <Text fw={700}>{moneda(totalDevuelto)}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text>Neto restante</Text>
                                        <Text fw={800} c="orange.8">{moneda(neto)}</Text>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}

                        <div className={classes.resumen}>
                            <Group justify="space-between" className={classes.resumenFila}>
                                <Text>Subtotal</Text><Text fw={600}>{moneda(subtotal)}</Text>
                            </Group>
                            <Group justify="space-between" className={`${classes.resumenFila} ${classes.iva}`}>
                                <Text>IVA (16%)</Text><Text fw={700}>{moneda(iva)}</Text>
                            </Group>
                            {montoRecibido != null && (
                                <Group justify="space-between" className={classes.resumenFila}>
                                    <Text>Monto recibido</Text><Text fw={600}>{moneda(montoRecibido)}</Text>
                                </Group>
                            )}
                            {cambio != null && (
                                <Group justify="space-between" className={classes.resumenFila}>
                                    <Text>Cambio</Text><Text fw={600}>{moneda(cambio)}</Text>
                                </Group>
                            )}
                            <Group justify="space-between" className={classes.total}>
                                <Text fw={750} size="lg">Total</Text><Text fw={800} size="xl">{moneda(total)}</Text>
                            </Group>
                        </div>
                        {String(venta.estado).toLowerCase() === 'cancelada' && venta.motivoCancelacion && (
                            <Paper className={classes.motivoCancelacion} radius="md" p="md" withBorder>
                                <Group align="flex-start" gap="sm" wrap="nowrap">
                                    <IconAlertTriangle size={21} className={classes.iconoCancelacion} />
                                    <div>
                                        <Text fw={700} c="red.8">Motivo de cancelación</Text>
                                        <Text className={classes.textoCancelacion}>
                                            {venta.motivoCancelacion}
                                        </Text>
                                    </div>
                                </Group>
                            </Paper>
                        )}
                    </div>
                    <div className={classes.footer}>
                        <Group justify="space-between">
                            {['completada', 'completado', 'completa'].includes(String(venta.estado ?? '').toLowerCase()) && (
                                <Button
                                    color="orange"
                                    leftSection={<IconRefresh size={17} />}
                                    onClick={onReturn}
                                    disabled={!puedeRegistrarDevolucion || typeof onReturn !== 'function'}
                                    title={!puedeRegistrarDevolucion ? 'No quedan cantidades disponibles para devolver' : undefined}
                                >
                                    Registrar devolución
                                </Button>
                            )}
                            {['completada', 'completado', 'completa'].includes(String(venta.estado ?? '').toLowerCase())
                                && !puedeRegistrarDevolucion && (
                                    <Text size="sm" c="dimmed">
                                        No quedan cantidades disponibles para devolver.
                                    </Text>
                                )}
                            <Button variant="default" onClick={onClose} size="md" radius="md" className={classes.closeAction}>
                                Cerrar
                            </Button>
                        </Group>
                    </div>
                </Stack>
            ) : null}
        </Modal>
    );
}
