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
        return 'blue';
    };

    const membresiaActiva = historial.find((m) => m.estadoMembresia?.nombre === 'Vigente');

    return (
        <>
            <Modal
                opened={opened}
                onClose={onClose}
                title={
                    <Group gap="sm" c="white">
                        <IconHistory size={22} stroke={1.8} />
                        <Title order={4} c="white">
                            Historial de Membresías de {cliente?.nombre} {cliente?.apellidoPaterno ?? ''}
                        </Title>
                    </Group>
                }
                fullScreen
                radius={0}
                zIndex={999999}
                transitionProps={{ transition: 'slide-up', duration: 200 }}
                styles={{
                    header: { backgroundColor: '#1B1F3A' },
                    close: {
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                    }
                }}
            >
                <Stack maw={1360} mx="auto" my="lg" gap="lg" px={{ base: 'xs', sm: 'md' }}>
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
                            <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
                                <Table.Thead style={{ backgroundColor: '#1B1F3A' }}>
                                    <Table.Tr>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            PLAN / MEMBRESÍA
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            FECHA DE INICIO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            FECHA DE FIN
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            PRECIO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            RENOVACIÓN
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
                                            ESTADO
                                        </Table.Th>
                                        <Table.Th style={{ color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center' }}>
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
                                                    <Group gap="sm" wrap="nowrap">
                                                        <ThemeIcon size="md" radius="md" variant="light" color="indigo">
                                                            <IconCertificate size={16} stroke={1.8} />
                                                        </ThemeIcon>
                                                        <div>
                                                            <Text fw={600} size="sm">
                                                                {item.tipoMembresia?.nombre ?? '—'}
                                                            </Text>
                                                            {item.tipoMembresia?.duracionDias && (
                                                                <Text size="xs" c="dimmed">
                                                                    Duración: {item.tipoMembresia.duracionDias} días
                                                                </Text>
                                                            )}
                                                        </div>
                                                    </Group>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Group gap={6} wrap="nowrap">
                                                        <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                                                        <Text size="sm" fw={500}>
                                                            {formatearFecha(item.fechaInicio)}
                                                        </Text>
                                                    </Group>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Group gap={6} wrap="nowrap">
                                                        <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                                                        <Text size="sm" fw={500}>
                                                            {formatearFecha(item.fechaFin)}
                                                        </Text>
                                                    </Group>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Text fw={700} size="sm" c="dark.4">
                                                        ${Number(item.tipoMembresia?.precio ?? 0).toFixed(2)} MXN
                                                    </Text>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Badge
                                                        variant="dot"
                                                        size="md"
                                                        color={item.renovacionAutomatica ? 'teal' : 'gray'}
                                                    >
                                                        {item.renovacionAutomatica ? 'Automática' : 'Manual'}
                                                    </Badge>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Badge
                                                        color={badgeColor(item.estadoMembresia?.nombre)}
                                                        size="md"
                                                        radius="sm"
                                                        variant="light"
                                                        fw={700}
                                                    >
                                                        {item.estadoMembresia?.nombre ?? 'Desconocido'}
                                                    </Badge>
                                                </Table.Td>

                                                <Table.Td>
                                                    <Group gap={8} justify="center" wrap="nowrap">
                                                        {item.estadoMembresia?.nombre === 'Vigente' && (
                                                            <Tooltip label="Cancelar Membresía" withArrow openDelay={200}>
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="red"
                                                                    size="lg"
                                                                    radius="md"
                                                                    onClick={() => abrirConfirmacion('cancelar', item)}
                                                                >
                                                                    <IconCircleX size={20} stroke={1.8} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip label="Renovar Plan" withArrow openDelay={200}>
                                                            <ActionIcon
                                                                variant="light"
                                                                color="blue"
                                                                size="lg"
                                                                radius="md"
                                                                onClick={() => abrirConfirmacion('renovar', item)}
                                                            >
                                                                <IconRotateClockwise size={20} stroke={1.8} />
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
                    <Title order={5} c="white">
                        {confirmacion.tipo === 'cancelar'
                            ? 'Confirmar Cancelación de Membresía'
                            : 'Confirmar Renovación de Membresía'}
                    </Title>
                }
                styles={{
                    header: { backgroundColor: '#1B1F3A' },
                    close: {
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                    }
                }}
                centered
                size={520}
                padding="lg"
                radius="md"
                zIndex={1000005}
                closeOnClickOutside={!procesando}
                closeOnEscape={!procesando}
            >
                <Stack gap="md" mt="xs">
                    <Text size="sm" c="dimmed">
                        {confirmacion.tipo === 'cancelar' ? (
                            <>
                                ¿Estás seguro de que deseas cancelar la membresía{' '}
                                <Text span fw={700} c="dark.7">
                                    {confirmacion.item?.tipoMembresia?.nombre}
                                </Text>{' '}
                                del cliente{' '}
                                <Text span fw={700} c="dark.7">
                                    {cliente?.nombre}
                                </Text>
                                ? Esta acción no se puede deshacer y el cliente perderá su vigencia activa.
                            </>
                        ) : (
                            <>
                                ¿Deseas renovar el plan{' '}
                                <Text span fw={700} c="dark.7">
                                    {confirmacion.item?.tipoMembresia?.nombre}
                                </Text>{' '}
                                para{' '}
                                <Text span fw={700} c="dark.7">
                                    {cliente?.nombre}
                                </Text>
                                ? Se creará un nuevo periodo consecutivo de vigencia.
                            </>
                        )}
                    </Text>

                    {confirmacion.item && (
                        <Paper withBorder p="sm" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed">Plan a {confirmacion.tipo === 'cancelar' ? 'cancelar' : 'renovar'}:</Text>
                                    <Text size="sm" fw={600}>{confirmacion.item?.tipoMembresia?.nombre}</Text>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text size="xs" c="dimmed">Precio:</Text>
                                    <Text size="sm" fw={700} c="teal.7">
                                        ${Number(confirmacion.item?.tipoMembresia?.precio ?? 0).toFixed(2)} MXN
                                    </Text>
                                </div>
                            </Group>
                        </Paper>
                    )}

                    <Divider mt="xs" />

                    <Group justify="flex-end" gap="sm">
                        <Button
                            variant="default"
                            onClick={cerrarConfirmacion}
                            disabled={procesando}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color={confirmacion.tipo === 'cancelar' ? 'red' : 'apex'}
                            onClick={ejecutarAccionConfirmada}
                            loading={procesando}
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
