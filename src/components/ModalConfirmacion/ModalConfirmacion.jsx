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
            radius="md"
            closeOnClickOutside={!loading}
            closeOnEscape={!loading}
            zIndex={1000000}
        >
            <Stack gap="xl" align="center" className={classes.content}>
                <Text ta="center" className={classes.message}>
                    {message}
                </Text>
                <div className={classes.actionsWrapper}>
                    <Group grow gap="md" className={classes.actions}>
                        <Button
                            variant="default"
                            onClick={onClose}
                            disabled={loading}
                            size="md"
                            radius="md"
                            className={classes.actionButton}
                        >
                            Cancelar
                        </Button>
                        <Button
                            color="red"
                            onClick={onConfirm}
                            loading={loading}
                            size="md"
                            radius="md"
                            className={`${classes.confirmButton} ${classes.actionButton}`}
                        >
                            Eliminar
                        </Button>
                    </Group>
                </div>
            </Stack>
        </Modal>
    );
}
