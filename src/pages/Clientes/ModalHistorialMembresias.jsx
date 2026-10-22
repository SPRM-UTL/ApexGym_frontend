import { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    Title,
    Table,
    Badge,
    Text,
    Loader,
    ActionIcon,
    Tooltip,
    Paper,
    ThemeIcon,
    SimpleGrid,
    Divider,
    Box
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconHistory,
    IconSearch,
    IconRotateClockwise,
    IconCircleX,
    IconCertificate,
    IconCalendar,
    IconAlertTriangle,
    IconCheck,
    IconUser
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

export function ModalHistorialMembresias({ opened, onClose, cliente }) {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [procesando, setProcesando] = useState(false);

    const [confirmacion, setConfirmacion] = useState({
        opened: false,
        tipo: null,
        item: null
    });

    const cargarHistorial = async () => {
        if (!cliente?.id) return;
        try {
            setCargando(true);
            const res = await api.clienteMembresia.obtenerHistorialPorCliente(cliente.id);
            if (res.responseFlag === 0) {
                setHistorial(res.data ?? []);
            } else {
                setHistorial([]);
            }
        } catch (error) {
            console.error('Error al cargar historial:', error);
            setHistorial([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (opened && cliente?.id) {
            cargarHistorial();
        } else {
            setHistorial([]);
            setConfirmacion({ opened: false, tipo: null, item: null });
        }
    }, [opened, cliente?.id]);

    const abrirConfirmacion = (tipo, item) => {
        setConfirmacion({
            opened: true,
            tipo,
            item
        });
    };

    const cerrarConfirmacion = () => {
        if (procesando) return;
        setConfirmacion({
            opened: false,
            tipo: null,
            item: null
        });
    };

    const ejecutarAccionConfirmada = async () => {
        const { tipo, item } = confirmacion;
        if (!item?.id) return;

        try {
            setProcesando(true);
            if (tipo === 'renovar') {
                const res = await api.clienteMembresia.renovar(item.id);
                if (res.responseFlag === 0) {
                    notifications.show({
                        title: 'Membresía Renovada',
                        message: `Se ha renovado el plan ${item.tipoMembresia?.nombre ?? ''} para ${cliente.nombre}.`,
                        color: 'green',
                        icon: <IconCheck size={18} />
                    });
                    cerrarConfirmacion();
                    await cargarHistorial();
                } else {
                    throw new Error(res.message);
                }
            } else if (tipo === 'cancelar') {
                const res = await api.clienteMembresia.cancelar(item.id);
                if (res.responseFlag === 0) {
                    notifications.show({
                        title: 'Membresía Cancelada',
                        message: 'La membresía ha sido cancelada correctamente.',
                        color: 'orange',
                        icon: <IconCheck size={18} />
                    });
                    cerrarConfirmacion();
                    await cargarHistorial();
                } else {
                    throw new Error(res.message);
                }
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo completar la acción',
                color: 'red'
            });
        } finally {
            setProcesando(false);
        }
    };

    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return '—';
        return fechaStr.split('T')[0];
    };

    const badgeColor = (estado) => {
        if (!estado) return 'gray';
        const e = estado.toLowerCase();
        if (e.includes('vigente')) return 'green';
        if (e.includes('vencida')) return 'orange';
        if (e.includes('cancelada')) return 'red';
        return 'gray';
    };

    const membresiaActiva = historial.find((m) => m.estadoMembresia?.nombre === 'Vigente');

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={
                    <Group gap="sm">
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--ag-color-primary)',
                            }}
                        >
                            <IconHistory size={20} stroke={1.8} />
                        </div>
                        <Title order={4} fw={700} style={{ color: '#ffffff' }}>
                            Historial de Membresías
                        </Title>
                    </Group>
                }
                fullScreen
                radius={0}
                padding="xl"
                zIndex={999999}
                transitionProps={{ transition: 'slide-up', duration: 200 }}
            >
                <Stack maw={1440} mx="auto" gap="md" mt="sm">
                    <Group gap={8} align="center" px={4}>
                        <IconUser size={18} stroke={1.8} color="var(--ag-color-primary)" />
                        <Text size="sm" c="dimmed" fw={500}>
                            Cliente:
                        </Text>
                        <Text size="sm" fw={700} c="#1E293B">
                            {cliente?.nombreCompleto ?? `${cliente?.nombre ?? ''} ${cliente?.apellidoPaterno ?? ''}`.trim()}
                        </Text>
                    </Group>

                    <Paper
                        withBorder
                        radius="md"
                        style={{
                            overflow: 'hidden',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 4px 20px rgba(5, 6, 10, 0.04)'
                        }}
                    >
                        <div style={{ overflowX: 'auto' }}>
                            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                                <Table.Thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                    <Table.Tr>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            PLAN / MEMBRESÍA
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            FECHA DE INICIO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            FECHA DE FIN
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            PRECIO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            RENOVACIÓN
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            ESTADO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#475569', fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', textAlign: 'center' }}>
                                            ACCIONES
                                        </Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {cargando ? (
                                        <Table.Tr>
                                            <Table.Td colSpan={7}>
                                                <Group justify="center" py={48} gap="md">
                                                    <Loader size="md" color="apex" />
                                                    <Text size="sm" c="dimmed">Cargando historial de membresías…</Text>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ) : historial.length > 0 ? (
                                        historial.map((item) => (
                                            <Table.Tr key={item.id}>
                                                <Table.Td>
                                                    <div>
                                                        <Text fw={600} size="sm" c="dark.7">
                                                            {item.tipoMembresia?.nombre ?? '—'}
                                                        </Text>
                                                        {item.tipoMembresia?.duracionDias && (
                                                            <Text size="xs" c="dimmed">
                                                                Duración: {item.tipoMembresia.duracionDias} días
                                                            </Text>
                                                        )}
                                                    </div>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Text size="sm" fw={500}>
                                                        {formatearFecha(item.fechaInicio)}
                                                    </Text>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Text size="sm" fw={500}>
                                                        {formatearFecha(item.fechaFin)}
                                                    </Text>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Text fw={700} size="sm" c="dark.4">
                                                        ${Number(item.tipoMembresia?.precio ?? 0).toFixed(2)} MXN
                                                    </Text>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Badge
                                                        variant="light"
                                                        size="sm"
                                                        radius="sm"
                                                        fw={700}
                                                        color={item.renovacionAutomatica ? 'green' : 'gray'}
                                                    >
                                                        {item.renovacionAutomatica ? 'AUTOMÁTICA' : 'MANUAL'}
                                                    </Badge>
                                                </Table.Td>

                                                <Table.Td>
                                                    {(() => {
                                                        const estadoColor = item.estadoMembresia?.color;
                                                        const estadoNombre = item.estadoMembresia?.nombre?.toUpperCase() ?? 'DESCONOCIDO';
                                                        return (
                                                            <Badge
                                                                color={estadoColor || badgeColor(item.estadoMembresia?.nombre)}
                                                                size="sm"
                                                                radius="sm"
                                                                variant="light"
                                                                fw={700}
                                                                style={estadoColor ? {
                                                                    backgroundColor: `${estadoColor}18`,
                                                                    color: estadoColor,
                                                                    border: `1px solid ${estadoColor}40`,
                                                                } : undefined}
                                                            >
                                                                {estadoNombre}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </Table.Td>

                                                <Table.Td>
                                                    <Group gap={6} justify="center" wrap="nowrap">
                                                        {item.estadoMembresia?.nombre === 'Vigente' && (
                                                            <Tooltip
                                                                label="Cancelar membresía"
                                                                withArrow
                                                                openDelay={150}
                                                                zIndex={1000010}
                                                            >
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="red"
                                                                    size="md"
                                                                    radius="md"
                                                                    aria-label="Cancelar membresía"
                                                                    onClick={() => abrirConfirmacion('cancelar', item)}
                                                                >
                                                                    <IconCircleX size={18} stroke={1.8} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip
                                                            label="Renovar membresía"
                                                            withArrow
                                                            openDelay={150}
                                                            zIndex={1000010}
                                                        >
                                                            <ActionIcon
                                                                variant="light"
                                                                color="blue"
                                                                size="md"
                                                                radius="md"
                                                                aria-label="Renovar membresía"
                                                                onClick={() => abrirConfirmacion('renovar', item)}
                                                            >
                                                                <IconRotateClockwise size={18} stroke={1.8} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={7}>
                                                <Stack align="center" gap="xs" py={48} c="dimmed">
                                                    <ThemeIcon size={54} radius="xl" variant="light" color="gray">
                                                        <IconSearch size={28} stroke={1.5} />
                                                    </ThemeIcon>
                                                    <Text size="md" fw={600} c="dark.3">
                                                        No hay historial de membresías
                                                    </Text>
                                                    <Text size="sm">
                                                        Este cliente aún no tiene ninguna membresía asignada.
                                                    </Text>
                                                </Stack>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </div>
                    </Paper>

                    <Group justify="flex-end" mt="xs">
                        <Button variant="default" size="md" onClick={onClose}>
                            Cerrar Historial
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={confirmacion.opened}
                onClose={cerrarConfirmacion}
                title={
                    <Group gap="sm">
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--ag-color-primary)',
                            }}
                        >
                            {confirmacion.tipo === 'cancelar' ? (
                                <IconCircleX size={19} stroke={1.8} />
                            ) : (
                                <IconRotateClockwise size={19} stroke={1.8} />
                            )}
                        </div>
                        <Title order={5} fw={700} style={{ color: '#ffffff' }}>
                            {confirmacion.tipo === 'cancelar'
                                ? 'Confirmar Cancelación de Membresía'
                                : 'Confirmar Renovación de Membresía'}
                        </Title>
                    </Group>
                }
                overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
                centered
                size={500}
                padding="lg"
                radius="md"
                zIndex={1000005}
                closeOnClickOutside={!procesando}
                closeOnEscape={!procesando}
            >
                <Stack gap="md" mt="xs">
                    {confirmacion.item && (
                        <Paper
                            withBorder
                            p="md"
                            radius="md"
                            style={{
                                backgroundColor: '#F8FAFC',
                                borderColor: '#E2E8F0',
                            }}
                        >
                            <Group justify="space-between" align="center">
                                <div>
                                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.04em">
                                        Plan seleccionado
                                    </Text>
                                    <Text size="md" fw={700} c="#1E293B">
                                        {confirmacion.item?.tipoMembresia?.nombre ?? '—'}
                                    </Text>
                                    {confirmacion.item?.tipoMembresia?.duracionDias && (
                                        <Text size="xs" c="dimmed" fw={500} mt={2}>
                                            Duración: {confirmacion.item.tipoMembresia.duracionDias} días
                                        </Text>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.04em">
                                        Monto del plan
                                    </Text>
                                    <Text size="md" fw={700} c="green.7">
                                        ${Number(confirmacion.item?.tipoMembresia?.precio ?? 0).toFixed(2)} MXN
                                    </Text>
                                </div>
                            </Group>
                        </Paper>
                    )}

                    <Box
                        p="sm"
                        style={{
                            borderRadius: 8,
                            backgroundColor: confirmacion.tipo === 'cancelar' ? '#FFF5F5' : '#F0FDF4',
                            border: `1px solid ${confirmacion.tipo === 'cancelar' ? '#FECACA' : '#BBF7D0'}`,
                        }}
                    >
                        <Text size="sm" c={confirmacion.tipo === 'cancelar' ? '#991B1B' : '#166534'} fw={500}>
                            {confirmacion.tipo === 'cancelar'
                                ? 'Al cancelar esta membresía, el cliente perderá su vigencia activa de forma inmediata. Esta acción no se puede deshacer.'
                                : 'Se generará un nuevo periodo consecutivo de vigencia para este cliente con las condiciones del plan seleccionado.'}
                        </Text>
                    </Box>

                    <Group justify="flex-end" gap="sm" mt="xs">
                        <Button
                            variant="default"
                            radius="md"
                            onClick={cerrarConfirmacion}
                            disabled={procesando}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color={confirmacion.tipo === 'cancelar' ? 'red' : 'apex'}
                            radius="md"
                            onClick={ejecutarAccionConfirmada}
                            loading={procesando}
                            style={{
                                backgroundColor: confirmacion.tipo === 'cancelar' ? undefined : 'var(--ag-color-primary)',
                                color: '#ffffff',
                            }}
                            styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
                        >
                            {confirmacion.tipo === 'cancelar'
                                ? 'Sí, Cancelar Membresía'
                                : 'Sí, Renovar Membresía'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
