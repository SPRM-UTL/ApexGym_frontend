import { useState, useEffect, useMemo } from 'react';
import {
    Paper,
    SimpleGrid,
    Group,
    Text,
    ThemeIcon,
    Badge,
    TextInput,
    Select,
    Table,
    Pagination,
    Stack,
    LoadingOverlay,
    Divider,
    Button,
    Card
} from '@mantine/core';
import {
    IconUsersGroup,
    IconIdBadge2,
    IconTicket,
    IconSearch,
    IconRefresh,
    IconCalendar,
    IconCheck,
    IconClock
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

export function HistorialAsistencias({ refreshKey = 0 }) {
    const [cargando, setCargando] = useState(true);
    const [asistencias, setAsistencias] = useState([]);
    const [visitas, setVisitas] = useState([]);
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const [resAsis, resVis] = await Promise.all([
                api.asistencia.obtenerHoy(fechaSeleccionada),
                api.visita.obtenerPorPeriodo(fechaSeleccionada, fechaSeleccionada)
            ]);

            if (resAsis.responseFlag === 0 && resAsis.data) {
                setAsistencias(resAsis.data.asistencias || []);
            }
            if (resVis.responseFlag === 0 && Array.isArray(resVis.data)) {
                setVisitas(resVis.data);
            }
        } catch (err) {
            console.error('Error al cargar historial y aforo:', err);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [fechaSeleccionada, refreshKey]);

    // Combinar accesos (Socios + Visitas) ordenados por fechaHora descendente
    const accesosCombinados = useMemo(() => {
        const listaSocios = asistencias.map((a) => ({
            id: `socio-${a.id}`,
            tipo: 'SOCIO',
            fechaHora: new Date(a.fechaHora),
            nombre: a.cliente
                ? `${a.cliente.nombre} ${a.cliente.apellidoPaterno} ${a.cliente.apellidoMaterno || ''}`.trim()
                : 'Socio no identificado',
            detalle: a.clienteMembresia?.tipoMembresia?.nombre || 'Membresía activa',
            estatus: 'Acceso Autorizado',
            estatusColor: 'green',
            observaciones: a.observaciones || '-'
        }));

        const listaVisitas = visitas.map((v) => ({
            id: `visita-${v.id}`,
            tipo: 'VISITA',
            fechaHora: new Date(v.fechaHora),
            nombre: v.nombreVisitante,
            detalle: `${v.tipoVisita?.nombre || 'Visita general'} ($${Number(v.costo || 0).toFixed(2)})`,
            estatus: 'Pase Temporal',
            estatusColor: 'apex',
            observaciones: v.observaciones || '-'
        }));

        const todos = [...listaSocios, ...listaVisitas];
        todos.sort((a, b) => b.fechaHora - a.fechaHora);
        return todos;
    }, [asistencias, visitas]);

    // Filtros interactivos
    const registrosFiltrados = useMemo(() => {
        return accesosCombinados.filter((item) => {
            if (filtroTipo !== 'TODOS' && item.tipo !== filtroTipo) {
                return false;
            }
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase().trim();
                const matchNombre = item.nombre.toLowerCase().includes(q);
                const matchDetalle = item.detalle.toLowerCase().includes(q);
                const matchObs = item.observaciones.toLowerCase().includes(q);
                if (!matchNombre && !matchDetalle && !matchObs) return false;
            }
            return true;
        });
    }, [accesosCombinados, filtroTipo, busqueda]);

    // Paginación
    const totalPaginas = Math.ceil(registrosFiltrados.length / elementosPorPagina) || 1;
    const registrosPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * elementosPorPagina;
        return registrosFiltrados.slice(inicio, inicio + elementosPorPagina);
    }, [registrosFiltrados, paginaActual]);

    // Métricas del aforo
    const totalSocios = asistencias.length;
    const totalVisitas = visitas.length;
    const totalAforo = totalSocios + totalVisitas;

    return (
        <Stack gap="lg" style={{ position: 'relative' }}>
            <LoadingOverlay visible={cargando} overlayProps={{ blur: 1 }} />

            <Divider my="xs" label="Resumen de aforo e historial" labelPosition="center" />

            {/* Tarjetas de métricas superiores */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Card shadow="xs" p="md" radius="md" withBorder style={{ borderLeft: '4px solid #FF6A00' }}>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total de accesos hoy</Text>
                            <Text size="xl" fw={800} c="dark">{totalAforo}</Text>
                        </div>
                        <ThemeIcon color="apex" variant="light" size={48} radius="md">
                            <IconUsersGroup size={28} stroke={1.8} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">Aforo total del establecimiento</Text>
                </Card>

                <Card shadow="xs" p="md" radius="md" withBorder style={{ borderLeft: '4px solid #2b8a3e' }}>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Socios con Membresía</Text>
                            <Text size="xl" fw={800} c="green.8">{totalSocios}</Text>
                        </div>
                        <ThemeIcon color="green" variant="light" size={48} radius="md">
                            <IconIdBadge2 size={28} stroke={1.8} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">Ingresos validados con membresía vigente</Text>
                </Card>

                <Card shadow="xs" p="md" radius="md" withBorder style={{ borderLeft: '4px solid #e8590c' }}>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Visitas Temporales</Text>
                            <Text size="xl" fw={800} c="orange.8">{totalVisitas}</Text>
                        </div>
                        <ThemeIcon color="orange" variant="light" size={48} radius="md">
                            <IconTicket size={28} stroke={1.8} />
                        </ThemeIcon>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">Pases por día o accesos temporales</Text>
                </Card>
            </SimpleGrid>

            {/* Barra de filtros */}
            <Paper p="md" radius="md" withBorder>
                <Group justify="space-between" wrap="wrap" gap="md">
                    <Group gap="sm" wrap="wrap">
                        <TextInput
                            placeholder="Buscar por nombre o membresía..."
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.currentTarget.value);
                                setPaginaActual(1);
                            }}
                            leftSection={<IconSearch size={16} stroke={1.5} />}
                            style={{ width: 280 }}
                        />

                        <Select
                            value={filtroTipo}
                            onChange={(val) => {
                                setFiltroTipo(val || 'TODOS');
                                setPaginaActual(1);
                            }}
                            data={[
                                { value: 'TODOS', label: 'Todos los tipos' },
                                { value: 'SOCIO', label: 'Solo Socios' },
                                { value: 'VISITA', label: 'Solo Visitas' }
                            ]}
                            style={{ width: 180 }}
                        />

                        <TextInput
                            type="date"
                            value={fechaSeleccionada}
                            onChange={(e) => {
                                setFechaSeleccionada(e.currentTarget.value);
                                setPaginaActual(1);
                            }}
                            leftSection={<IconCalendar size={16} stroke={1.5} />}
                            style={{ width: 170 }}
                        />
                    </Group>

                    <Button
                        variant="subtle"
                        color="apex"
                        onClick={cargarDatos}
                        leftSection={<IconRefresh size={16} />}
                        size="sm"
                    >
                        Actualizar
                    </Button>
                </Group>
            </Paper>

            {/* Tabla de accesos */}
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                    <Table.Thead style={{ backgroundColor: '#f8f9fa' }}>
                        <Table.Tr>
                            <Table.Th style={{ width: 110 }}>Hora</Table.Th>
                            <Table.Th style={{ width: 120 }}>Tipo</Table.Th>
                            <Table.Th>Nombre Completo</Table.Th>
                            <Table.Th>Membresía / Pase</Table.Th>
                            <Table.Th style={{ width: 170 }}>Estatus</Table.Th>
                            <Table.Th>Observaciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {registrosPaginados.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={6} align="center" style={{ padding: '32px 16px' }}>
                                    <Text c="dimmed" size="sm">
                                        No se encontraron registros de acceso para la fecha y filtros seleccionados.
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            registrosPaginados.map((item) => {
                                const horaStr = item.fechaHora.toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                });

                                return (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>
                                            <Group gap={4} wrap="nowrap">
                                                <IconClock size={14} color="#868e96" />
                                                <Text size="sm" fw={600}>{horaStr}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                variant="light"
                                                color={item.tipo === 'SOCIO' ? 'blue' : 'apex'}
                                                size="sm"
                                            >
                                                {item.tipo}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text fw={600} size="sm">{item.nombre}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">{item.detalle}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                variant="filled"
                                                color={item.estatusColor}
                                                size="sm"
                                                leftSection={<IconCheck size={12} />}
                                            >
                                                {item.estatus}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">{item.observaciones}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })
                        )}
                    </Table.Tbody>
                </Table>

                {totalPaginas > 1 && (
                    <Group justify="space-between" p="md" style={{ borderTop: '1px solid #e9ecef' }}>
                        <Text size="xs" c="dimmed">
                            Mostrando {registrosPaginados.length} de {registrosFiltrados.length} entradas
                        </Text>
                        <Pagination
                            value={paginaActual}
                            onChange={setPaginaActual}
                            total={totalPaginas}
                            color="apex"
                            size="sm"
                        />
                    </Group>
                )}
            </Paper>
        </Stack>
    );
}
