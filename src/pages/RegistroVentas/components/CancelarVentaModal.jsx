import { Button, Checkbox, Group, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';

export function CancelarVentaModal({
    venta,
    motivo,
    cancelando,
    folioCancelacion,
    confirmacionTerminal,
    onMotivoChange,
    onFolioCancelacionChange,
    onConfirmacionTerminalChange,
    onClose,
    onConfirm,
}) {
    const codigoMetodo = String(venta?.metodoPago?.codigo ?? '').toUpperCase();
    const nombreMetodo = String(venta?.metodoPago?.nombre ?? '').toLocaleLowerCase();
    const esMercadoPago = codigoMetodo === 'MERCADO_PAGO' || nombreMetodo.includes('mercado pago');
    const esTerminal = codigoMetodo === 'TARJETA'
        || codigoMetodo === 'TERMINAL'
        || codigoMetodo === 'TERMINAL_MANUAL'
        || nombreMetodo.includes('terminal');
    const pagoPendiente = String(venta?.estado ?? '').toLocaleLowerCase() === 'pendiente_pago';

    return (
        <Modal
            opened={Boolean(venta)}
            onClose={() => !cancelando && onClose()}
            title={`Cancelar venta #${venta?.folioVentaId ?? venta?.id ?? ''}`}
            centered
        >
            <Stack>
                {esTerminal && (
                    <>
                        <TextInput
                            label="Folio de cancelación de la terminal"
                            placeholder="Ingresa el folio del voucher cancelado"
                            required
                            maxLength={100}
                            value={folioCancelacion}
                            onChange={(event) => onFolioCancelacionChange(event.currentTarget.value)}
                        />
                        <Checkbox
                            label="Confirmo que ya cancelé el cobro en la terminal y devolví el dinero al cliente."
                            checked={confirmacionTerminal}
                            onChange={(event) => onConfirmacionTerminalChange(event.currentTarget.checked)}
                        />
                    </>
                )}
                <Text>Indica el motivo para cancelar esta venta. Esta acción no se puede deshacer.</Text>
                <Textarea
                    label="Motivo de cancelación"
                    placeholder="Escribe el motivo"
                    required
                    maxLength={500}
                    minRows={3}
                    value={motivo}
                    onChange={(event) => onMotivoChange(event.currentTarget.value)}
                />
                <Group justify="flex-end">
                    <Button variant="default" disabled={cancelando} onClick={onClose}>
                        Volver
                    </Button>
                    <Button
                        color="red"
                        loading={cancelando}
                        disabled={
                            !motivo.trim()
                            || (esTerminal && (!String(folioCancelacion ?? '').trim() || !confirmacionTerminal))
                        }
                        onClick={onConfirm}
                    >
                        {esMercadoPago && !pagoPendiente && cancelando
                            ? 'Reembolsando…'
                            : 'Confirmar cancelación'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
