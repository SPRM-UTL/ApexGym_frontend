import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Group,
    Loader,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Text,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconCalendarStats,
    IconCreditCard,
    IconQrcode,
    IconReceipt,
    IconRefresh,
    IconShieldCheck,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

const formatearFecha = (valor) => {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatearFechaHora = (valor) => {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatearMoneda = (valor) => {
    const num = Number(valor || 0);
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(Number.isFinite(num) ? num : 0);
};

const badgeEstadoVenta = (estado) => {
    const norm = String(estado || '').trim().toLowerCase();
    if (norm === 'completada' || norm === 'pagada') return 'green';
    if (norm === 'cancelada') return 'red';
    return 'yellow';
};

/**
 * Vista de inicio autogestionada para usuarios con rol Cliente.
 * Consume exclusivamente endpoints habilitados para el propio socio (/mi-membresia, /mi-qr, /ventas).
 */
export function PortalClienteInicio({ usuario }) {
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [membresiaData, setMembresiaData] = useState(null);
    const [qrData, setQrData] = useState(null);
    const [compras, setCompras] = useState([]);

    const cargarDatosCliente = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const [resMem, resQr, resVentas] = await Promise.allSettled([
                api.clienteMembresia.obtenerMiMembresia(),
                api.asistencia.obtenerMiQr(),
                api.venta.obtenerTodos({ pagina: 1, limite: 5 }),
            ]);

            if (resMem.status === 'fulfilled' && resMem.value?.responseFlag === 0) {
                setMembresiaData(resMem.value.data || null);
            }
            if (resQr.status === 'fulfilled' && resQr.value?.responseFlag === 0) {
                setQrData(resQr.value.data || null);
            }
            if (resVentas.status === 'fulfilled' && resVentas.value?.responseFlag === 0) {
                const registros = resVentas.value?.data?.registros;
                setCompras(Array.isArray(registros) ? registros : []);
            }

            if (
                resMem.status === 'rejected' &&
                resQr.status === 'rejected' &&
                resVentas.status === 'rejected'
            ) {
                setError('No se pudo cargar tu información de socio. Intenta actualizar.');
            }
        } catch (err) {
            setError(err?.message || 'Error al cargar el portal de cliente');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatosCliente();
    }, [cargarDatosCliente]);

    const membresiaActiva = membresiaData?.membresiaActiva || null;
    const diasRestantes = qrData?.diasRestantes;

    return (
        <Stack gap="md">
            <Paper p="md" radius="md" withBorder bg="var(--ag-surface-1)" style={{ borderColor: 'var(--ag-border)' }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                    <div>
                        <Title order={2} size="h3" c="var(--ag-text-primary)">
                            Mi Espacio de Cliente
                        </Title>
                        <Text size="sm" c="var(--ag-text-muted)">
                            Bienvenido, {usuario?.nombre || 'Socio'}. Consulta tu membresía vigente, pase QR de acceso y compras recientes.
                        </Text>
                    </div>
                    <Button
                        variant="light"
                        color="apex"
                        size="sm"
                        radius="md"
                        leftSection={<IconRefresh size={16} />}
                        onClick={cargarDatosCliente}
                        loading={cargando}
                        mih={36}
                    >
                        Actualizar
                    </Button>
                </Group>
            </Paper>

            {error && (
                <Alert icon={<IconAlertCircle size={18} />} title="Aviso" color="red" variant="light">
                    {error}
                </Alert>
            )}

            {cargando && !membresiaData && !qrData ? (
                <Group justify="center" py="xl">
                    <Loader color="apex" />
                    <Text c="var(--ag-text-muted)">Cargando tu información...</Text>
                </Group>
            ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Paper p="md" radius="md" withBorder bg="var(--ag-surface-1)" style={{ borderColor: 'var(--ag-border)' }}>
                        <Stack gap="sm">
                            <Group justify="space-between" align="center">
                                <Group gap="xs">
                                    <ThemeIcon size={36} radius="md" variant="light" color="apex">
                                        <IconCreditCard size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} size="sm" c="var(--ag-text-primary)">
                                            Mi Membresía
                                        </Text>
                                        <Text size="xs" c="var(--ag-text-muted)">
                                            Estado de suscripción
                                        </Text>
                                    </div>
                                </Group>
                                {membresiaActiva?.estadoMembresia?.nombre ? (
                                    <Badge
                                        color={String(membresiaActiva.estadoMembresia.nombre).toLowerCase().includes('vigente') ? 'green' : 'orange'}
                                        variant="light"
                                    >
                                        {membresiaActiva.estadoMembresia.nombre}
                                    </Badge>
                                ) : (
                                    <Badge color="gray" variant="light">
                                        Sin membresía activa
                                    </Badge>
                                )}
                            </Group>

                            {membresiaActiva ? (
                                <Stack gap={6}>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Plan contratado</Text>
                                        <Text size="sm" fw={700} c="var(--ag-text-primary)">
                                            {membresiaActiva.tipoMembresia?.nombre || 'Membresía'}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Vigencia</Text>
                                        <Text size="sm" fw={600} c="var(--ag-text-primary)">
                                            {formatearFecha(membresiaActiva.fechaInicio)} — {formatearFecha(membresiaActiva.fechaFin)}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Días restantes</Text>
                                        <Group gap={4}>
                                            <IconCalendarStats size={15} color="var(--ag-color-primary)" />
                                            <Text size="sm" fw={700} c="var(--ag-color-primary)">
                                                {typeof diasRestantes === 'number' ? `${diasRestantes} día(s)` : '—'}
                                            </Text>
                                        </Group>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Renovación automática</Text>
                                        <Badge size="sm" variant="outline" color={membresiaActiva.renovacionAutomatica ? 'teal' : 'gray'}>
                                            {membresiaActiva.renovacionAutomatica ? 'Activada' : 'Manual'}
                                        </Badge>
                                    </Group>
                                </Stack>
                            ) : (
                                <Text size="sm" c="var(--ag-text-muted)">
                                    Actualmente no cuentas con una membresía activa registrada en sucursal.
                                </Text>
                            )}
                        </Stack>
                    </Paper>

                    <Paper p="md" radius="md" withBorder bg="var(--ag-surface-1)" style={{ borderColor: 'var(--ag-border)' }}>
                        <Stack gap="sm">
                            <Group justify="space-between" align="center">
                                <Group gap="xs">
                                    <ThemeIcon size={36} radius="md" variant="light" color="apex">
                                        <IconQrcode size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={700} size="sm" c="var(--ag-text-primary)">
                                            Mi Pase QR de Acceso
                                        </Text>
                                        <Text size="xs" c="var(--ag-text-muted)">
                                            Código personal de entrada
                                        </Text>
                                    </div>
                                </Group>
                                <Badge
                                    color={qrData?.vigente ? 'green' : 'yellow'}
                                    variant="light"
                                    leftSection={<IconShieldCheck size={12} />}
                                >
                                    {qrData?.vigente ? 'Acceso vigente' : 'Revisar vigencia'}
                                </Badge>
                            </Group>

                            {qrData?.codigoQr ? (
                                <Stack gap={6}>
                                    <Paper p="sm" radius="sm" bg="var(--ag-surface-2)" withBorder style={{ borderColor: 'var(--ag-border)' }}>
                                        <Text size="xs" c="var(--ag-text-muted)">Código QR</Text>
                                        <Text ff="monospace" fw={800} size="lg" c="var(--ag-color-primary)">
                                            {qrData.codigoQr}
                                        </Text>
                                    </Paper>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Estado</Text>
                                        <Text size="sm" fw={600} c="var(--ag-text-primary)">
                                            {qrData.mensaje || 'Pase listo para recepción'}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="var(--ag-text-muted)">Válido hasta</Text>
                                        <Text size="xs" c="var(--ag-text-primary)">
                                            {formatearFechaHora(qrData.expiraEn)}
                                        </Text>
                                    </Group>
                                </Stack>
                            ) : (
                                <Text size="sm" c="var(--ag-text-muted)">
                                    No hay código QR generado aún para tu perfil.
                                </Text>
                            )}
                        </Stack>
                    </Paper>
                </SimpleGrid>
            )}

            <Paper p="md" radius="md" withBorder bg="var(--ag-surface-1)" style={{ borderColor: 'var(--ag-border)' }}>
                <Stack gap="sm">
                    <Group gap="xs">
                        <ThemeIcon size={34} radius="md" variant="light" color="apex">
                            <IconReceipt size={18} />
                        </ThemeIcon>
                        <div>
                            <Text fw={700} size="sm" c="var(--ag-text-primary)">
                                Mis Compras Recientes
                            </Text>
                            <Text size="xs" c="var(--ag-text-muted)">
                                Historial de tus últimas transacciones registradas
                            </Text>
                        </div>
                    </Group>

                    {compras.length === 0 ? (
                        <Text size="sm" c="var(--ag-text-muted)">
                            Aún no registras compras en el historial.
                        </Text>
                    ) : (
                        <Table.ScrollContainer minWidth={520}>
                            <Table striped highlightOnHover verticalSpacing="xs">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Folio</Table.Th>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Método de pago</Table.Th>
                                        <Table.Th>Total</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {compras.map((venta) => (
                                        <Table.Tr key={venta.id}>
                                            <Table.Td>
                                                <Text ff="monospace" fw={700} size="sm">
                                                    #{venta.folioVentaId || venta.id}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>{formatearFechaHora(venta.createdAt)}</Table.Td>
                                            <Table.Td>{venta.metodoPago?.nombre || 'Efectivo'}</Table.Td>
                                            <Table.Td fw={700}>{formatearMoneda(venta.total)}</Table.Td>
                                            <Table.Td>
                                                <Badge size="sm" variant="light" color={badgeEstadoVenta(venta.estado)}>
                                                    {String(venta.estado || 'PENDIENTE').toUpperCase()}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}

export default PortalClienteInicio;
