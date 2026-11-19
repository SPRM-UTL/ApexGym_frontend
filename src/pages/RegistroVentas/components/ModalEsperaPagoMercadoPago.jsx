import { useState, useEffect } from 'react';
import {
    Modal,
    Loader,
    Title,
    Text,
    Button,
    Stack,
    ThemeIcon,
} from '@mantine/core';
import {
    IconExternalLink,
    IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../../scripts/services/api.js';

export function ModalEsperaPagoMercadoPago({
    datosPago,
    onPagoAprobado,
    onClose,
}) {
    const [estado, setEstado] = useState('ESPERANDO'); // 'ESPERANDO' | 'RECHAZADO'

    useEffect(() => {
        if (!datosPago?.ventaId) return undefined;
        setEstado('ESPERANDO');

        let cancelado = false;
        const intervalo = setInterval(async () => {
            try {
                const res = await api.venta.consultarEstadoPago(datosPago.ventaId);
                if (cancelado) return;

                const estadoVenta = String(res.data?.venta?.estado ?? '').toLowerCase();
                const estadoPago = String(res.data?.pago?.estado ?? '').toUpperCase();

                if (estadoVenta === 'completada' || estadoPago === 'APROBADO') {
                    clearInterval(intervalo);
                    notifications.show({
                        color: 'green',
                        title: '¡Pago Confirmado!',
                        message: `Venta #${datosPago.folio ?? datosPago.ventaId} acreditada exitosamente.`,
                    });
                    if (typeof onPagoAprobado === 'function') {
                        onPagoAprobado(res.data?.venta ?? null);
                    }
                } else if (estadoPago === 'RECHAZADO' || estadoVenta === 'cancelada') {
                    clearInterval(intervalo);
                    setEstado('RECHAZADO');
                    notifications.show({
                        color: 'red',
                        message: 'El pago fue cancelado o rechazado por Mercado Pago.',
                    });
                }
            } catch {
                // Errores temporales de red se ignoran durante el sondeo
            }
        }, 2000);

        return () => {
            cancelado = true;
            clearInterval(intervalo);
        };
    }, [datosPago?.ventaId]);

    if (!datosPago) return null;

    return (
        <Modal
            opened={!!datosPago}
            onClose={onClose}
            title="Cobro Digital con Mercado Pago"
            centered
            closeOnClickOutside={false}
        >
            <Stack align="center" gap="md" py="sm">
                {estado === 'ESPERANDO' ? (
                    <>
                        <Loader size="lg" color="blue" type="dots" />
                        <Title order={4}>Esperando confirmación del pago</Title>
                        <Text size="sm" c="dimmed" ta="center">
                            Venta <b>#{datosPago.folio ?? datosPago.ventaId}</b> por <b>${Number(datosPago.total ?? 0).toFixed(2)}</b>
                        </Text>
                        <Text size="xs" c="dimmed" ta="center">
                            El cliente debe completar el pago en la ventana de Mercado Pago. En cuanto se acredite, la venta se completará automáticamente y se emitirá el ticket.
                        </Text>
                        {datosPago.urlCheckout && (
                            <Button
                                component="a"
                                href={datosPago.urlCheckout}
                                target="_blank"
                                rel="noreferrer"
                                leftSection={<IconExternalLink size={16} />}
                                variant="light"
                                color="blue"
                            >
                                Abrir checkout de Mercado Pago
                            </Button>
                        )}
                        <Button
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={onClose}
                        >
                            Cerrar ventana de espera
                        </Button>
                    </>
                ) : (
                    <>
                        <ThemeIcon size={56} radius="xl" color="red">
                            <IconAlertCircle size={32} />
                        </ThemeIcon>
                        <Title order={4}>Pago no completado</Title>
                        <Text size="sm" c="dimmed" ta="center">
                            El pago fue cancelado o rechazado en Mercado Pago.
                        </Text>
                        <Button onClick={onClose} color="gray">
                            Volver al carrito
                        </Button>
                    </>
                )}
            </Stack>
        </Modal>
    );
}
