import { useEffect, useState, useRef, useMemo } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Divider,
    Drawer,
    Grid,
    Group,
    NumberInput,
    Paper,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconArrowBackUp,
    IconArrowLeft,
    IconCash,
    IconCheck,
    IconClock,
    IconCreditCard,
    IconDeviceFloppy,
    IconDeviceMobile,
    IconExternalLink,
    IconEye,
    IconInfoCircle,
    IconPlus,
    IconReceipt,
    IconRefresh,
    IconRotateClockwise,
    IconShieldCheck,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';
import { SectionCard } from '../../components/SectionCard/SectionCard.jsx';
import classes from './SimuladorPagos.module.css';

const COLUMNAS = [
    { key: 'numero', label: '#', sortable: true, filterable: true },
    { key: 'concepto', label: 'Concepto / Venta', sortable: true, filterable: true },
    { key: 'metodo', label: 'Método / Instrumento', sortable: true, filterable: true },
    { key: 'montoTexto', label: 'Monto', sortable: true, filterable: true },
    { key: 'estadoBadge', label: 'Estado', sortable: true, filterable: true },
    { key: 'fechaTexto', label: 'Fecha', sortable: true, filterable: true },
];

export function SimuladorPagos() {
    cambioNombreWeb('Caja y Transacciones de Pago');

    const [cargando, setCargando] = useState(false);
    const [cargandoAccion, setCargandoAccion] = useState(false);
    const [resumen, setResumen] = useState({ totalAprobado: 0, totalPendiente: 0, totalReembolsado: 0 });
    const [transacciones, setTransacciones] = useState([]);

    // Drawers del sistema
    const [drawerNuevoCobroAbierto, setDrawerNuevoCobroAbierto] = useState(false);
    const [transaccionDetalle, setTransaccionDetalle] = useState(null);

    // Formulario de Cobro
    const [concepto, setConcepto] = useState('Membresía Mensual ApexGym');
    const [monto, setMonto] = useState(10.00);
    const [correo, setCorreo] = useState('');
    const [metodo, setMetodo] = useState('DIGITAL'); // 'EFECTIVO' | 'TERMINAL' | 'DIGITAL'

    // Detalles de Terminal
    const [tipoTarjeta, setTipoTarjeta] = useState('DEBITO'); // 'DEBITO' | 'CREDITO'
    const [marcaTarjeta, setMarcaTarjeta] = useState('VISA'); // 'VISA' | 'MASTERCARD' | 'AMEX'
    const [ultimosDigitos, setUltimosDigitos] = useState('4512');
    const [folioVoucher, setFolioVoucher] = useState(() => `AUTH-${Math.floor(100000 + Math.random() * 900000)}`);

    // Efectivo
    const [montoEfectivo, setMontoEfectivo] = useState(600.00);

    // Llave de idempotencia y bloqueo sincrónico
    const [idempotenciaKey, setIdempotenciaKey] = useState(() => crypto.randomUUID());
    const procesandoEnvioRef = useRef(false);

    // Cargar datos del servidor
    const cargarDatos = async () => {
        try {
            setCargando(true);
            const [respResumen, respTrans] = await Promise.all([
                api.pagos.obtenerResumen().catch(() => null),
                api.pagos.obtenerTransacciones().catch(() => null),
            ]);

            const resumenData = respResumen?.data || respResumen;
            if (resumenData && typeof resumenData === 'object') {
                setResumen(resumenData);
            }

            const listaTrans = Array.isArray(respTrans?.data)
                ? respTrans.data
                : Array.isArray(respTrans)
                ? respTrans
                : [];
            setTransacciones(listaTrans);
        } catch (error) {
            notifications.show({
                title: 'Error de sincronización',
                message: error?.message || 'No se pudieron obtener las transacciones',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Preparar y abrir Drawer para un nuevo cobro
    const abrirNuevoCobro = () => {
        setIdempotenciaKey(crypto.randomUUID());
        setFolioVoucher(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
        setUltimosDigitos(String(Math.floor(1000 + Math.random() * 9000)));
        setDrawerNuevoCobroAbierto(true);
    };

    // Cálculos de efectivo y cambio
    const montoCobroNum = Number(monto) || 0;
    const efectivoRecibidoNum = Number(montoEfectivo) || 0;
    const esEfectivoInsuficiente = metodo === 'EFECTIVO' && efectivoRecibidoNum < montoCobroNum;
    const cambioEfectivo = Math.max(0, efectivoRecibidoNum - montoCobroNum);
    const montoFaltante = Math.max(0, montoCobroNum - efectivoRecibidoNum);

    // Ejecutar cobro desde el Drawer
    const ejecutarCobro = async () => {
        if (procesandoEnvioRef.current) return;
        procesandoEnvioRef.current = true;

        if (!concepto.trim()) {
            procesandoEnvioRef.current = false;
            notifications.show({ title: 'Atención', message: 'Indica el concepto de la venta', color: 'yellow', icon: <IconAlertCircle size={18} /> });
            return;
        }
        if (!monto || monto <= 0) {
            procesandoEnvioRef.current = false;
            notifications.show({ title: 'Atención', message: 'El monto debe ser mayor a cero', color: 'yellow', icon: <IconAlertCircle size={18} /> });
            return;
        }

        try {
            setCargandoAccion(true);
            let proveedor = 'SANDBOX_SIMULADO';
            let folio = null;

            if (metodo === 'EFECTIVO') {
                if (esEfectivoInsuficiente) {
                    procesandoEnvioRef.current = false;
                    setCargandoAccion(false);
                    notifications.show({
                        title: 'Efectivo insuficiente',
                        message: `Faltan $${montoFaltante.toFixed(2)} MXN para cubrir la venta.`,
                        color: 'red',
                        icon: <IconAlertCircle size={18} />,
                    });
                    return;
                }
                proveedor = 'EFECTIVO';
            } else if (metodo === 'TERMINAL') {
                if (!folioVoucher.trim()) {
                    procesandoEnvioRef.current = false;
                    setCargandoAccion(false);
                    notifications.show({ title: 'Atención', message: 'Ingresa el folio de autorización del voucher', color: 'yellow', icon: <IconAlertCircle size={18} /> });
                    return;
                }
                proveedor = 'TERMINAL_MANUAL';
                folio = folioVoucher;
            } else if (metodo === 'DIGITAL') {
                proveedor = 'MERCADO_PAGO';
            }

            const llaveAEnviar = idempotenciaKey || crypto.randomUUID();

            const payload = {
                concepto,
                monto,
                correoCliente: correo,
                proveedor,
                folioVoucher: folio,
                tipoTarjeta: metodo !== 'EFECTIVO' ? tipoTarjeta : null,
                marcaTarjeta: metodo !== 'EFECTIVO' ? marcaTarjeta : null,
                ultimosDigitos: metodo !== 'EFECTIVO' ? ultimosDigitos : null,
                uuidIdempotencia: llaveAEnviar,
                metadatos: {
                    efectivoRecibido: metodo === 'EFECTIVO' ? efectivoRecibidoNum : null,
                    cambioEntregado: metodo === 'EFECTIVO' ? cambioEfectivo : null,
                },
            };

            const respuesta = await api.pagos.crearCobro(payload, llaveAEnviar);
            const data = respuesta?.data || respuesta;
            const trans = data?.transaccion || data;

            if (trans && trans.id) {
                notifications.show({
                    title: data.idempotente ? 'Cobro Idempotente Detectado' : 'Cobro Registrado',
                    message: data.mensaje || (data.idempotente ? 'Se evitó el doble cobro recuperando la transacción existente' : 'Pago procesado satisfactoriamente'),
                    color: data.idempotente ? 'yellow' : trans.estado === 'APROBADO' ? 'teal' : 'blue',
                    icon: <IconCheck size={18} />,
                });

                setDrawerNuevoCobroAbierto(false);
                setTransaccionDetalle(trans);
            }

            await cargarDatos();
        } catch (error) {
            notifications.show({
                title: 'Error al procesar el cobro',
                message: error?.response?.data?.message || error?.message || 'Error en la petición',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setCargandoAccion(false);
            setTimeout(() => {
                procesandoEnvioRef.current = false;
            }, 500);
        }
    };

    // Simular resolución de la pasarela bancaria
    const simularEstado = async (nuevoEstado) => {
        if (!transaccionDetalle?.id) return;
        try {
            setCargandoAccion(true);
            const resp = await api.pagos.simularResolucion(transaccionDetalle.id, nuevoEstado);
            const data = resp?.data || resp;
            const trans = data?.transaccion || data;

            if (trans && trans.id) {
                setTransaccionDetalle(trans);
                notifications.show({
                    title: `Simulación: ${nuevoEstado}`,
                    message: data?.mensaje || `Transacción actualizada a ${nuevoEstado}`,
                    color: nuevoEstado === 'APROBADO' ? 'teal' : 'red',
                    icon: nuevoEstado === 'APROBADO' ? <IconCheck size={18} /> : <IconX size={18} />,
                });
            }
            await cargarDatos();
        } catch (error) {
            notifications.show({
                title: 'Error de simulación',
                message: error?.message || 'No se pudo resolver el pago',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setCargandoAccion(false);
        }
    };

    // Reembolsar transacción
    const ejecutarReembolso = async (id) => {
        try {
            setCargandoAccion(true);
            const resp = await api.pagos.reembolsar(id, 'Reembolso administrativo desde auditoría');
            const data = resp?.data || resp;
            const trans = data?.transaccion || data;

            notifications.show({
                title: 'Reembolso completado',
                message: data?.mensaje || 'Transacción devuelta exitosamente',
                color: 'orange',
                icon: <IconArrowBackUp size={18} />,
            });

            if (transaccionDetalle?.id === id && trans && trans.id) {
                setTransaccionDetalle(trans);
            }
            await cargarDatos();
        } catch (error) {
            notifications.show({
                title: 'Error al reembolsar',
                message: error?.message || 'No se pudo realizar el reverso',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setCargandoAccion(false);
        }
    };

    // Formateador de badges de estado
    const renderBadgeEstado = (estado) => {
        switch (estado) {
            case 'APROBADO':
                return <Badge color="teal" variant="filled" size="sm" radius="sm" leftSection={<IconCheck size={12} />}>APROBADO</Badge>;
            case 'PENDIENTE':
                return <Badge color="yellow" variant="filled" size="sm" radius="sm" leftSection={<IconClock size={12} />}>PENDIENTE</Badge>;
            case 'RECHAZADO':
                return <Badge color="red" variant="filled" size="sm" radius="sm" leftSection={<IconX size={12} />}>RECHAZADO</Badge>;
            case 'REEMBOLSADO':
                return <Badge color="gray" variant="filled" size="sm" radius="sm" leftSection={<IconArrowBackUp size={12} />}>REEMBOLSADO</Badge>;
            default:
                return <Badge color="dark" size="sm" radius="sm">{estado}</Badge>;
        }
    };

    // Formateador del método de pago
    const renderMetodoDetalle = (t) => {
        let meta = {};
        if (t.metadatos) {
            try {
                meta = typeof t.metadatos === 'string' ? JSON.parse(t.metadatos) : t.metadatos;
            } catch {
                meta = {};
            }
        }

        const tipo = meta.tipoTarjeta || (t.proveedor === 'TERMINAL_MANUAL' ? 'Tarjeta' : null);
        const marca = meta.marcaTarjeta || '';
        const ultimos = meta.ultimosDigitos ? `****${meta.ultimosDigitos}` : '';

        if (t.proveedor === 'EFECTIVO') {
            return (
                <Badge color="teal" variant="light" size="sm" radius="sm" leftSection={<IconCash size={12} />}>
                    Efectivo
                </Badge>
            );
        }

        if (t.proveedor === 'TERMINAL_MANUAL') {
            const etiqueta = tipo ? `Terminal ${tipo}` : 'Terminal Física';
            const detalle = [marca, ultimos].filter(Boolean).join(' ');
            return (
                <Stack gap={2}>
                    <Badge color="blue" variant="light" size="sm" radius="sm" leftSection={<IconCreditCard size={12} />}>
                        {etiqueta}
                    </Badge>
                    {detalle && <Text size="xs" c="dimmed">{detalle}</Text>}
                </Stack>
            );
        }

        const etiquetaDigital = tipo ? `Digital ${tipo}` : 'En Línea';
        const detalleDigital = [marca, ultimos].filter(Boolean).join(' ');
        return (
            <Stack gap={2}>
                <Badge color="violet" variant="light" size="sm" radius="sm" leftSection={<IconDeviceMobile size={12} />}>
                    {etiquetaDigital}
                </Badge>
                {detalleDigital && <Text size="xs" c="dimmed">{detalleDigital}</Text>}
            </Stack>
        );
    };

    // Mapeo oficial de datos para la TablaRegistros de ApexGym
    const tableData = useMemo(() => {
        return transacciones.map((t) => ({
            id: t.id,
            _recordOriginal: t,
            numero: `#${t.id}`,
            concepto: (
                <div>
                    <Text size="sm" fw={600} c="#1E293B">
                        {t.concepto}
                    </Text>
                    {t.folioVoucher && (
                        <Text size="xs" c="dimmed">
                            Folio: {t.folioVoucher}
                        </Text>
                    )}
                </div>
            ),
            metodo: renderMetodoDetalle(t),
            montoTexto: `$${Number(t.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
            estadoBadge: renderBadgeEstado(t.estado),
            fechaTexto: t.createdAt && !isNaN(new Date(t.createdAt).getTime())
                ? new Date(t.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                : 'Reciente',
        }));
    }, [transacciones]);

    return (
        <div className={classes.layout}>
            {/* Encabezado Unificado Oficial ApexGym */}
            <div className={classes.unifiedHeader}>
                <Group gap="sm" align="center">
                    <IconCreditCard
                        size={38}
                        stroke={1.8}
                        color="var(--mantine-color-secondary-6)"
                    />
                    <Divider orientation="vertical" color="secondary.9" size="2" />
                    <div>
                        <Group gap="xs" align="center">
                            <Title order={2} className={classes.unifiedTitle}>
                                Caja y Transacciones de Pago
                            </Title>
                            <Badge color="apex" variant="light" size="sm" radius="sm">
                                MODO EXPERIMENTAL
                            </Badge>
                        </Group>
                        <Text c="dimmed" size="xs">
                            Control de cobros en mostrador: Efectivo, Terminales Bancarias y Pasarela en Línea
                        </Text>
                    </div>
                </Group>

                <Group gap="sm">
                    <Button
                        variant="default"
                        radius="md"
                        leftSection={<IconRefresh size={16} />}
                        onClick={cargarDatos}
                        loading={cargando}
                    >
                        Recargar
                    </Button>
                    <ActionIcon
                        className={classes.addButtonUnified}
                        onClick={abrirNuevoCobro}
                        aria-label="Registrar nuevo cobro"
                        size={42}
                        radius="xl"
                        color="apex"
                        variant="filled"
                    >
                        <IconPlus size={20} stroke={2.5} />
                    </ActionIcon>
                </Group>
            </div>

            {/* Tarjetas de Métricas de Auditoría */}
            <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Paper className={classes.statCard}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                    Total Cobrado
                                </Text>
                                <Text className={classes.statValue} c="teal.8">
                                    ${Number(resumen?.totalAprobado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Pagos liquidados con éxito
                                </Text>
                            </div>
                            <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                                <IconCheck size={20} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Paper className={classes.statCard}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                    Total Pendiente
                                </Text>
                                <Text className={classes.statValue} c="yellow.8">
                                    ${Number(resumen?.totalPendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                </Text>
                                <Text size="xs" c="dimmed">
                                    En espera de confirmación bancaria
                                </Text>
                            </div>
                            <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
                                <IconClock size={20} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Paper className={classes.statCard}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                    Total Reembolsos
                                </Text>
                                <Text className={classes.statValue} c="dimmed">
                                    ${Number(resumen?.totalReembolsado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Devoluciones registradas en auditoría
                                </Text>
                            </div>
                            <ThemeIcon color="gray" variant="light" size="lg" radius="md">
                                <IconArrowBackUp size={20} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Tabla Principal Oficial de ApexGym con Búsqueda, Filtros y Paginación */}
            <TablaRegistros
                data={tableData}
                columns={COLUMNAS}
                loading={cargando}
                onReload={cargarDatos}
                entityLabel="transacción"
                initialSortBy="numero"
                initialSortDirection="desc"
                headerVariant="neutral"
                pageSizeOptions={[6, 12, 18, 24]}
                renderAcciones={(fila, recordOriginal) => {
                    const t = recordOriginal ?? fila._recordOriginal ?? fila;
                    return (
                        <Group gap={6} wrap="nowrap" justify="flex-end">
                            <Tooltip label="Ver detalle y auditoría" withArrow openDelay={200}>
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="lg"
                                    radius="md"
                                    aria-label="Ver detalle"
                                    onClick={() => setTransaccionDetalle(t)}
                                >
                                    <IconEye size={18} stroke={1.8} />
                                </ActionIcon>
                            </Tooltip>
                            {t.estado === 'APROBADO' && (
                                <Tooltip label="Probar reembolso contable" withArrow openDelay={200}>
                                    <ActionIcon
                                        variant="light"
                                        color="orange"
                                        size="lg"
                                        radius="md"
                                        aria-label="Reembolsar"
                                        onClick={() => ejecutarReembolso(t.id)}
                                        loading={cargandoAccion}
                                    >
                                        <IconArrowBackUp size={18} stroke={1.8} />
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </Group>
                    );
                }}
            />

            {/* ── Drawer Lateral Oficial: Registro de Nuevo Cobro ── */}
            <Drawer
                opened={drawerNuevoCobroAbierto}
                onClose={() => !cargandoAccion && setDrawerNuevoCobroAbierto(false)}
                position="right"
                size={680}
                title={
                    <Group gap="sm">
                        <IconCreditCard
                            size={32}
                            stroke={1.8}
                            color="var(--ag-color-secondary)"
                        />
                        <Divider orientation="vertical" color="secondary.9" size="2" />
                        <div>
                            <Title order={4} fw={700} c="#1E293B">
                                Nuevo Cobro en Caja
                            </Title>
                            <Text size="xs" c="dimmed">
                                Completa los datos de la orden y el método de pago seleccionado.
                            </Text>
                        </div>
                    </Group>
                }
                overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
                zIndex={999999}
                styles={{
                    content: {
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    },
                    header: {
                        borderBottom: '1px solid #E2E8F0',
                        paddingBottom: 16,
                        marginBottom: 0,
                    },
                    body: {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px 24px 0 24px',
                    },
                }}
            >
                <div className={classes.drawerContent}>
                    {/* Sección 1: Datos de la Venta */}
                    <SectionCard
                        icon={<IconReceipt size={18} />}
                        title="1. Datos de la Venta / Orden"
                        subtitle="Concepto, importe y cliente"
                    >
                        <Stack gap="sm" p="md">
                            <TextInput
                                label="Concepto del cobro"
                                placeholder="Ej. Membresía Mensual ApexGym"
                                value={concepto}
                                onChange={(e) => setConcepto(e.currentTarget.value)}
                                withAsterisk
                                required
                            />
                            <Group grow>
                                <NumberInput
                                    label="Monto a Cobrar"
                                    value={monto}
                                    onChange={(val) => setMonto(Number(val) || 0)}
                                    prefix="$"
                                    suffix=" MXN"
                                    min={1}
                                    decimalScale={2}
                                    withAsterisk
                                    required
                                />
                                <TextInput
                                    label="Correo del Socio (Opcional)"
                                    placeholder="ejemplo@gmail.com"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.currentTarget.value)}
                                    leftSection={<IconUser size={16} />}
                                />
                            </Group>
                        </Stack>
                    </SectionCard>

                    {/* Sección 2: Método de Pago */}
                    <SectionCard
                        icon={<IconCreditCard size={18} />}
                        title="2. Forma de Pago y Liquidación"
                        subtitle="Efectivo en caja, terminal en mostrador o pasarela en línea"
                    >
                        <Stack gap="sm" p="md">
                            <SegmentedControl
                                value={metodo}
                                onChange={setMetodo}
                                color="apex"
                                radius="md"
                                data={[
                                    { label: 'Efectivo', value: 'EFECTIVO' },
                                    { label: 'Tarjeta en Terminal', value: 'TERMINAL' },
                                    { label: 'Cobro Digital (En línea)', value: 'DIGITAL' },
                                ]}
                                fullWidth
                            />

                            {/* Opcion Efectivo */}
                            {metodo === 'EFECTIVO' && (
                                <Paper className={classes.paymentOptionCard}>
                                    <Stack gap="xs">
                                        <Group justify="space-between">
                                            <Text size="sm" fw={600} c="#1E293B">
                                                Cobro en Efectivo
                                            </Text>
                                            <Badge color="teal" variant="light" size="sm" radius="sm" leftSection={<IconCash size={12} />}>
                                                Entrada de Caja
                                            </Badge>
                                        </Group>
                                        <Group grow align="flex-start">
                                            <NumberInput
                                                label="Efectivo Recibido"
                                                value={montoEfectivo}
                                                onChange={(val) => setMontoEfectivo(Number(val) || 0)}
                                                prefix="$"
                                                suffix=" MXN"
                                                min={0}
                                                decimalScale={2}
                                            />
                                            <div>
                                                <Text size="sm" fw={500} c="dimmed">
                                                    Cambio a Entregar
                                                </Text>
                                                <Text fw={800} fz="xl" c={!esEfectivoInsuficiente ? 'teal' : 'red'}>
                                                    ${cambioEfectivo.toFixed(2)} MXN
                                                </Text>
                                                {esEfectivoInsuficiente && (
                                                    <Text size="xs" c="red" fw={600}>
                                                        Faltan ${montoFaltante.toFixed(2)} MXN
                                                    </Text>
                                                )}
                                            </div>
                                        </Group>
                                        {esEfectivoInsuficiente && (
                                            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
                                                El monto recibido no cubre el importe total requerido.
                                            </Alert>
                                        )}
                                    </Stack>
                                </Paper>
                            )}

                            {/* Opcion Terminal */}
                            {metodo === 'TERMINAL' && (
                                <Paper className={classes.paymentOptionCard}>
                                    <Stack gap="sm">
                                        <Group justify="space-between">
                                            <Text size="sm" fw={600} c="#1E293B">
                                                Terminal Bancaria Física
                                            </Text>
                                            <Badge color="blue" variant="light" size="sm" radius="sm" leftSection={<IconCreditCard size={12} />}>
                                                Voucher Impreso
                                            </Badge>
                                        </Group>

                                        <Group grow>
                                            <div>
                                                <Text size="xs" fw={500} mb={4} c="dimmed">
                                                    Tipo de Tarjeta
                                                </Text>
                                                <SegmentedControl
                                                    value={tipoTarjeta}
                                                    onChange={setTipoTarjeta}
                                                    data={[
                                                        { label: 'Débito', value: 'DEBITO' },
                                                        { label: 'Crédito', value: 'CREDITO' },
                                                    ]}
                                                    fullWidth
                                                    size="xs"
                                                    radius="md"
                                                />
                                            </div>
                                            <div>
                                                <Text size="xs" fw={500} mb={4} c="dimmed">
                                                    Marca
                                                </Text>
                                                <SegmentedControl
                                                    value={marcaTarjeta}
                                                    onChange={setMarcaTarjeta}
                                                    data={[
                                                        { label: 'Visa', value: 'VISA' },
                                                        { label: 'Mastercard', value: 'MASTERCARD' },
                                                        { label: 'AMEX', value: 'AMEX' },
                                                    ]}
                                                    fullWidth
                                                    size="xs"
                                                    radius="md"
                                                />
                                            </div>
                                        </Group>

                                        <Group grow>
                                            <TextInput
                                                label="Folio / Autorización Voucher"
                                                placeholder="Ej. AUTH-98214"
                                                value={folioVoucher}
                                                onChange={(e) => setFolioVoucher(e.currentTarget.value)}
                                                withAsterisk
                                                required
                                            />
                                            <TextInput
                                                label="Últimos 4 Dígitos"
                                                placeholder="Ej. 4512"
                                                maxLength={4}
                                                value={ultimosDigitos}
                                                onChange={(e) => setUltimosDigitos(e.currentTarget.value.replace(/\D/g, ''))}
                                            />
                                        </Group>

                                        <Text size="xs" c="dimmed">
                                            El cajero cobra en la terminal de mostrador e ingresa los datos que imprimió el comprobante de papel.
                                        </Text>
                                    </Stack>
                                </Paper>
                            )}

                            {/* Opcion Digital */}
                            {metodo === 'DIGITAL' && (
                                <Paper className={classes.paymentOptionCard}>
                                    <Stack gap="sm">
                                        <Group justify="space-between">
                                            <Text size="sm" fw={600} c="#1E293B">
                                                Pasarela Digital En Línea
                                            </Text>
                                            <Badge color="violet" variant="light" size="sm" radius="sm" leftSection={<IconDeviceMobile size={12} />}>
                                                Móvil / Web
                                            </Badge>
                                        </Group>

                                        <Group grow>
                                            <div>
                                                <Text size="xs" fw={500} mb={4} c="dimmed">
                                                    Tipo de Tarjeta del Socio
                                                </Text>
                                                <SegmentedControl
                                                    value={tipoTarjeta}
                                                    onChange={setTipoTarjeta}
                                                    data={[
                                                        { label: 'Débito', value: 'DEBITO' },
                                                        { label: 'Crédito', value: 'CREDITO' },
                                                    ]}
                                                    fullWidth
                                                    size="xs"
                                                    radius="md"
                                                />
                                            </div>
                                            <div>
                                                <Text size="xs" fw={500} mb={4} c="dimmed">
                                                    Marca
                                                </Text>
                                                <SegmentedControl
                                                    value={marcaTarjeta}
                                                    onChange={setMarcaTarjeta}
                                                    data={[
                                                        { label: 'Visa', value: 'VISA' },
                                                        { label: 'Mastercard', value: 'MASTERCARD' },
                                                    ]}
                                                    fullWidth
                                                    size="xs"
                                                    radius="md"
                                                />
                                            </div>
                                        </Group>

                                        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                                            Genera la orden de cobro digital en espera de confirmación bancaria vía Webhook asíncrono.
                                        </Alert>
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>
                    </SectionCard>
                </div>

                {/* Sticky Footer del Drawer */}
                <Group
                    justify="flex-end"
                    gap="sm"
                    py="md"
                    style={{
                        borderTop: '1px solid #E2E8F0',
                        backgroundColor: 'var(--ag-color-surface-elevated, #ffffff)',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 10,
                        marginTop: 'auto',
                    }}
                >
                    <Button variant="default" radius="md" onClick={() => setDrawerNuevoCobroAbierto(false)}>
                        Cancelar
                    </Button>
                    <Button
                        className={classes.primaryButton}
                        radius="md"
                        color="apex"
                        leftSection={<IconDeviceFloppy size={18} />}
                        onClick={ejecutarCobro}
                        loading={cargandoAccion}
                        disabled={cargandoAccion || esEfectivoInsuficiente}
                    >
                        {metodo === 'EFECTIVO'
                            ? (esEfectivoInsuficiente ? `Faltan $${montoFaltante.toFixed(2)}` : 'Cobrar en Efectivo')
                            : metodo === 'TERMINAL'
                            ? `Registrar Tarjeta ${tipoTarjeta === 'DEBITO' ? 'Débito' : 'Crédito'}`
                            : `Generar Cobro Digital (${tipoTarjeta === 'DEBITO' ? 'Débito' : 'Crédito'})`}
                    </Button>
                </Group>
            </Drawer>

            {/* ── Drawer Lateral Oficial: Detalle y Monitor de Transacción ── */}
            <Drawer
                opened={Boolean(transaccionDetalle)}
                onClose={() => setTransaccionDetalle(null)}
                position="right"
                size={680}
                title={
                    <Group gap="sm">
                        <IconReceipt
                            size={32}
                            stroke={1.8}
                            color="var(--ag-color-secondary)"
                        />
                        <Divider orientation="vertical" color="secondary.9" size="2" />
                        <div>
                            <Group gap="xs" align="center">
                                <Title order={4} fw={700} c="#1E293B">
                                    Transacción #{transaccionDetalle?.id}
                                </Title>
                                {transaccionDetalle && renderBadgeEstado(transaccionDetalle.estado)}
                            </Group>
                            <Text size="xs" c="dimmed">
                                Desglose de liquidación contable y trazabilidad bancaria.
                            </Text>
                        </div>
                    </Group>
                }
                overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
                zIndex={999999}
                styles={{
                    content: {
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    },
                    header: {
                        borderBottom: '1px solid #E2E8F0',
                        paddingBottom: 16,
                        marginBottom: 0,
                    },
                    body: {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px 24px 0 24px',
                    },
                }}
            >
                {transaccionDetalle && (
                    <div className={classes.drawerContent}>
                        {/* Sección 1: Datos de la Orden */}
                        <SectionCard
                            icon={<IconReceipt size={18} />}
                            title="Resumen de la Operación"
                            subtitle="Detalles contables registrados"
                            rightAmount={`$${Number(transaccionDetalle.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
                            rightAmountColor={transaccionDetalle.estado === 'APROBADO' ? '#0CA678' : '#FF6A00'}
                        >
                            <Stack gap="xs" p="md">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Concepto:</Text>
                                    <Text size="sm" fw={600}>{transaccionDetalle.concepto}</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Fecha de Registro:</Text>
                                    <Text size="sm">
                                        {transaccionDetalle.createdAt && !isNaN(new Date(transaccionDetalle.createdAt).getTime())
                                            ? new Date(transaccionDetalle.createdAt).toLocaleString('es-MX')
                                            : 'Reciente'}
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Estado de Liquidación:</Text>
                                    {renderBadgeEstado(transaccionDetalle.estado)}
                                </Group>
                            </Stack>
                        </SectionCard>

                        {/* Sección 2: Método y Voucher */}
                        <SectionCard
                            icon={<IconCreditCard size={18} />}
                            title="Método de Pago y Conciliación"
                            subtitle="Comprobante y trazabilidad de caja"
                        >
                            <Stack gap="xs" p="md">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Instrumento:</Text>
                                    {renderMetodoDetalle(transaccionDetalle)}
                                </Group>
                                {transaccionDetalle.folioVoucher && (
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Folio Voucher Terminal:</Text>
                                        <Badge color="blue" variant="outline" size="sm">
                                            {transaccionDetalle.folioVoucher}
                                        </Badge>
                                    </Group>
                                )}
                            </Stack>
                        </SectionCard>

                        {/* Sección 3: Seguridad e Idempotencia */}
                        <SectionCard
                            icon={<IconShieldCheck size={18} />}
                            title="Trazabilidad e Idempotencia"
                            subtitle="Protección contra dobles cobros y transacciones duplicadas"
                        >
                            <Stack gap="xs" p="md">
                                <div>
                                    <Text size="xs" c="dimmed" mb={4}>
                                        Clave Única de Idempotencia (UUID):
                                    </Text>
                                    <span className={classes.idempotencyTag}>
                                        {transaccionDetalle.uuidIdempotencia}
                                    </span>
                                </div>
                                <Text size="xs" c="dimmed">
                                    Garantiza que peticiones repetidas o pérdidas de conexión en terminal retornen la misma orden sin duplicar cobros.
                                </Text>
                            </Stack>
                        </SectionCard>

                        {/* Botón para abrir Pasarela Oficial cuando hay URL generada */}
                        {transaccionDetalle.urlCheckout && (
                            <Button
                                component="a"
                                href={transaccionDetalle.urlCheckout}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="apex"
                                radius="md"
                                size="md"
                                leftSection={<IconExternalLink size={18} />}
                                fullWidth
                            >
                                {transaccionDetalle.proveedor === 'MERCADO_PAGO' || transaccionDetalle.metadatos?.pasarelaReal || transaccionDetalle.urlCheckout?.includes('mercadopago')
                                    ? 'Pagar en Pasarela Oficial Mercado Pago'
                                    : 'Abrir Portal de Cobro en Línea'}
                            </Button>
                        )}

                        {/* Panel Interactivo para Transacciones Pendientes */}
                        {transaccionDetalle.estado === 'PENDIENTE' && (
                            <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#F8FAFC' }}>
                                <Stack gap="xs">
                                    <Text size="sm" fw={700} c="secondary.6">
                                        Simulador Didáctico de Webhook Bancario:
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        Simula la respuesta que enviaría la pasarela o banco adquirente al autorizar o rechazar la orden:
                                    </Text>
                                    <Group grow>
                                        <Button
                                            color="teal"
                                            radius="md"
                                            leftSection={<IconCheck size={16} />}
                                            onClick={() => simularEstado('APROBADO')}
                                            loading={cargandoAccion}
                                        >
                                            Simular Pago Aprobado
                                        </Button>
                                        <Button
                                            color="red"
                                            variant="light"
                                            radius="md"
                                            leftSection={<IconX size={16} />}
                                            onClick={() => simularEstado('RECHAZADO')}
                                            loading={cargandoAccion}
                                        >
                                            Simular Rechazo
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}

                        {/* Acciones para Transacciones Aprobadas */}
                        {transaccionDetalle.estado === 'APROBADO' && (
                            <Alert color="teal" title="Transacción Liquidada" icon={<IconCheck size={16} />} radius="md">
                                El pago fue acreditado satisfactoriamente. Se encuentra disponible para reversos contables.
                                <Group mt="md">
                                    <Button
                                        size="xs"
                                        radius="md"
                                        color="orange"
                                        variant="light"
                                        leftSection={<IconArrowBackUp size={14} />}
                                        onClick={() => ejecutarReembolso(transaccionDetalle.id)}
                                        loading={cargandoAccion}
                                    >
                                        Probar Reembolso Contable
                                    </Button>
                                </Group>
                            </Alert>
                        )}

                        {transaccionDetalle.estado === 'REEMBOLSADO' && (
                            <Alert color="gray" title="Transacción Reembolsada" icon={<IconArrowBackUp size={16} />} radius="md">
                                Los fondos fueron devueltos al socio y la transacción quedó reversada en la contabilidad.
                            </Alert>
                        )}
                    </div>
                )}

                {/* Sticky Footer del Drawer de Detalle */}
                <Group
                    justify="flex-start"
                    pt="md"
                    style={{
                        borderTop: '1px solid #E2E8F0',
                        backgroundColor: 'var(--ag-color-surface-elevated, #ffffff)',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 10,
                        marginTop: 'auto',
                    }}
                >
                    <Button
                        variant="default"
                        radius="md"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => setTransaccionDetalle(null)}
                    >
                        Volver
                    </Button>
                </Group>
            </Drawer>
        </div>
    );
}

export default SimuladorPagos;
