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
    Textarea,
    Modal,
    Alert,
    Progress
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
    IconHistory,
    IconQrcode,
    IconCamera,
    IconBarcode,
    IconAlertTriangle,
    IconVolume,
    IconVolumeOff
} from '@tabler/icons-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { DrawerRegistrarVisita } from './DrawerRegistrarVisita.jsx';
import { HistorialAsistencias } from './HistorialAsistencias.jsx';
import { EncabezadoTabla } from '../../components/TablaRegistros/TablaRegistros.jsx';

/**
 * Emite sonido sintetizado de acceso autorizado o denegado mediante Web Audio API
 */
function reproducirSonidoAcceso(autorizado) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (autorizado) {
            // Tono agudo de éxito (D5 -> A5)
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        } else {
            // Tono grave de denegación (A3 -> F3)
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.setValueAtTime(174.61, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.45);
        }
    } catch {
        // Ignorar si el navegador restringe audio sin interacción previa
    }
}

export function ControlAcceso() {
    cambioNombreWeb('Control de Accesos y Visitas');

    // Navegación de pestañas y modales
    const [tabActiva, setTabActiva] = useState('recepcion');
    const [drawerVisitaAbierto, setDrawerVisitaAbierto] = useState(false);
    const [modalCamaraAbierto, setModalCamaraAbierto] = useState(false);
    const [refreshHistorialKey, setRefreshHistorialKey] = useState(0);
    const [sonidoHabilitado, setSonidoHabilitado] = useState(true);

    // Entrada de búsqueda / lector rápido
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [mostrarResultados, setMostrarResultados] = useState(false);

    // Estado del Semáforo Flash en vivo (resultado del último escaneo o validación)
    const [resultadoSemaforo, setResultadoSemaforo] = useState(null);
    // { acceso: boolean, codigo, mensaje, cliente, membresia, diasRestantes, fechaExpiracion, advertencia, tipoAcceso }
    const [temporizadorSemaforo, setTemporizadorSemaforo] = useState(null);

    // Flujo de confirmación manual de socio seleccionado
    const [socioSeleccionado, setSocioSeleccionado] = useState(null);
    const [validandoMembresia, setValidandoMembresia] = useState(false);
    const [registrandoIngreso, setRegistrandoIngreso] = useState(false);
    const [observacionesIngreso, setObservacionesIngreso] = useState('');

    // Referencias
    const inputBusquedaRef = useRef(null);
    const html5QrCodeRef = useRef(null);

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

    // Limpieza de temporizadores al desmontar
    useEffect(() => {
        return () => {
            if (temporizadorSemaforo) clearTimeout(temporizadorSemaforo);
        };
    }, [temporizadorSemaforo]);

    const detenerTracksVideo = () => {
        try {
            const container = document.getElementById('qr-reader-container');
            if (!container) return;
            const videos = container.querySelectorAll('video');
            videos.forEach((video) => {
                const stream = video.srcObject;
                if (stream && typeof stream.getTracks === 'function') {
                    stream.getTracks().forEach((track) => track.stop());
                }
                video.srcObject = null;
            });
        } catch {
            // Ignorar errores al liberar tracks manualmente
        }
    };

    const detenerCamaraSegura = async () => {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (scanner) {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
            } catch (e) {
                console.warn('Aviso al detener escáner QR:', e);
            }
            try {
                if (document.getElementById('qr-reader-container')) {
                    await scanner.clear();
                }
            } catch {
                // Ignorar si el modal ya desmontó el contenedor DOM
            }
        }
        detenerTracksVideo();
    };

    const cerrarModalCamara = async () => {
        await detenerCamaraSegura();
        setModalCamaraAbierto(false);
    };

    // Control de la cámara Web para escaneo QR
    useEffect(() => {
        if (!modalCamaraAbierto) {
            return;
        }

        let isMounted = true;
        const startScanner = async () => {
            try {
                // Esperar a que el elemento DOM del modal exista
                await new Promise((r) => setTimeout(r, 300));
                if (!isMounted) return;

                const container = document.getElementById('qr-reader-container');
                if (!container) return;

                const scanner = new Html5Qrcode('qr-reader-container');
                html5QrCodeRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 15,
                        disableFlip: false,
                        qrbox: (vw, vh) => {
                            const s = Math.floor(Math.min(vw, vh) * 0.82);
                            return { width: Math.max(220, s), height: Math.max(220, s) };
                        },
                    },
                    (decodedText) => {
                        // QR detectado con éxito
                        cerrarModalCamara();
                        procesarEscaneoRapido(decodedText);
                    },
                    () => {}
                );

                // Si el modal se cerró mientras la cámara terminaba de inicializar, apagarla de inmediato
                if (!isMounted) {
                    await detenerCamaraSegura();
                }
            } catch (err) {
                console.error('Error al inicializar cámara QR:', err);
                notifications.show({
                    title: 'Cámara no disponible',
                    message: 'No se pudo acceder a la cámara web. Puedes usar el lector de código de barras o búsqueda rápida.',
                    color: 'orange'
                });
                cerrarModalCamara();
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            detenerCamaraSegura();
        };
    }, [modalCamaraAbierto]);

    // Autocompletado de búsqueda con debounce para nombres
    useEffect(() => {
        const query = busqueda.trim();
        // Si parece un payload QR de ráfaga o ID exacto (#00001), no buscar en vivo por letras
        if (query.startsWith('APEXGYM|') || query.startsWith('APX-')) {
            setResultadosBusqueda([]);
            setMostrarResultados(false);
            return;
        }

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

    // Activar semáforo visual con auto-ocultamiento programado
    const mostrarSemaforo = (datos) => {
        if (temporizadorSemaforo) clearTimeout(temporizadorSemaforo);
        setResultadoSemaforo(datos);

        if (sonidoHabilitado) {
            reproducirSonidoAcceso(datos.acceso);
        }

        // Si el acceso fue autorizado, limpiar en 5 segundos automáticamente
        // Si fue denegado, dejarlo 7 segundos para que el recepcionista atienda la incidencia
        const duracion = datos.acceso ? 5000 : 7000;
        const timer = setTimeout(() => {
            setResultadoSemaforo(null);
            enfocarBusqueda();
        }, duracion);
        setTemporizadorSemaforo(timer);
    };

    // Procesar código inmediato (Pistola Láser USB, Escáner QR o Enter en campo)
    const procesarEscaneoRapido = async (codigoOTexto) => {
        const valor = (codigoOTexto || busqueda).trim();
        if (!valor) return;

        setBusqueda('');
        setMostrarResultados(false);
        setSocioSeleccionado(null);

        try {
            setBuscando(true);
            const res = await api.asistencia.escanearAcceso(valor, observacionesIngreso);

            if (res.responseFlag === 0 && res.data) {
                const data = res.data;
                const diasRestantes = data.diasRestantes ?? 0;
                const advertencia = data.acceso && diasRestantes <= 3;

                mostrarSemaforo({
                    acceso: data.acceso,
                    codigo: data.codigo,
                    mensaje: data.mensaje || (data.acceso ? 'Acceso Autorizado' : 'Acceso Denegado'),
                    cliente: data.cliente,
                    membresia: data.membresia,
                    diasRestantes,
                    fechaExpiracion: data.fechaExpiracion,
                    advertencia,
                    metodo: valor.startsWith('APEXGYM|') || valor.startsWith('APX-') ? 'Pase QR' : 'Credencial / Código'
                });

                if (data.acceso) {
                    setRefreshHistorialKey((k) => k + 1);
                }
            } else {
                throw new Error(res.message || 'Error al validar código');
            }
        } catch (err) {
            console.error('Error en escaneo rápido:', err);
            mostrarSemaforo({
                acceso: false,
                codigo: 'ERROR',
                mensaje: err.message || 'Código no reconocido o socio inexistente',
                cliente: null,
                membresia: null
            });
        } finally {
            setBuscando(false);
            setObservacionesIngreso('');
            enfocarBusqueda();
        }
    };

    // Manejar presionar Enter en el input de búsqueda (pistola lectora o tecleo manual de ID)
    const handleKeyDownBusqueda = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = busqueda.trim();
            if (!query) return;

            // Si hay un solo resultado desplegado y coincide con la búsqueda
            if (resultadosBusqueda.length === 1 && mostrarResultados) {
                seleccionarSocio(resultadosBusqueda[0]);
            } else {
                // Procesar como escaneo rápido de código o ID
                procesarEscaneoRapido(query);
            }
        }
    };

    // Seleccionar socio desde la lista desplegable para revisión manual
    const seleccionarSocio = async (cliente) => {
        setSocioSeleccionado(cliente);
        setMostrarResultados(false);
        setBusqueda('');
        setObservacionesIngreso('');

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

                mostrarSemaforo({
                    acceso: true,
                    codigo: 'ACCESO_AUTORIZADO',
                    mensaje: 'Membresía Vigente - Listo para confirmar ingreso',
                    cliente,
                    membresia: membresiaActiva,
                    diasRestantes,
                    fechaExpiracion: membresiaActiva.fechaFin,
                    advertencia: diasRestantes <= 3,
                    metodo: 'Búsqueda Manual'
                });
            } else {
                const resHistorial = await api.clienteMembresia.obtenerHistorialPorCliente(cliente.id);
                const historial = Array.isArray(resHistorial.data) ? resHistorial.data : [];
                const ultima = historial.length > 0 ? historial[0] : null;

                let mensajeDetalle = 'Membresía Inexistente o Sin Asignar';
                if (ultima && ultima.fechaFin) {
                    const f = new Date(ultima.fechaFin);
                    const d = String(f.getUTCDate()).padStart(2, '0');
                    const m = String(f.getUTCMonth() + 1).padStart(2, '0');
                    const y = f.getUTCFullYear();
                    mensajeDetalle = `Membresía Vencida el ${d}/${m}/${y}`;
                }

                mostrarSemaforo({
                    acceso: false,
                    codigo: 'ACCESO_DENEGADO',
                    mensaje: `Acceso Denegado - ${mensajeDetalle}`,
                    cliente,
                    membresia: ultima,
                    diasRestantes: 0,
                    fechaExpiracion: ultima?.fechaFin || null,
                    advertencia: false,
                    metodo: 'Búsqueda Manual'
                });
            }
        } catch (err) {
            console.error('Error pre-validando membresía:', err);
            mostrarSemaforo({
                acceso: false,
                codigo: 'ERROR',
                mensaje: 'Error al verificar vigencia de membresía',
                cliente
            });
        } finally {
            setValidandoMembresia(false);
        }
    };

    // Confirmar ingreso manual de socio previamente seleccionado
    const confirmarIngresoManual = async () => {
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

                setSocioSeleccionado(null);
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
        setResultadoSemaforo(null);
        setObservacionesIngreso('');
        enfocarBusqueda();
    };

    const formatoIdentificador = (id) => `#${String(id || 0).padStart(5, '0')}`;

    return (
        <Stack gap="md">
            {/* Barra superior unificada estilo CRUD */}
            <EncabezadoTabla
                title="Control de Accesos y Visitas"
                icon={IconShieldCheck}
                rightContent={(
                    <Group gap="xs" wrap="wrap">
                        <Tooltip label={sonidoHabilitado ? 'Silenciar alertas de acceso' : 'Habilitar sonido de semáforo'} withArrow>
                            <ActionIcon
                                size={38}
                                radius="md"
                                variant="light"
                                color={sonidoHabilitado ? 'apex' : 'gray'}
                                onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
                                aria-label={sonidoHabilitado ? 'Silenciar alertas de acceso' : 'Habilitar sonido de semáforo'}
                            >
                                {sonidoHabilitado ? <IconVolume size={19} /> : <IconVolumeOff size={19} />}
                            </ActionIcon>
                        </Tooltip>

                        <Button
                            variant="default"
                            size="sm"
                            radius="md"
                            leftSection={<IconCamera size={17} />}
                            onClick={() => setModalCamaraAbierto(true)}
                        >
                            Escanear QR
                        </Button>

                        <Button
                            color="apex"
                            size="sm"
                            radius="md"
                            leftSection={<IconUserPlus size={17} />}
                            onClick={() => setDrawerVisitaAbierto(true)}
                        >
                            Registrar Visita
                        </Button>
                    </Group>
                )}
            />

            {/* Pestañas: Recepción vs Historial y Aforo */}
            <Tabs value={tabActiva} onChange={setTabActiva} color="apex" variant="outline" radius="md">
                <Tabs.List style={{ marginBottom: 16 }}>
                    <Tabs.Tab value="recepcion" leftSection={<IconIdBadge2 size={18} />}>
                        Control de Entrada (Recepción & Semáforo)
                    </Tabs.Tab>
                    <Tabs.Tab value="historial" leftSection={<IconHistory size={18} />}>
                        Historial y Aforo
                    </Tabs.Tab>
                </Tabs.List>

                {/* ─── TAB 1: RECEPCIÓN Y ENTRADA ───────────────────────────────────── */}
                <Tabs.Panel value="recepcion">
                    <Stack gap="lg">
                        {/* ─── SEMÁFORO VISUAL PROMINENTE (FLASH BANNER) ─── */}
                        {resultadoSemaforo && (
                            <Paper
                                p="lg"
                                radius="md"
                                shadow="md"
                                withBorder
                                style={{
                                    backgroundColor: resultadoSemaforo.acceso ? '#f0fdf4' : '#fef2f2',
                                    borderColor: resultadoSemaforo.acceso ? '#86efac' : '#fca5a5',
                                    borderLeft: `10px solid ${resultadoSemaforo.acceso ? '#16a34a' : '#dc2626'}`,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                                    <Group gap="md">
                                        <ThemeIcon
                                            size={60}
                                            radius="xl"
                                            variant="filled"
                                            color={resultadoSemaforo.acceso ? 'green' : 'red'}
                                            style={{
                                                boxShadow: `0 0 20px ${resultadoSemaforo.acceso ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'}`
                                            }}
                                        >
                                            {resultadoSemaforo.acceso ? (
                                                <IconCircleCheck size={40} />
                                            ) : (
                                                <IconCircleX size={40} />
                                            )}
                                        </ThemeIcon>

                                        <div>
                                            <Group gap="xs" mb={4}>
                                                <Badge
                                                    size="md"
                                                    variant="filled"
                                                    color={resultadoSemaforo.acceso ? 'green' : 'red'}
                                                >
                                                    {resultadoSemaforo.acceso ? 'ACCESO AUTORIZADO' : 'ACCESO DENEGADO'}
                                                </Badge>
                                                {resultadoSemaforo.metodo && (
                                                    <Badge size="sm" variant="light" color="gray">
                                                        {resultadoSemaforo.metodo}
                                                    </Badge>
                                                )}
                                                {resultadoSemaforo.advertencia && (
                                                    <Badge size="sm" variant="filled" color="yellow" leftSection={<IconAlertTriangle size={12} />}>
                                                        ¡Vence pronto!
                                                    </Badge>
                                                )}
                                            </Group>

                                            <Title order={3} c={resultadoSemaforo.acceso ? 'green.9' : 'red.9'}>
                                                {resultadoSemaforo.mensaje}
                                            </Title>

                                            {resultadoSemaforo.cliente && (
                                                <Text size="sm" fw={600} c="dark" mt={2}>
                                                    Socio: {resultadoSemaforo.cliente.nombre} {resultadoSemaforo.cliente.apellidoPaterno} {resultadoSemaforo.cliente.apellidoMaterno || ''} ({formatoIdentificador(resultadoSemaforo.cliente.id)})
                                                </Text>
                                            )}

                                            {resultadoSemaforo.membresia && resultadoSemaforo.acceso && (
                                                <Group gap="md" mt={4}>
                                                    <Text size="xs" c="dimmed">
                                                        Plan: <b>{resultadoSemaforo.membresia.tipoMembresia?.nombre || 'General'}</b>
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        Vence el:{' '}
                                                        <b>
                                                            {new Date(resultadoSemaforo.fechaExpiracion).toLocaleDateString('es-MX', { timeZone: 'UTC' })}
                                                        </b>{' '}
                                                        ({resultadoSemaforo.diasRestantes === 0 ? 'Hoy' : `${resultadoSemaforo.diasRestantes} días restantes`})
                                                    </Text>
                                                </Group>
                                            )}
                                        </div>
                                    </Group>

                                    <Button
                                        variant="subtle"
                                        color={resultadoSemaforo.acceso ? 'green' : 'red'}
                                        onClick={() => setResultadoSemaforo(null)}
                                        size="sm"
                                    >
                                        Cerrar Semáforo
                                    </Button>
                                </Group>
                            </Paper>
                        )}

                        {/* Input Principal de Escaneo Rápido / Búsqueda */}
                        <Paper p="lg" radius="md" withBorder style={{ position: 'relative' }}>
                            <Group justify="space-between" align="center" mb="xs">
                                <div>
                                    <Text fw={700} size="md">
                                        Terminal de Entrada y Lector de Códigos
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        Escanea con la pistola lectora de código QR / barras o busca por nombre, teléfono o ID de socio (#00042).
                                    </Text>
                                </div>

                                <Group gap="xs">
                                    <Badge variant="outline" color="apex" leftSection={<IconBarcode size={14} />}>
                                        Lector USB Activo
                                    </Badge>
                                    <Badge variant="outline" color="blue" leftSection={<IconQrcode size={14} />}>
                                        QR Scan & Go
                                    </Badge>
                                </Group>
                            </Group>

                            <Group gap="sm" mt="sm">
                                <TextInput
                                    ref={inputBusquedaRef}
                                    placeholder="Escanea el código QR, credencial o escribe el nombre del socio..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                                    onKeyDown={handleKeyDownBusqueda}
                                    leftSection={<IconSearch size={20} color="#FF6A00" />}
                                    rightSection={
                                        buscando ? (
                                            <IconRefresh size={18} className="mantine-rotate" />
                                        ) : busqueda ? (
                                            <ActionIcon size="sm" variant="subtle" onClick={() => setBusqueda('')}>
                                                ✕
                                            </ActionIcon>
                                        ) : null
                                    }
                                    size="lg"
                                    radius="md"
                                    style={{ flex: 1 }}
                                    autoFocus
                                />

                                <Button
                                    size="lg"
                                    color="apex"
                                    onClick={() => procesarEscaneoRapido(busqueda)}
                                    loading={buscando}
                                    disabled={!busqueda.trim()}
                                >
                                    Validar Entrada
                                </Button>
                            </Group>

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
                                            No se encontraron socios con ese término. Puedes presionar [Enter] para validarlo como código directo.
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

                        {/* Tarjeta de Confirmación Manual del Socio (si fue seleccionado por búsqueda) */}
                        {socioSeleccionado && (
                            <Paper
                                p="lg"
                                radius="md"
                                withBorder
                                style={{
                                    borderTop: `6px solid ${
                                        resultadoSemaforo?.acceso ? '#2b8a3e' : '#c92a2a'
                                    }`,
                                    backgroundColor: '#ffffff'
                                }}
                            >
                                <LoadingOverlay visible={validandoMembresia} overlayProps={{ blur: 1 }} />

                                <Group justify="space-between" align="flex-start" mb="md">
                                    <Group gap="md">
                                        <Avatar
                                            src={socioSeleccionado.usuario?.fotoUrl || null}
                                            size={72}
                                            radius="xl"
                                            color="apex"
                                            style={{
                                                border: `3px solid ${
                                                    resultadoSemaforo?.acceso ? '#2b8a3e' : '#c92a2a'
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

                                <Textarea
                                    label="Observaciones de ingreso"
                                    placeholder="Incidencia, casillero asignado o nota del recepcionista (opcional)"
                                    value={observacionesIngreso}
                                    onChange={(e) => setObservacionesIngreso(e.currentTarget.value)}
                                    minRows={2}
                                    mb="md"
                                    leftSection={<IconNotes size={16} stroke={1.5} />}
                                />

                                <Group justify="space-between" mt="md">
                                    <Button variant="default" onClick={cancelarSeleccion}>
                                        Cancelar
                                    </Button>

                                    <Button
                                        size="md"
                                        color={resultadoSemaforo?.acceso ? 'green' : 'red'}
                                        disabled={!resultadoSemaforo?.acceso}
                                        loading={registrandoIngreso}
                                        leftSection={<IconCheck size={20} />}
                                        onClick={confirmarIngresoManual}
                                    >
                                        {resultadoSemaforo?.acceso
                                            ? 'Confirmar Ingreso (Registrar Asistencia)'
                                            : 'Ingreso Bloqueado (Membresía No Válida)'}
                                    </Button>
                                </Group>
                            </Paper>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* ─── TAB 2: HISTORIAL Y AFORO ───────────────────────────────────────── */}
                <Tabs.Panel value="historial">
                    <HistorialAsistencias refreshKey={refreshHistorialKey} />
                </Tabs.Panel>
            </Tabs>

            {/* Modal de Cámara Web para Escaneo de Códigos QR */}
            <Modal
                opened={modalCamaraAbierto}
                onClose={cerrarModalCamara}
                title={
                    <Group gap="xs">
                        <IconQrcode size={22} color="#ffffff" />
                        <Text fw={700} size="md" c="#ffffff">Escanear Pase QR con Cámara</Text>
                    </Group>
                }
                size="md"
                centered
            >
                <Stack gap="md" align="center">
                    <Text size="xs" c="dimmed" ta="center">
                        Coloca el código QR frente a la cámara web. El sistema lo detectará automáticamente.
                    </Text>

                    <style>{`#qr-reader-container video { transform: scaleX(-1); }`}</style>
                    <div
                        id="qr-reader-container"
                        style={{
                            width: '100%',
                            minHeight: 280,
                            borderRadius: 8,
                            overflow: 'hidden',
                            backgroundColor: '#000000'
                        }}
                    />

                    <Button variant="default" onClick={cerrarModalCamara} fullWidth>
                        Cancelar Escaneo
                    </Button>
                </Stack>
            </Modal>

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
