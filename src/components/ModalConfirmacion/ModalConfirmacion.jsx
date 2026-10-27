
import { Alert, Button, Group, Modal, Stack, Text, ThemeIcon } from '@mantine/core';
import {
    IconAlertTriangle,
    IconTrash,
    IconX,
} from '@tabler/icons-react';

import classes from './ModalConfirmacion.module.css';

export function ModalConfirmacion({
    opened,
    onClose,
    onConfirm,
    title = 'Eliminar registro',
    message,
    loading = false,
}) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="md" wrap="nowrap">
                    <ThemeIcon
                        size={48}
                        radius="xl"
                        variant="light"
                        color="red"
                        className={classes.titleIcon}
                    >
                        <IconTrash size={25} stroke={2} />
                    </ThemeIcon>

                    <Text className={classes.title}>
                        {title}
                    </Text>
                </Group>
            }
            centered
            size={560}
            padding={0}
            radius="lg"
            withCloseButton
            closeButtonProps={{
                icon: <IconX size={20} />,
                'aria-label': 'Cerrar modal',
            }}
            closeOnClickOutside={!loading}
            closeOnEscape={!loading}
            overlayProps={{
                backgroundOpacity: 0.60,
                blur: 2,
            }}
            zIndex={1000000}
            classNames={{
                content: classes.modal,
                header: classes.header,
                title: classes.modalTitle,
                close: classes.closeButton,
                body: classes.body,
            }}
        >
            <Stack gap={0}>
                <div className={classes.content}>
                    <Text className={classes.message}>
                        {message}
                    </Text>

                    <Alert
                        icon={<IconAlertTriangle size={23} />}
                        color="red"
                        variant="light"
                        radius="md"
                        className={classes.warning}
                    >
                        <Text className={classes.warningText}>
                            Verifica que este registro ya no sea necesario.
                        </Text>
                    </Alert>
                </div>

                <div className={classes.footer}>
                    <Group
                        grow
                        gap="sm"
                        wrap="nowrap"
                        className={classes.actions}
                    >
                        <Button
                            variant="default"
                            onClick={onClose}
                            disabled={loading}
                            size="md"
                            radius="md"
                            className={classes.cancelButton}
                        >
                            Cancelar
                        </Button>

                        <Button
                            color="red"
                            onClick={onConfirm}
                            loading={loading}
                            leftSection={
                                !loading && <IconTrash size={19} />
                            }
                            size="md"
                            radius="md"
                            className={classes.confirmButton}
                        >
                            Eliminar
                        </Button>
                    </Group>
                </div>
            </Stack>
        </Modal>
    );
}
