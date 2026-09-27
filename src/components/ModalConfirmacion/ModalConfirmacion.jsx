import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import classes from './ModalConfirmacion.module.css';

export function ModalConfirmacion({
    opened,
    onClose,
    onConfirm,
    title = 'Confirmar acción',
    message,
    loading = false,
}) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text className={classes.title}>{title}</Text>}
            centered
            size={520}
            padding="xl"
            radius={0}
            closeOnClickOutside={!loading}
            closeOnEscape={!loading}
            zIndex={1000000}
        >
            <Stack gap="lg" align="center" className={classes.content}>
                <Text size="sm" c="dimmed" ta="center" className={classes.message}>
                    {message}
                </Text>
                <Group justify="center" gap="sm" className={classes.actions}>
                    <Button variant="default" onClick={onClose} disabled={loading} className={classes.actionButton}>
                        Cancelar
                    </Button>
                    <Button
                        color="red"
                        onClick={onConfirm}
                        loading={loading}
                        className={`${classes.confirmButton} ${classes.actionButton}`}
                    >
                        Eliminar
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
