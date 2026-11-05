import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Title,
    Text,
    Paper,
    Group,
    Stack,
    TextInput,
    Button,
    Avatar,
    Badge,
    Tabs,
    Card,
    ThemeIcon,
    SimpleGrid,
    LoadingOverlay,
    ActionIcon,
    Tooltip,
    Divider,
    Textarea
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconIdBadge2,
    IconSearch,
    IconUserPlus,
    IconCircleCheck,
    IconCircleX,
    IconCalendar,
    IconClock,
    IconCheck,
    IconRefresh,
    IconPhone,
    IconMail,
    IconNotes,
    IconShieldCheck,
    IconHistory
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { DrawerRegistrarVisita } from './DrawerRegistrarVisita.jsx';
import { HistorialAsistencias } from './HistorialAsistencias.jsx';

export function ControlAcceso() {
    cambioNombreWeb('Control de Accesos y Visitas');

    // Estados de navegación y Drawer
    const [tabActiva, setTabActiva] = useState('recepcion');
    const [drawerVisitaAbierto, setDrawerVisitaAbierto] = useState(false);
    const [refreshHistorialKey, setRefreshHistorialKey] = useState(0);

    // Búsqueda de socio
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [mostrarResultados, setMostrarResultados] = useState(false);

    // Socio seleccionado y validación
    const [socioSeleccionado, setSocioSeleccionado] = useState(null);
    const [estadoValidacion, setEstadoValidacion] = useState(null); 
    // { acceso: boolean, codigo, membresia, diasRestantes, fechaExpiracion, mensaje }
    const [validandoMembresia, setValidandoMembresia] = useState(false);
    const [registrandoIngreso, setRegistrandoIngreso] = useState(false);
    const [observacionesIngreso, setObservacionesIngreso] = useState('');

    // Ref para autofocus continuo
    const inputBusquedaRef = useRef(null);

    const enfocarBusqueda = useCallback(() => {
        setTimeout(() => {
            if (inputBusquedaRef.current) {
                inputBusquedaRef.current.focus();
            }
        }, 100);
    }, []);

    useEffect(() => {
        enfocarBusqueda();
    }, [enfocarBusqueda, tabActiva]);

    // Búsqueda en vivo con debounce de 300ms
    useEffect(() => {
        const query = busqueda.trim();
        if (query.length < 2) {
            setResultadosBusqueda([]);
            setMostrarResultados(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setBuscando(true);
                const res = await api.asistencia.buscarClientes(query);
                if (res.responseFlag === 0 && Array.isArray(res.data)) {
                    setResultadosBusqueda(res.data);
                    setMostrarResultados(true);
                }
            } catch (err) {
                console.error('Error buscando clientes:', err);
            } finally {
                setBuscando(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [busqueda]);

    // Seleccionar socio para pre-validación visual
    const seleccionarSocio = async (cliente) => {
        setSocioSeleccionado(cliente);
        setMostrarResultados(false);
        setBusqueda('');
        setObservacionesIngreso('');

        // Consultar membresía activa del cliente para semáforo visual
        try {
            setValidandoMembresia(true);
            const res = await api.clienteMembresia.obtenerActivaPorCliente(cliente.id);
            const membresiaActiva = res.data;

            if (membresiaActiva && membresiaActiva.estadoMembresia?.nombre === 'Vigente') {
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const fin = new Date(membresiaActiva.fechaFin);
                fin.setHours(0, 0, 0, 0);
                const diffTime = fin.getTime() - hoy.getTime();
                const diasRestantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                setEstadoValidacion({
                    acceso: true,
                    codigo: 'ACCESO_AUTORIZADO',
                    membresia: membresiaActiva,
                    diasRestantes,
                    fechaExpiracion: membresiaActiva.fechaFin,
                    mensaje: 'Acceso Autorizado - Membresía Vigente'
                });
            } else {
                // Consultar última membresía para saber cuándo expiró
                const resHistorial = await api.clienteMembresia.obtenerHistorialPorCliente(cliente.id);
                const historial = Array.isArray(resHistorial.data) ? resHistorial.data : [];
                const ultima = historial.length > 0 ? historial[0] : null;

                let mensajeDetalle = 'Membresía Inexistente o Sin Asignar';
                if (ultima && ultima.fechaFin) {
                    const fechaFinUTC = new Date(ultima.fechaFin);
                    const d = String(fechaFinUTC.getUTCDate()).padStart(2, '0');
                    const m = String(fechaFinUTC.getUTCMonth() + 1).padStart(2, '0');
                    const y = fechaFinUTC.getUTCFullYear();
                    mensajeDetalle = `Membresía Vencida el ${d}/${m}/${y}`;
                }

                setEstadoValidacion({
                    acceso: false,
                    codigo: 'ACCESO_DENEGADO',
                    membresia: ultima,
                    diasRestantes: 0,
                    fechaExpiracion: ultima?.fechaFin || null,
                    mensaje: `Acceso Denegado - ${mensajeDetalle}`
                });
            }
        } catch (err) {
            console.error('Error pre-validando membresía:', err);
            setEstadoValidacion({
                acceso: false,
                codigo: 'ERROR',
                membresia: null,
                mensaje: 'Error al verificar vigencia de membresía'
            });
        } finally {
            setValidandoMembresia(false);
        }
    };

    // Confirmar y registrar ingreso en el sistema
    const confirmarIngreso = async () => {
        if (!socioSeleccionado) return;

        try {
            setRegistrandoIngreso(true);
            const res = await api.asistencia.validarYRegistrar(
                socioSeleccionado.id,
                observacionesIngreso
            );

            if (res.responseFlag === 0) {
                const nombreSocio = `${socioSeleccionado.nombre} ${socioSeleccionado.apellidoPaterno}`;
                notifications.show({
                    title: 'Acceso Registrado',
                    message: `Bienvenido(a), ${nombreSocio}. Asistencia guardada.`,
                    color: 'green',
                    icon: <IconCheck size={18} />
                });

                // Limpiar y reenfocar para el siguiente socio
                setSocioSeleccionado(null);
                setEstadoValidacion(null);
                setObservacionesIngreso('');
                setRefreshHistorialKey((k) => k + 1);
                enfocarBusqueda();
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            notifications.show({
                title: 'No se pudo registrar el acceso',
                message: err.message || 'Membresía no vigente o error interno.',
                color: 'red',
                icon: <IconCircleX size={18} />
            });
        } finally {
            setRegistrandoIngreso(false);
        }
    };

    const cancelarSeleccion = () => {
        setSocioSeleccionado(null);
        setEstadoValidacion(null);
        setObservacionesIngreso('');
        enfocarBusqueda();
    };

    // Formatear identificador del socio: #00042
    const formatoIdentificador = (id) => `#${String(id || 0).padStart(5, '0')}`;

    return (
        <Stack gap="lg" style={{ padding: '8px 0' }}>
            {/* Barra superior del módulo */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                    <Group gap="sm">
                        <ThemeIcon color="apex" size={42} radius="md" variant="filled">
                            <IconShieldCheck size={26} stroke={1.8} />
                        </ThemeIcon>
                        <div>
                            <Title order={3} style={{ color: 'var(--ag-color-primary, #1a1a1a)' }}>
                                Control de Accesos y Visitas
                            </Title>
                            <Text size="xs" c="dimmed">
                                Validación en tiempo real de membresías y registro de visitas temporales
                            </Text>
                        </div>
                    </Group>

                    <Button
                        color="apex"
                        size="md"
                        leftSection={<IconUserPlus size={20} />}
                        onClick={() => setDrawerVisitaAbierto(true)}
                        style={{
                            backgroundColor: '#FF6A00',
                            boxShadow: '0 4px 12px rgba(255, 106, 0, 0.25)'
                        }}
                    >
                        Registrar Visita
                    </Button>
                </Group>
            </Paper>

            {/* Pestañas: Recepción vs Historial y Aforo */}
            <Tabs value={tabActiva} onChange={setTabActiva} color="apex" variant="outline" radius="md">
                <Tabs.List style={{ marginBottom: 16 }}>
                    <Tabs.Tab value="recepcion" leftSection={<IconIdBadge2 size={18} />}>
                        Control de Entrada (Recepción)
                    </Tabs.Tab>
                    <Tabs.Tab value="historial" leftSection={<IconHistory size={18} />}>
                        Historial y Aforo
                    </Tabs.Tab>
                </Tabs.List>

                {/* ─── TAB 1: RECEPCIÓN Y ENTRADA ───────────────────────────────────── */}
                <Tabs.Panel value="recepcion">
                    <SimpleGrid cols={{ base: 1, md: socioSeleccionado ? 2 : 1 }} spacing="lg">
                        {/* Columna Izquierda: Input de Búsqueda y Resultados */}
                        <Stack gap="md">
                            <Paper p="lg" radius="md" withBorder style={{ position: 'relative' }}>
                                <Text fw={700} size="md" mb="xs">
                                    Búsqueda rápida de socio
                                </Text>
                                <Text size="xs" c="dimmed" mb="md">
                                    Escribe el nombre o apellido del cliente para validar su acceso de inmediato.
                                </Text>

                                <TextInput
                                    ref={inputBusquedaRef}
                                    placeholder="Buscar socio por nombre o apellido..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                                    leftSection={<IconSearch size={18} color="#FF6A00" />}
                                    rightSection={
                                        buscando ? (
                                            <IconRefresh size={16} className="mantine-rotate" />
                                        ) : busqueda ? (
                                            <ActionIcon size="sm" variant="subtle" onClick={() => setBusqueda('')}>
                                                ✕
                                            </ActionIcon>
                                        ) : null
                                    }
                                    size="lg"
                                    radius="md"
                                    autoFocus
                                />

                                {/* Lista desplegable de coincidencias */}
                                {mostrarResultados && (
                                    <Paper
                                        withBorder
                                        shadow="md"
                                        radius="md"
                                        mt="xs"
                                        style={{
                                            maxHeight: 280,
                                            overflowY: 'auto',
                                            backgroundColor: '#ffffff'
                                        }}
                                    >
                                        {resultadosBusqueda.length === 0 ? (
                                            <Text p="md" size="sm" c="dimmed" ta="center">
                                                No se encontraron socios con ese nombre.
                                            </Text>
                                        ) : (
                                            resultadosBusqueda.map((c) => {
                                                const nombreCompleto = `${c.nombre} ${c.apellidoPaterno} ${c.apellidoMaterno || ''}`.trim();
                                                const foto = c.usuario?.fotoUrl || null;
                                                const iniciales = `${c.nombre?.charAt(0) || ''}${c.apellidoPaterno?.charAt(0) || ''}`.toUpperCase();

                                                return (
                                                    <Group
                                                        key={c.id}
                                                        justify="space-between"
                                                        p="sm"
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #f1f3f5',
                                                            transition: 'background-color 0.15s ease'
                                                        }}
                                                        onClick={() => seleccionarSocio(c)}
                                                    >
                                                        <Group gap="sm">
                                                            <Avatar src={foto} radius="xl" color="apex">
                                                                {iniciales}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={600}>
                                                                    {nombreCompleto}
                                                                </Text>
                                                                <Group gap="xs">
                                                                    <Badge size="xs" variant="light" color="gray">
                                                                        {formatoIdentificador(c.id)}
                                                                    </Badge>
                                                                    {c.telefono && (
                                                                        <Text size="xs" c="dimmed">
                                                                            Tel: {c.telefono}
                                                                        </Text>
                                                                    )}
                                                                </Group>
                                                            </div>
                                                        </Group>

                                                        <Button size="xs" variant="light" color="apex">
                                                            Seleccionar
                                                        </Button>
                                                    </Group>
                                                );
                                            })
                                        )}
                                    </Paper>
                                )}
                            </Paper>

                            {!socioSeleccionado && (
                                <Paper
                                    p="xl"
                                    radius="md"
                                    withBorder
                                    style={{
                                        textAlign: 'center',
                                        backgroundColor: '#fafbfc',
                                        borderStyle: 'dashed'
                                    }}
                                >
                                    <ThemeIcon size={64} radius="xl" color="gray" variant="light" mb="md">
                                        <IconIdBadge2 size={36} color="#adb5bd" />
                                    </ThemeIcon>
                                    <Text fw={700} size="md" c="dimmed">
                                        Ningún socio seleccionado
                                    </Text>
                                    <Text size="xs" c="dimmed" mt={4}>
                                        Busca un cliente arriba para verificar su membresía y autorizar su acceso.
                                    </Text>
                                </Paper>
                            )}
                        </Stack>

                        {/* Columna Derecha: Tarjeta de Validación del Socio con Semáforo */}
                        {socioSeleccionado && (
                            <Paper
                                p="lg"
                                radius="md"
                                withBorder
                                style={{
                                    position: 'relative',
                                    borderTop: `6px solid ${
                                        estadoValidacion?.acceso ? '#2b8a3e' : '#c92a2a'
                                    }`,
                                    backgroundColor: '#ffffff'
                                }}
                            >
                                <LoadingOverlay visible={validandoMembresia} overlayProps={{ blur: 1 }} />

                                {/* Encabezado de la Tarjeta con Foto/Avatar y Datos */}
                                <Group justify="space-between" align="flex-start" mb="md">
                                    <Group gap="md">
                                        <Avatar
                                            src={socioSeleccionado.usuario?.fotoUrl || null}
                                            size={72}
                                            radius="xl"
                                            color="apex"
                                            style={{
                                                border: `3px solid ${
                                                    estadoValidacion?.acceso ? '#2b8a3e' : '#c92a2a'
                                                }`
                                            }}
                                        >
                                            {`${socioSeleccionado.nombre?.charAt(0) || ''}${socioSeleccionado.apellidoPaterno?.charAt(0) || ''}`.toUpperCase()}
                                        </Avatar>

                                        <div>
                                            <Badge size="sm" variant="filled" color="dark" mb={4}>
                                                Socio {formatoIdentificador(socioSeleccionado.id)}
                                            </Badge>
                                            <Title order={4}>
                                                {`${socioSeleccionado.nombre} ${socioSeleccionado.apellidoPaterno} ${socioSeleccionado.apellidoMaterno || ''}`.trim()}
                                            </Title>
                                            <Group gap="md" mt={2}>
                                                {socioSeleccionado.telefono && (
                                                    <Group gap={4}>
                                                        <IconPhone size={14} color="#868e96" />
                                                        <Text size="xs" c="dimmed">{socioSeleccionado.telefono}</Text>
                                                    </Group>
                                                )}
                                                {socioSeleccionado.correo && (
                                                    <Group gap={4}>
                                                        <IconMail size={14} color="#868e96" />
                                                        <Text size="xs" c="dimmed">{socioSeleccionado.correo}</Text>
                                                    </Group>
                                                )}
                                            </Group>
                                        </div>
                                    </Group>

                                    <Button variant="subtle" color="gray" size="xs" onClick={cancelarSeleccion}>
                                        Cambiar
                                    </Button>
                                </Group>

                                <Divider my="sm" />

                                {/* ─── INDICADOR SEMÁFORO VISUAL ─── */}
                                {estadoValidacion && (
                                    <Paper
                                        p="md"
                                        radius="md"
                                        withBorder
                                        mb="md"
                                        style={{
                                            backgroundColor: estadoValidacion.acceso ? '#ebfbee' : '#fff5f5',
                                            borderColor: estadoValidacion.acceso ? '#b2f2bb' : '#ffc9c9'
                                        }}
                                    >
                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon
                                                size={48}
                                                radius="xl"
                                                variant="filled"
                                                color={estadoValidacion.acceso ? 'green' : 'red'}
                                            >
                                                {estadoValidacion.acceso ? (
                                                    <IconCircleCheck size={32} />
                                                ) : (
                                                    <IconCircleX size={32} />
                                                )}
                                            </ThemeIcon>

                                            <div style={{ flex: 1 }}>
                                                <Text
                                                    fw={800}
                                                    size="lg"
                                                    c={estadoValidacion.acceso ? 'green.9' : 'red.9'}
                                                >
                                                    {estadoValidacion.mensaje}
                                                </Text>

                                                {estadoValidacion.acceso ? (
                                                    <Stack gap={2} mt="xs">
                                                        <Group gap="xs">
                                                            <Text size="sm" fw={600} c="dark">
                                                                Plan: {estadoValidacion.membresia?.tipoMembresia?.nombre || 'General'}
                                                            </Text>
                                                        </Group>
                                                        <Group gap="xs">
                                                            <IconCalendar size={15} color="#2b8a3e" />
                                                            <Text size="xs" c="dimmed">
                                                                Vigencia: Vence el{' '}
                                                                {new Date(estadoValidacion.fechaExpiracion).toLocaleDateString('es-MX', { timeZone: 'UTC' })}
                                                            </Text>
                                                            <Badge size="xs" color="green" variant="light">
                                                                {estadoValidacion.diasRestantes === 0
                                                                    ? 'Vence hoy'
                                                                    : `Quedan ${estadoValidacion.diasRestantes} días`}
                                                            </Badge>
                                                        </Group>
                                                    </Stack>
                                                ) : (
                                                    <Text size="xs" c="red.8" mt="xs">
                                                        El socio no puede ingresar al gimnasio sin renovar o regularizar su membresía.
                                                    </Text>
                                                )}
                                            </div>
                                        </Group>
                                    </Paper>
                                )}

                                {/* Observaciones opcionales del recepcionista */}
                                <Textarea
                                    label="Observaciones de ingreso"
                                    placeholder="Incidencia, casillero asignado o nota del recepcionista (opcional)"
                                    value={observacionesIngreso}
                                    onChange={(e) => setObservacionesIngreso(e.currentTarget.value)}
                                    minRows={2}
                                    mb="md"
                                    leftSection={<IconNotes size={16} stroke={1.5} />}
                                />

                                {/* Botón de confirmación rápida */}
                                <Group justify="space-between" mt="md">
                                    <Button variant="default" onClick={cancelarSeleccion}>
                                        Cancelar
                                    </Button>

                                    <Button
                                        size="md"
                                        color={estadoValidacion?.acceso ? 'green' : 'red'}
                                        disabled={!estadoValidacion?.acceso}
                                        loading={registrandoIngreso}
                                        leftSection={<IconCheck size={20} />}
                                        onClick={confirmarIngreso}
                                    >
                                        {estadoValidacion?.acceso
                                            ? 'Confirmar Ingreso (Registrar Asistencia)'
                                            : 'Ingreso Bloqueado (Membresía No Válida)'}
                                    </Button>
                                </Group>
                            </Paper>
                        )}
                    </SimpleGrid>
                </Tabs.Panel>

                {/* ─── TAB 2: HISTORIAL Y AFORO ───────────────────────────────────────── */}
                <Tabs.Panel value="historial">
                    <HistorialAsistencias refreshKey={refreshHistorialKey} />
                </Tabs.Panel>
            </Tabs>

            {/* Modal Drawer para registro de visitas temporales */}
            <DrawerRegistrarVisita
                opened={drawerVisitaAbierto}
                onClose={() => {
                    setDrawerVisitaAbierto(false);
                    enfocarBusqueda();
                }}
                onVisitaRegistrada={() => {
                    setRefreshHistorialKey((k) => k + 1);
                    enfocarBusqueda();
                }}
            />
        </Stack>
    );
}

export default ControlAcceso;
