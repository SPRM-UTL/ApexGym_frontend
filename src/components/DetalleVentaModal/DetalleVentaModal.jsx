import { Button, Divider, Group, Modal, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import {
    IconBriefcase2,
    IconCashBanknote,
    IconCheck,
    IconCreditCard,
    IconPackage,
    IconReceipt,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { obtenerNombreCliente, obtenerNombreEmpleado } from '../../utils/ventaHelper/ventaHelpers.js';
import classes from './DetalleVentaModal.module.css';

const moneda = (valor) => `$${Number(valor ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

function Dato({ icon: Icono, label, children }) {
    return (
        <div className={classes.dato}>
            <span className={classes.datoIcono}><Icono size={21} stroke={2} /></span>
            <div className={classes.datoContenido}>
                <Text size="sm" c="dimmed">{label}</Text>
                <Text fw={650} lineClamp={2}>{children || '—'}</Text>
            </div>
        </div>
    );
}

export function DetalleVentaModal({ venta, cargando, onClose }) {
    const subtotal = Number(venta?.subtotal ?? 0);
    const total = Number(venta?.total ?? 0);
    const iva = Number(venta?.iva ?? venta?.impuestoIVA ?? total - subtotal);
    const estado = venta?.estado ?? 'Completada';

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
                        </SimpleGrid>

                        <Divider color="#e2e8f0" />

                        <div className={classes.tabla}>
                            <Table horizontalSpacing="md" verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Producto</Table.Th>
                                        <Table.Th ta="center">Cantidad</Table.Th>
                                        <Table.Th ta="right">Precio</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {venta.detalleVenta?.map((item, index) => {
                                        const nombre = item.articuloNombre
                                            ?? item.producto?.nombre
                                            ?? item.servicio?.nombre
                                            ?? item.tipoMembresia?.nombre
                                            ?? item.descripcion
                                            ?? 'Artículo';
                                        const precio = item.subtotal ?? item.cantidad * item.precioUnitario;
                                        return (
                                            <Table.Tr key={item.id ?? `${item.tipoItem}-${index}`}>
                                                <Table.Td>
                                                    <Group gap="sm" wrap="nowrap">
                                                        <IconPackage size={19} className={classes.iconoNaranja} />
                                                        <Text fw={550}>{nombre}</Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td ta="center">{item.cantidad}</Table.Td>
                                                <Table.Td ta="right" fw={600}>{moneda(precio)}</Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </div>

                        <div className={classes.resumen}>
                            <Group justify="space-between" className={classes.resumenFila}>
                                <Text>Subtotal</Text><Text fw={600}>{moneda(subtotal)}</Text>
                            </Group>
                            <Group justify="space-between" className={`${classes.resumenFila} ${classes.iva}`}>
                                <Text>IVA (16%)</Text><Text fw={700}>{moneda(iva)}</Text>
                            </Group>
                            <Group justify="space-between" className={classes.total}>
                                <Text fw={750} size="lg">Total</Text><Text fw={800} size="xl">{moneda(total)}</Text>
                            </Group>
                        </div>
                        {String(venta.estado).toLowerCase() === 'cancelada' && venta.motivoCancelacion && (
                            <Text c="red">Motivo de cancelación: {venta.motivoCancelacion}</Text>
                        )}
                    </div>
                    <div className={classes.footer}>
                        <Group justify="flex-end">
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
