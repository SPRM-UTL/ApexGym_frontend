import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';

export function CancelarVentaModal({
    venta,
    motivo,
    cancelando,
    onMotivoChange,
    onClose,
    onConfirm,
}) {
    return (
        <Modal
            opened={Boolean(venta)}
            onClose={() => !cancelando && onClose()}
            title={`Cancelar venta #${venta?.folioVentaId ?? venta?.id ?? ''}`}
            centered
        >
            <Stack>
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
                        disabled={!motivo.trim()}
                        onClick={onConfirm}
                    >
                        Confirmar cancelación
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
