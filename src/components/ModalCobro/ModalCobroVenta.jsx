import { useState, useEffect, useRef } from 'react';
import {
    Drawer,
    Button,
    Group,
    Stack,
    Box,
    Text,
    Title,
    Divider,
    SegmentedControl,
    NumberInput,
    TextInput,
    Badge,
    Alert,
    Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconCash,
    IconCreditCard,
    IconDeviceMobile,
    IconCheck,
    IconAlertCircle,
    IconReceipt,
    IconExternalLink,
    IconRefresh,
    IconX,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import classes from './ModalCobroVenta.module.css';

export function ModalCobroVenta({
    opened,
    onClose,
    concepto = 'Venta / Membresía ApexGym',
    monto = 0,
    socio = null,
    onPagoCompletado = () => {},
}) {
    const montoNumerico = Number(monto) || 0;

    // Estado del método de pago
    const [metodo, setMetodo] = useState('EFECTIVO'); // 'EFECTIVO' | 'TERMINAL' | 'DIGITAL'
    const [cargando, setCargando] = useState(false);

    // Efectivo
    const [efectivoRecibido, setEfectivoRecibido] = useState(montoNumerico);

    // Terminal
    const [tipoTarjeta, setTipoTarjeta] = useState('DEBITO'); // 'DEBITO' | 'CREDITO'
    const [marcaTarjeta, setMarcaTarjeta] = useState('VISA'); // 'VISA' | 'MASTERCARD' | 'AMEX'
    const [folioVoucher, setFolioVoucher] = useState('');
    const [ultimosDigitos, setUltimosDigitos] = useState('4512');

    // Cobro Digital
    const [transaccionDigital, setTransaccionDigital] = useState(null);

    // Idempotencia
    const [idempotenciaKey, setIdempotenciaKey] = useState(() => crypto.randomUUID());
    const enviandoRef = useRef(false);

    // Reiniciar estados al abrir
    useEffect(() => {
        if (opened) {
            setMetodo('EFECTIVO');
            setEfectivoRecibido(montoNumerico);
            setFolioVoucher(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
            setUltimosDigitos('4512');
            setTipoTarjeta('DEBITO');
            setMarcaTarjeta('VISA');
            setTransaccionDigital(null);
            setIdempotenciaKey(crypto.randomUUID());
            enviandoRef.current = false;
        }
    }, [opened, montoNumerico]);

    // Cálculos de efectivo
    const efectivoRecibidoNum = Number(efectivoRecibido) || 0;
    const cambioEfectivo = Math.max(0, efectivoRecibidoNum - montoNumerico);
    const esEfectivoInsuficiente = metodo === 'EFECTIVO' && efectivoRecibidoNum < montoNumerico;
    const montoFaltante = Math.max(0, montoNumerico - efectivoRecibidoNum);

    // Ejecutar procesamiento del pago
    const procesarPago = async () => {
        if (enviandoRef.current) return;
        enviandoRef.current = true;

        if (montoNumerico <= 0) {
            enviandoRef.current = false;
            notifications.show({
                title: 'Monto inválido',
                message: 'El importe a cobrar debe ser mayor a cero.',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
            return;
        }

        if (esEfectivoInsuficiente) {
            enviandoRef.current = false;
            notifications.show({
                title: 'Efectivo insuficiente',
                message: `Faltan $${montoFaltante.toFixed(2)} MXN para cubrir el monto total.`,
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
            return;
        }

        if (metodo === 'TERMINAL' && !folioVoucher.trim()) {
            enviandoRef.current = false;
            notifications.show({
                title: 'Folio obligatorio',
                message: 'Ingresa el número de folio/autorización del voucher de terminal.',
                color: 'yellow',
                icon: <IconAlertCircle size={18} />,
            });
            return;
        }

        try {
            setCargando(true);

            let proveedor = 'EFECTIVO';
            let folio = null;

            if (metodo === 'TERMINAL') {
                proveedor = 'TERMINAL_MANUAL';
                folio = folioVoucher.trim();
            } else if (metodo === 'DIGITAL') {
                proveedor = 'MERCADO_PAGO';
            }

            const payload = {
                concepto: concepto.trim(),
                monto: montoNumerico,
                correoCliente: socio?.email?.trim() || null,
                proveedor,
                folioVoucher: folio,
                tipoTarjeta: metodo !== 'EFECTIVO' ? tipoTarjeta : null,
                marcaTarjeta: metodo !== 'EFECTIVO' ? marcaTarjeta : null,
                ultimosDigitos: metodo !== 'EFECTIVO' ? ultimosDigitos : null,
                uuidIdempotencia: idempotenciaKey,
                metadatos: {
                    socioId: socio?.id || null,
                    socioNombre: socio?.nombre || null,
                    efectivoRecibido: metodo === 'EFECTIVO' ? efectivoRecibidoNum : null,
                    cambioEntregado: metodo === 'EFECTIVO' ? cambioEfectivo : null,
                },
            };

            const respuesta = await api.pagos.crearCobro(payload, idempotenciaKey);
            const data = respuesta?.data || respuesta;
            const transaccion = data?.transaccion || data;

            if (!transaccion || !transaccion.id) {
                throw new Error(data?.mensaje || 'No se pudo generar el cobro.');
            }

            // Si es cobro en efectivo o terminal física, queda APROBADO de inmediato
            if (metodo === 'EFECTIVO' || metodo === 'TERMINAL') {
                notifications.show({
                    title: 'Pago Liquidado con Éxito',
                    message: `Cobro #${transaccion.id} registrado correctamente (${metodo === 'EFECTIVO' ? 'Efectivo' : 'Terminal'}).`,
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
                onPagoCompletado(transaccion);
                onClose();
            } else {
                // Cobro Digital (Mercado Pago)
                setTransaccionDigital(transaccion);
                notifications.show({
                    title: 'Orden de Cobro Digital Generada',
                    message: 'El socio puede pagar en la pasarela oficial con tarjeta o transferencia SPEI.',
                    color: 'blue',
                    icon: <IconDeviceMobile size={18} />,
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Error al procesar el pago',
                message: error?.response?.data?.message || error?.message || 'Error en la conexión bancaria',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setCargando(false);
            setTimeout(() => {
                enviandoRef.current = false;
            }, 600);
        }
    };

    // Verificar si el cobro digital ya fue liquidado
    const verificarPagoDigital = async () => {
        if (!transaccionDigital?.id) return;
        try {
            setCargando(true);
            const resp = await api.pagos.obtenerPorId(transaccionDigital.id);
            const data = resp?.data || resp;

            if (data?.estado === 'APROBADO') {
                notifications.show({
                    title: 'Pago Aprobado Confirmado',
                    message: 'El pago digital fue acreditado exitosamente.',
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
                onPagoCompletado(data);
                onClose();
            } else {
                notifications.show({
                    title: 'En Espera de Confirmación',
                    message: 'La transacción aún se encuentra en proceso en la pasarela bancaria.',
                    color: 'yellow',
                    icon: <IconRefresh size={18} />,
                });
            }
        } catch (err) {
            notifications.show({
                title: 'Error al verificar',
                message: err?.message || 'No se pudo sincronizar el estado',
                color: 'red',
            });
        } finally {
            setCargando(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size={560}
            title={
                <Group gap="sm">
                    <IconReceipt size={28} stroke={1.8} color="var(--ag-color-primary, #FF6A00)" />
                    <Divider orientation="vertical" color="secondary.9" size="2" />
                    <div>
                        <Title order={4} fw={700} c="#1E293B">
                            Cobro y Liquidación de Venta
                        </Title>
                        <Text size="xs" c="dimmed">
                            {socio?.nombre ? `Cliente: ${socio.nombre}` : 'Punto de cobro en mostrador'}
                        </Text>
                    </div>
                </Group>
            }
            overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
            zIndex={999999}
            styles={{
                header: { borderBottom: '1px solid #E2E8F0', paddingBottom: 16 },
                body: { display: 'flex', flexDirection: 'column', padding: '20px 24px 0 24px' },
            }}
        >
            <div className={classes.drawerContent}>
                {/* Resumen de la Orden */}
                <Box className={classes.summaryBox}>
                    <Group justify="space-between" align="center">
                        <div>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">
                                Concepto de Venta
                            </Text>
                            <Text size="sm" fw={700} c="#1E293B">
                                {concepto}
                            </Text>
                            {socio?.email && (
                                <Text size="xs" c="dimmed">
                                    {socio.email}
                                </Text>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.05em">
                                Total a Pagar
                            </Text>
                            <Text className={classes.amountBadge}>
                                ${montoNumerico.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                            </Text>
                        </div>
                    </Group>
                </Box>

                {/* Si ya hay transacción digital activa en espera de pago */}
                {transaccionDigital ? (
                    <Stack gap="md" mt="sm">
                        <Alert color="blue" variant="light" title="Orden Digital en Curso">
                            La orden digital #{transaccionDigital.id} está lista para ser pagada por el socio.
                        </Alert>

                        {transaccionDigital.urlCheckout && (
                            <Button
                                component="a"
                                href={transaccionDigital.urlCheckout}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="apex"
                                size="md"
                                radius="md"
                                leftSection={<IconExternalLink size={18} />}
                                fullWidth
                            >
                                Abrir Pasarela Oficial Mercado Pago
                            </Button>
                        )}

                        <Paper withBorder p="md" radius="md">
                            <Text size="sm" fw={600} mb="xs">
                                Comprobación en Tiempo Real:
                            </Text>
                            <Text size="xs" c="dimmed" mb="md">
                                Cuando el socio concluya el pago en su teléfono (tarjeta o transferencia SPEI), haz clic en el botón de abajo para verificar la acreditación bancaria inmediata.
                            </Text>
                            <Button
                                variant="outline"
                                color="teal"
                                radius="md"
                                leftSection={<IconRefresh size={16} />}
                                onClick={verificarPagoDigital}
                                loading={cargando}
                                fullWidth
                            >
                                Verificar y Confirmar Pago
                            </Button>
                        </Paper>

                        <Button
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setTransaccionDigital(null)}
                            leftSection={<IconX size={16} />}
                        >
                            Cambiar a Efectivo o Terminal
                        </Button>
                    </Stack>
                ) : (
                    /* Selector de Método de Pago */
                    <Stack gap="md">
                        <Box>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6} lts="0.04em">
                                Forma de Pago
                            </Text>
                            <SegmentedControl
                                fullWidth
                                radius="md"
                                size="sm"
                                value={metodo}
                                onChange={setMetodo}
                                data={[
                                    { label: 'Efectivo', value: 'EFECTIVO' },
                                    { label: 'Tarjeta en Mostrador', value: 'TERMINAL' },
                                    { label: 'Cobro Digital (En línea)', value: 'DIGITAL' },
                                ]}
                            />
                        </Box>

                        {/* Panel: Efectivo */}
                        {metodo === 'EFECTIVO' && (
                            <Box className={classes.cashPanel}>
                                <Stack gap="sm">
                                    <NumberInput
                                        label="Efectivo Recibido"
                                        description="Importe entregado físicamente por el cliente"
                                        value={efectivoRecibido}
                                        onChange={(val) => setEfectivoRecibido(Number(val) || 0)}
                                        prefix="$"
                                        suffix=" MXN"
                                        min={0}
                                        decimalScale={2}
                                        size="md"
                                        radius="md"
                                    />
                                    <Group justify="space-between" align="center" mt="xs">
                                        <Text size="sm" fw={500} c="dimmed">
                                            Cambio a Devolver:
                                        </Text>
                                        <Text fw={800} fz="lg" c={!esEfectivoInsuficiente ? 'teal.7' : 'red.7'}>
                                            ${cambioEfectivo.toFixed(2)} MXN
                                        </Text>
                                    </Group>

                                    {esEfectivoInsuficiente && (
                                        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" p="xs">
                                            Faltan ${montoFaltante.toFixed(2)} MXN para liquidar la venta.
                                        </Alert>
                                    )}
                                </Stack>
                            </Box>
                        )}

                        {/* Panel: Terminal Mostrador */}
                        {metodo === 'TERMINAL' && (
                            <Stack gap="sm">
                                <Group grow>
                                    <SegmentedControl
                                        value={tipoTarjeta}
                                        onChange={setTipoTarjeta}
                                        radius="md"
                                        data={[
                                            { label: 'Débito', value: 'DEBITO' },
                                            { label: 'Crédito', value: 'CREDITO' },
                                        ]}
                                    />
                                    <SegmentedControl
                                        value={marcaTarjeta}
                                        onChange={setMarcaTarjeta}
                                        radius="md"
                                        data={[
                                            { label: 'VISA', value: 'VISA' },
                                            { label: 'Mastercard', value: 'MASTERCARD' },
                                            { label: 'AMEX', value: 'AMEX' },
                                        ]}
                                    />
                                </Group>
                                <Group grow>
                                    <TextInput
                                        label="Folio Voucher de Terminal"
                                        placeholder="Ej. AUTH-982314"
                                        value={folioVoucher}
                                        onChange={(e) => setFolioVoucher(e.currentTarget.value)}
                                        withAsterisk
                                        radius="md"
                                    />
                                    <TextInput
                                        label="Últimos 4 Dígitos"
                                        placeholder="Ej. 7474"
                                        value={ultimosDigitos}
                                        maxLength={4}
                                        onChange={(e) => setUltimosDigitos(e.currentTarget.value)}
                                        radius="md"
                                    />
                                </Group>
                                <Text size="xs" c="dimmed">
                                    El cobro se procesa en la maquinita bancaria de mostrador y se registra el comprobante en la auditoría del gimnasio.
                                </Text>
                            </Stack>
                        )}

                        {/* Panel: Cobro Digital */}
                        {metodo === 'DIGITAL' && (
                            <Paper withBorder p="md" radius="md" style={{ backgroundColor: '#F8FAFC' }}>
                                <Stack gap="xs">
                                    <Group gap="xs">
                                        <Badge color="orange" variant="light">
                                            Mercado Pago En Vivo
                                        </Badge>
                                        <Text size="xs" c="dimmed">
                                            Pasarela oficial segura
                                        </Text>
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        Al presionar el botón se generará el enlace oficial de cobro. El socio podrá pagar con tarjeta de crédito/débito o transferencia SPEI inmediata.
                                    </Text>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                )}
            </div>

            {/* Acciones del Drawer */}
            {!transaccionDigital && (
                <Group justify="flex-end" gap="sm" className={classes.footerActions}>
                    <Button variant="default" radius="md" onClick={onClose} disabled={cargando}>
                        Cancelar
                    </Button>
                    <Button
                        color="apex"
                        radius="md"
                        loading={cargando}
                        disabled={cargando || esEfectivoInsuficiente}
                        onClick={procesarPago}
                        leftSection={
                            metodo === 'EFECTIVO' ? (
                                <IconCash size={18} />
                            ) : metodo === 'TERMINAL' ? (
                                <IconCreditCard size={18} />
                            ) : (
                                <IconDeviceMobile size={18} />
                            )
                        }
                    >
                        {metodo === 'EFECTIVO'
                            ? `Cobrar en Efectivo ($${montoNumerico.toFixed(2)})`
                            : metodo === 'TERMINAL'
                            ? 'Registrar Pago en Terminal'
                            : 'Generar Enlace y Cobro Digital'}
                    </Button>
                </Group>
            )}
        </Drawer>
    );
}
