import { Avatar, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import classes from './DropzoneImagen.module.css';

export function DropzoneImagen({ archivo, preview, onDrop, onReject }) {
    return (
        <Stack gap="xs">
            <Text component="span" size="sm" fw={600}>
                Foto de usuario
            </Text>
            <Dropzone
                onDrop={onDrop}
                onReject={onReject}
                accept={IMAGE_MIME_TYPE}
                maxSize={5 * 1024 ** 2}
                maxFiles={1}
                h={270}
                radius="md"
                className={classes.dropzone}
            >
                <Stack align="center" justify="center" gap="xs" mih={230} className={classes.content}>
                    {preview ? (
                        <Avatar src={preview} size={96} radius={96} />
                    ) : (
                        <>
                            <Dropzone.Accept>
                                <IconUpload size={42} stroke={1.5} className={classes.icon} />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <IconX size={42} stroke={1.5} className={classes.rejectIcon} />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <IconPhoto size={42} stroke={1.5} className={classes.icon} />
                            </Dropzone.Idle>
                        </>
                    )}
                    <Dropzone.Accept>
                        <Text fw={600} ta="center" className={classes.primaryText}>
                            Suelta la foto aquí
                        </Text>
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                        <Text fw={600} ta="center" className={classes.rejectText}>
                            Esta imagen no es válida
                        </Text>
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                        <Text fw={600} ta="center" className={classes.primaryText}>
                            {archivo?.name || 'Arrastra una foto aquí'}
                        </Text>
                    </Dropzone.Idle>
                    <Text size="sm" ta="center" className={classes.secondaryText}>
                        o haz clic para seleccionarla
                    </Text>
                    <Text size="xs" className={classes.secondaryText}>
                        JPG, PNG o GIF · máximo 5 MB
                    </Text>
                </Stack>
            </Dropzone>
        </Stack>
    );
}
