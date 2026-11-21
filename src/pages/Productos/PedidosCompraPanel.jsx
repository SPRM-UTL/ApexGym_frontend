import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Center,
    Drawer,
    Group,
    Loader,
    Modal,
    Paper,
    SegmentedControl,
    Stack,
    Table,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconCalendar,
    IconCash,
    IconCheck,
    IconEye,
    IconPackage,
    IconRefresh,
    IconSearch,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { formatearFechaHora } from '../../scripts/cajaUtils.js';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';

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

function nombreEmpleado(emp) {
    if (!emp) return '—';
    return [emp.nombre, emp.apellidoPaterno, emp.apellidoMaterno]
        .filter(Boolean)
        .join(' ');
}

function moneda(valor) {
    return `$${Number(valor ?? 0).toFixed(2)}`;
}

export function PedidosCompraPanel({ onInventarioActualizado, onConteoPendientesChange }) {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');
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
            const pendientes = lista.filter((p) => p.estado === 'PENDIENTE').length;
            onConteoPendientesChange?.(pendientes);
        } catch (err) {
            setError(err?.message || 'No se pudieron cargar los pedidos de compra');
        } finally {
            setCargando(false);
        }
    }, [onConteoPendientesChange]);

    useEffect(() => {
        cargarPedidos();
    }, [cargarPedidos]);

    const filtrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();
        return pedidos.filter((p) => {
            if (filtroEstado !== 'TODOS' && p.estado !== filtroEstado) return false;
            if (!termino) return true;
            const solicitante = nombreEmpleado(p.solicitanteEmpleado).toLowerCase();
            const proveedor = String(p.proveedor ?? '').toLowerCase();
            const productos = (p.detalles ?? [])
                .map((d) => String(d.producto?.nombre ?? '').toLowerCase())
                .join(' ');
            return String(p.id).includes(termino)
                || solicitante.includes(termino)
                || proveedor.includes(termino)
                || productos.includes(termino);
        });
    }, [pedidos, filtroEstado, busqueda]);

    const conteos = useMemo(() => ({
        total: pedidos.length,
        pendientes: pedidos.filter((p) => p.estado === 'PENDIENTE').length,
        aprobados: pedidos.filter((p) => p.estado === 'APROBADO').length,
        rechazados: pedidos.filter((p) => p.estado === 'RECHAZADO').length,
    }), [pedidos]);

    const handleAprobar = async (pedido) => {
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
            onInventarioActualizado?.();
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
    };

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

    return (
        <Stack gap="md">
            <SectionCard
                icon={<IconPackage size={22} stroke={1.8} />}
                iconBg="#FFF4EC"
                iconColor="#FF6A00"
                title="Validación de Pedidos de Compra"
                subtitle="Revisa las solicitudes enviadas desde la app Android. Al aceptar un pedido, las cantidades se suman automáticamente al stock de la sucursal."
                rightExtra={
                    <Button
                        variant="light"
                        color="orange"
                        size="sm"
                        radius="md"
                        leftSection={<IconRefresh size={16} />}
                        onClick={cargarPedidos}
                        loading={cargando}
                    >
                        Actualizar
                    </Button>
                }
            >
                <Stack gap="md">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                        <SegmentedControl
                            value={filtroEstado}
                            onChange={setFiltroEstado}
                            color="orange"
                            data={[
                                { label: `Todos (${conteos.total})`, value: 'TODOS' },
                                { label: `Pendientes (${conteos.pendientes})`, value: 'PENDIENTE' },
                                { label: `Aprobados (${conteos.aprobados})`, value: 'APROBADO' },
                                { label: `Rechazados (${conteos.rechazados})`, value: 'RECHAZADO' },
                            ]}
                        />
                        <TextInput
                            placeholder="Buscar por folio, proveedor, solicitante o producto..."
                            leftSection={<IconSearch size={16} stroke={1.6} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.currentTarget.value)}
                            style={{ minWidth: 280, flex: 1, maxWidth: 380 }}
                            radius="md"
                        />
                    </Group>

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

                    {cargando ? (
                        <Center py="xl">
                            <Loader color="orange" />
                        </Center>
                    ) : filtrados.length === 0 ? (
                        <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center', borderColor: '#E2E8F0' }}>
                            <Text fw={600} c="#1E293B">
                                No hay pedidos de compra para mostrar
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                Los pedidos levantados desde Android aparecerán aquí pendientes de validación.
                            </Text>
                        </Paper>
                    ) : (
                        <BoxScrollableTable>
                            <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: 920 }}>
                                <Table.Thead style={{ backgroundColor: '#F8FAFC' }}>
                                    <Table.Tr>
                                        <Table.Th>Folio</Table.Th>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Solicitante</Table.Th>
                                        <Table.Th>Proveedor</Table.Th>
                                        <Table.Th>Artículos</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Total Estimado</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th style={{ width: 150, textAlign: 'center' }}>Acciones</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filtrados.map((pedido) => {
                                        const detalles = pedido.detalles ?? [];
                                        const piezas = detalles.reduce((acc, d) => acc + Number(d.cantidad ?? 0), 0);
                                        const esPendiente = pedido.estado === 'PENDIENTE';
                                        const ocupando = procesandoId === pedido.id;

                                        return (
                                            <Table.Tr key={pedido.id}>
                                                <Table.Td fw={700}>#{pedido.id}</Table.Td>
                                                <Table.Td>{formatearFechaHora(pedido.createdAt)}</Table.Td>
                                                <Table.Td>{nombreEmpleado(pedido.solicitanteEmpleado)}</Table.Td>
                                                <Table.Td>{pedido.proveedor || 'Sin especificar'}</Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" fw={600}>
                                                        {detalles.length} prod. ({piezas} uds.)
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                    {moneda(pedido.totalEstimado)} MXN
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        size="sm"
                                                        variant="light"
                                                        color={COLOR_ESTADO[pedido.estado] ?? 'gray'}
                                                        radius="sm"
                                                        fw={700}
                                                    >
                                                        {ETIQUETA_ESTADO[pedido.estado] ?? pedido.estado}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={6} justify="center" wrap="nowrap">
                                                        <Tooltip label="Ver detalle" withArrow>
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
                                                                <Tooltip label="Aceptar y sumar al inventario" withArrow>
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
                                                                <Tooltip label="Rechazar pedido" withArrow>
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
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </BoxScrollableTable>
                    )}
                </Stack>
            </SectionCard>

            {/* Drawer lateral con el detalle e impacto en inventario */}
            <Drawer
                opened={Boolean(pedidoDetalle)}
                onClose={() => setPedidoDetalle(null)}
                position="right"
                size={680}
                zIndex={999999}
                title={
                    pedidoDetalle ? (
                        <Group gap="sm">
                            <ThemeIcon
                                size={38}
                                radius="md"
                                variant="light"
                                color="orange"
                                style={{ backgroundColor: '#FFF4EC', color: '#FF6A00' }}
                            >
                                <IconPackage size={22} stroke={1.8} />
                            </ThemeIcon>
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
                    header: { borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 0 },
                    body: { padding: '16px 20px' },
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
                        </SectionCard>

                        {pedidoDetalle.estado === 'PENDIENTE' && (
                            <Group justify="flex-end" mt="sm">
                                <Button
                                    variant="light"
                                    color="red"
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
                            onClick={() => setPedidoARechazar(null)}
                            disabled={Boolean(procesandoId)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="red"
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

function BoxScrollableTable({ children }) {
    return (
        <div style={{ overflowX: 'auto', width: '100%' }}>
            {children}
        </div>
    );
}
