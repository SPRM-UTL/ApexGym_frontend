import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Divider,
    Drawer,
    Group,
    Modal,
    Paper,
    SegmentedControl,
    Stack,
    Table,
    Text,
    Textarea,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconCalendar,
    IconCash,
    IconCheck,
    IconClipboardList,
    IconEye,
    IconPackage,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { formatearFechaHora } from '../../scripts/cajaUtils.js';
import { useSucursal } from '../../context/SucursalContext.jsx';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';
import { EncabezadoTabla, TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';

const COLOR_ESTADO = {
    PENDIENTE: 'yellow',
    APROBADO: 'green',
    RECHAZADO: 'red',
};

const ETIQUETA_ESTADO = {
    PENDIENTE: 'Pendiente',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
};

const COLUMNAS_PEDIDOS = [
    { key: 'folioTexto', label: 'Folio', sortable: true, filterable: true },
    { key: 'fechaTexto', label: 'Fecha', sortable: true, filterable: true },
    { key: 'solicitanteNombre', label: 'Solicitante', sortable: true, filterable: true },
    { key: 'proveedorTexto', label: 'Proveedor', sortable: true, filterable: true },
    { key: 'articulosTexto', label: 'Artículos', sortable: false, filterable: true },
    { key: 'totalEstimadoTexto', label: 'Total Estimado', sortable: true, filterable: false },
    { key: 'estadoBadge', label: 'Estado', sortable: true, filterable: false },
];

function nombreEmpleado(emp) {
    if (!emp) return '—';
    return [emp.nombre, emp.apellidoPaterno, emp.apellidoMaterno]
        .filter(Boolean)
        .join(' ');
}

function moneda(valor) {
    return `$${Number(valor ?? 0).toFixed(2)}`;
}

export function PedidosCompra() {
    cambioNombreWeb('Pedidos de Compra');
    const { sucursalActiva } = useSucursal();
    const sucursalId = sucursalActiva?.id ?? 1;

    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [pedidoDetalle, setPedidoDetalle] = useState(null);
    const [procesandoId, setProcesandoId] = useState(null);
    const [pedidoARechazar, setPedidoARechazar] = useState(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const cargarPedidos = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const res = await api.pedidoCompra.obtenerTodos();
            const lista = Array.isArray(res?.data) ? res.data : [];
            setPedidos(lista);
        } catch (err) {
            setError(err?.message || 'No se pudieron cargar los pedidos de compra');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarPedidos();
    }, [cargarPedidos, sucursalId]);

    const conteos = useMemo(() => ({
        total: pedidos.length,
        pendientes: pedidos.filter((p) => p.estado === 'PENDIENTE').length,
        aprobados: pedidos.filter((p) => p.estado === 'APROBADO').length,
        rechazados: pedidos.filter((p) => p.estado === 'RECHAZADO').length,
    }), [pedidos]);

    const filtrados = useMemo(() => {
        if (filtroEstado === 'TODOS') return pedidos;
        return pedidos.filter((p) => p.estado === filtroEstado);
    }, [pedidos, filtroEstado]);

    const filasTabla = useMemo(() => filtrados.map((pedido) => {
        const detalles = pedido.detalles ?? [];
        const piezas = detalles.reduce((acc, d) => acc + Number(d.cantidad ?? 0), 0);
        const nombresProductos = detalles
            .map((d) => d.producto?.nombre)
            .filter(Boolean)
            .join(', ');

        return {
            id: pedido.id,
            folioTexto: `#${pedido.id}`,
            fechaTexto: formatearFechaHora(pedido.createdAt),
            solicitanteNombre: nombreEmpleado(pedido.solicitanteEmpleado),
            proveedorTexto: pedido.proveedor || 'Sin especificar',
            articulosTexto: `${detalles.length} prod. (${piezas} uds.)${nombresProductos ? ` — ${nombresProductos}` : ''}`,
            totalEstimadoTexto: `${moneda(pedido.totalEstimado)} MXN`,
            estadoBadge: (
                <Badge
                    size="sm"
                    variant="light"
                    color={COLOR_ESTADO[pedido.estado] ?? 'gray'}
                    radius="sm"
                    fw={700}
                >
                    {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                </Badge>
            ),
            _recordOriginal: pedido,
        };
    }), [filtrados]);

    const handleAprobar = useCallback(async (pedido) => {
        if (!pedido || procesandoId) return;
        setProcesandoId(pedido.id);
        try {
            const res = await api.pedidoCompra.aprobar(pedido.id);
            const actualizado = res?.data ?? null;
            notifications.show({
                title: 'Pedido aprobado',
                message: `El pedido #${pedido.id} fue aceptado y sus existencias se sumaron al inventario.`,
                color: 'green',
                icon: <IconCheck size={18} />,
            });
            if (actualizado && pedidoDetalle?.id === pedido.id) {
                setPedidoDetalle(actualizado);
            }
            await cargarPedidos();
        } catch (err) {
            notifications.show({
                title: 'No se pudo aprobar',
                message: err?.message || 'Error al aprobar el pedido de compra',
                color: 'red',
                icon: <IconX size={18} />,
            });
        } finally {
            setProcesandoId(null);
        }
    }, [procesandoId, pedidoDetalle, cargarPedidos]);

    const handleConfirmarRechazo = async () => {
        if (!pedidoARechazar || procesandoId) return;
        setProcesandoId(pedidoARechazar.id);
        try {
            const res = await api.pedidoCompra.rechazar(
                pedidoARechazar.id,
                motivoRechazo.trim() || null
            );
            const actualizado = res?.data ?? null;
            notifications.show({
                title: 'Pedido rechazado',
                message: `El pedido #${pedidoARechazar.id} fue marcado como rechazado sin modificar el inventario.`,
                color: 'orange',
            });
            if (actualizado && pedidoDetalle?.id === pedidoARechazar.id) {
                setPedidoDetalle(actualizado);
            }
            setPedidoARechazar(null);
            setMotivoRechazo('');
            await cargarPedidos();
        } catch (err) {
            notifications.show({
                title: 'No se pudo rechazar',
                message: err?.message || 'Error al rechazar el pedido de compra',
                color: 'red',
                icon: <IconX size={18} />,
            });
        } finally {
            setProcesandoId(null);
        }
    };

    const renderAccionesFila = useCallback((fila) => {
        const pedido = fila?._recordOriginal;
        if (!pedido) return null;
        const esPendiente = pedido.estado === 'PENDIENTE';
        const ocupando = procesandoId === pedido.id;

        return (
            <Group gap={6} wrap="nowrap">
                <Tooltip label="Ver detalle" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        size="md"
                        radius="md"
                        onClick={() => setPedidoDetalle(pedido)}
                    >
                        <IconEye size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
                {esPendiente && (
                    <>
                        <Tooltip label="Aceptar y sumar al inventario" withArrow openDelay={250}>
                            <ActionIcon
                                variant="light"
                                color="green"
                                size="md"
                                radius="md"
                                loading={ocupando}
                                disabled={Boolean(procesandoId)}
                                onClick={() => handleAprobar(pedido)}
                            >
                                <IconCheck size={17} stroke={2} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Rechazar pedido" withArrow openDelay={250}>
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="md"
                                radius="md"
                                disabled={Boolean(procesandoId)}
                                onClick={() => {
                                    setPedidoARechazar(pedido);
                                    setMotivoRechazo('');
                                }}
                            >
                                <IconX size={17} stroke={2} />
                            </ActionIcon>
                        </Tooltip>
                    </>
                )}
            </Group>
        );
    }, [procesandoId, handleAprobar]);

    return (
        <Stack gap="md">
            <EncabezadoTabla
                title="Pedidos de Compra"
                icon={IconClipboardList}
                rightContent={
                    conteos.pendientes > 0 ? (
                        <Badge size="lg" variant="light" color="orange" radius="md" fw={700}>
                            {conteos.pendientes} pendiente{conteos.pendientes === 1 ? '' : 's'}
                        </Badge>
                    ) : null
                }
            />

            {error && (
                <Alert
                    color="red"
                    variant="light"
                    icon={<IconAlertCircle size={18} />}
                    title="Error al cargar pedidos"
                >
                    {error}
                </Alert>
            )}

            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                <SegmentedControl
                    value={filtroEstado}
                    onChange={setFiltroEstado}
                    color="orange"
                    radius="md"
                    data={[
                        { label: `Todos (${conteos.total})`, value: 'TODOS' },
                        { label: `Pendientes (${conteos.pendientes})`, value: 'PENDIENTE' },
                        { label: `Aprobados (${conteos.aprobados})`, value: 'APROBADO' },
                        { label: `Rechazados (${conteos.rechazados})`, value: 'RECHAZADO' },
                    ]}
                />
                <Text size="sm" c="dimmed">
                    Al aceptar un pedido, las existencias se suman automáticamente al inventario de la sucursal.
                </Text>
            </Group>

            <TablaRegistros
                data={filasTabla}
                columns={COLUMNAS_PEDIDOS}
                renderAcciones={renderAccionesFila}
                entityLabel="pedido de compra"
                loading={cargando}
                onReload={cargarPedidos}
                headerVariant="neutral"
                tableMinWidth={1020}
            />

            {/* Drawer lateral con el detalle e impacto en inventario */}
            <Drawer
                opened={Boolean(pedidoDetalle)}
                onClose={() => setPedidoDetalle(null)}
                position="right"
                size={680}
                overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
                zIndex={999999}
                title={
                    pedidoDetalle ? (
                        <Group gap="sm">
                            <IconPackage size={32} stroke={1.8} color="var(--ag-color-secondary)" />
                            <Divider orientation="vertical" color="secondary.9" size="2" />
                            <div>
                                <Title order={4} fw={700} c="#1E293B">
                                    Pedido de Compra #{pedidoDetalle.id}
                                </Title>
                                <Text size="xs" c="dimmed">
                                    Impacto en existencias al aprobar el pedido
                                </Text>
                            </div>
                        </Group>
                    ) : null
                }
                styles={{
                    header: { borderBottom: '1px solid #E2E8F0', paddingBottom: 16, marginBottom: 0 },
                    body: { padding: '20px 24px' },
                }}
            >
                {pedidoDetalle && (
                    <Stack gap="md">
                        <Group gap="xs" wrap="wrap">
                            <Badge
                                variant="light"
                                color={COLOR_ESTADO[pedidoDetalle.estado] ?? 'gray'}
                                size="md"
                                radius="sm"
                            >
                                {ETIQUETA_ESTADO[pedidoDetalle.estado] ?? pedidoDetalle.estado}
                            </Badge>
                            <Badge variant="light" color="gray" leftSection={<IconCalendar size={13} />} size="md" radius="sm">
                                {formatearFechaHora(pedidoDetalle.createdAt)}
                            </Badge>
                            <Badge variant="light" color="gray" leftSection={<IconUser size={13} />} size="md" radius="sm">
                                Solicitó: {nombreEmpleado(pedidoDetalle.solicitanteEmpleado)}
                            </Badge>
                            {pedidoDetalle.sucursal?.nombre && (
                                <Badge variant="light" color="gray" size="md" radius="sm">
                                    Sucursal: {pedidoDetalle.sucursal.nombre}
                                </Badge>
                            )}
                        </Group>

                        <Paper p="md" radius="md" withBorder style={{ borderColor: '#E2E8F0' }}>
                            <Stack gap={6}>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={600}>Proveedor</Text>
                                    <Text size="sm" fw={600}>{pedidoDetalle.proveedor || 'Sin especificar'}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={600}>Total estimado</Text>
                                    <Text size="sm" fw={800} c="#FF6A00">{moneda(pedidoDetalle.totalEstimado)} MXN</Text>
                                </Group>
                                {pedidoDetalle.observaciones && (
                                    <div>
                                        <Text size="xs" c="dimmed" fw={600}>Observaciones</Text>
                                        <Text size="sm">{pedidoDetalle.observaciones}</Text>
                                    </div>
                                )}
                                {pedidoDetalle.validadorEmpleado && (
                                    <Group justify="space-between">
                                        <Text size="xs" c="dimmed" fw={600}>Validado por</Text>
                                        <Text size="sm">
                                            {nombreEmpleado(pedidoDetalle.validadorEmpleado)} ({formatearFechaHora(pedidoDetalle.fechaValidacion)})
                                        </Text>
                                    </Group>
                                )}
                                {pedidoDetalle.motivoRechazo && (
                                    <Alert color="red" variant="light" mt={4} title="Motivo de rechazo">
                                        {pedidoDetalle.motivoRechazo}
                                    </Alert>
                                )}
                            </Stack>
                        </Paper>

                        <SectionCard
                            icon={<IconCash size={20} stroke={1.8} />}
                            iconBg="#EBFBEE"
                            iconColor="#2B8A3E"
                            title="Productos incluidos en el pedido"
                            subtitle="El stock resultante se aplicará al inventario tras aprobar"
                            rightAmount={`${moneda(pedidoDetalle.totalEstimado)} MXN`}
                            rightAmountColor="#2B8A3E"
                        >
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <Table withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                                    <Table.Thead style={{ backgroundColor: '#F8FAFC' }}>
                                        <Table.Tr>
                                            <Table.Th>Producto</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>Stock actual</Table.Th>
                                            <Table.Th style={{ textAlign: 'center' }}>Pedido</Table.Th>
                                            {pedidoDetalle.estado === 'PENDIENTE' && (
                                                <Table.Th style={{ textAlign: 'center' }}>Resultante</Table.Th>
                                            )}
                                            <Table.Th style={{ textAlign: 'right' }}>Costo unit.</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(pedidoDetalle.detalles ?? []).map((det) => {
                                            const stockActual = Number(det.producto?.stockActual ?? 0);
                                            const cantidad = Number(det.cantidad ?? 0);
                                            return (
                                                <Table.Tr key={det.id}>
                                                    <Table.Td fw={600}>
                                                        {det.producto?.nombre ?? `Producto #${det.productoId}`}
                                                    </Table.Td>
                                                    <Table.Td style={{ textAlign: 'center' }}>{stockActual}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#2B8A3E' }}>
                                                        +{cantidad}
                                                    </Table.Td>
                                                    {pedidoDetalle.estado === 'PENDIENTE' && (
                                                        <Table.Td style={{ textAlign: 'center', fontWeight: 800, color: '#2B8A3E' }}>
                                                            {stockActual + cantidad}
                                                        </Table.Td>
                                                    )}
                                                    <Table.Td style={{ textAlign: 'right' }}>{moneda(det.costoUnitario)}</Table.Td>
                                                    <Table.Td style={{ textAlign: 'right', fontWeight: 700 }}>{moneda(det.subtotal)}</Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </div>
                        </SectionCard>

                        {pedidoDetalle.estado === 'PENDIENTE' && (
                            <Group justify="flex-end" mt="sm">
                                <Button
                                    variant="light"
                                    color="red"
                                    radius="md"
                                    leftSection={<IconX size={16} />}
                                    disabled={Boolean(procesandoId)}
                                    onClick={() => {
                                        setPedidoARechazar(pedidoDetalle);
                                        setMotivoRechazo('');
                                    }}
                                >
                                    Rechazar pedido
                                </Button>
                                <Button
                                    color="green"
                                    radius="md"
                                    leftSection={<IconCheck size={16} />}
                                    loading={procesandoId === pedidoDetalle.id}
                                    disabled={Boolean(procesandoId)}
                                    onClick={() => handleAprobar(pedidoDetalle)}
                                >
                                    Aceptar y sumar al inventario
                                </Button>
                            </Group>
                        )}
                    </Stack>
                )}
            </Drawer>

            {/* Modal para capturar motivo de rechazo */}
            <Modal
                opened={Boolean(pedidoARechazar)}
                onClose={() => !procesandoId && setPedidoARechazar(null)}
                title={`Rechazar Pedido #${pedidoARechazar?.id ?? ''}`}
                centered
                zIndex={1000000}
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Al rechazar este pedido no se modificará el inventario de la sucursal.
                    </Text>
                    <Textarea
                        label="Motivo del rechazo (opcional)"
                        placeholder="Ej. Cantidad excedida o proveedor no disponible"
                        maxLength={500}
                        minRows={3}
                        value={motivoRechazo}
                        onChange={(e) => setMotivoRechazo(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button
                            variant="default"
                            radius="md"
                            onClick={() => setPedidoARechazar(null)}
                            disabled={Boolean(procesandoId)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="red"
                            radius="md"
                            loading={Boolean(procesandoId)}
                            onClick={handleConfirmarRechazo}
                        >
                            Confirmar rechazo
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

export default PedidosCompra;
