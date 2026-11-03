import { Avatar, Box, Group, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { IconPhoto, IconUpload, IconUser, IconX } from '@tabler/icons-react';
import { resolverUrlImagen } from '../../scripts/constantes.js';
import classes from './DropzoneImagen.module.css';

export function DropzoneImagen({ archivo, preview, onDrop, onReject, h: height, variant = 'default' }) {
    const urlFinal = resolverUrlImagen(preview);

    if (variant === 'compact') {
        return (
            <Dropzone
                onDrop={onDrop}
                onReject={onReject}
                accept={IMAGE_MIME_TYPE}
                maxSize={5 * 1024 ** 2}
                maxFiles={1}
                radius="md"
                className={classes.dropzoneCompact}
            >
                <Group wrap="nowrap" gap="md" align="center" style={{ width: '100%' }}>
                    <Avatar
                        src={urlFinal || null}
                        alt="Fotografía de perfil"
                        size={68}
                        radius="100%"
                        className={urlFinal ? classes.avatarActive : classes.avatarIdle}
                    >
                        <IconUser size={30} stroke={1.6} color="#64748B" />
                    </Avatar>

                    <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                        <Dropzone.Accept>
                            <Text size="sm" fw={600} c="var(--ag-color-primary)">
                                Suelta la imagen aquí para cargarla
                            </Text>
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <Text size="sm" fw={600} c="red.7">
                                El archivo no es válido (máximo 5 MB)
                            </Text>
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <Text size="sm" fw={600} c="#1E293B" truncate>
                                {archivo?.name
                                    ? archivo.name
                                    : urlFinal
                                        ? 'Fotografía de perfil cargada'
                                        : 'Haz clic o arrastra una imagen aquí'}
                            </Text>
                        </Dropzone.Idle>

                        <Text size="xs" c="dimmed">
                            {urlFinal
                                ? 'Arrastra otra imagen o haz clic para reemplazarla'
                                : 'Formatos JPG, PNG o GIF · Máximo 5 MB'}
                        </Text>
                    </Stack>
                </Group>
            </Dropzone>
        );
    }

    return (
        <Dropzone
            onDrop={onDrop}
            onReject={onReject}
            accept={IMAGE_MIME_TYPE}
            maxSize={5 * 1024 ** 2}
            maxFiles={1}
            h={height ?? 220}
            radius="md"
            className={classes.dropzone}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
        >
            <Stack align="center" justify="center" gap={4} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }} className={classes.content}>
                {urlFinal ? (
                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 8, maxWidth: '100%' }}>
                        <Avatar
                            src={urlFinal}
                            alt="Foto del empleado"
                            size={140}
                            radius="100%"
                            style={{
                                border: '3px solid var(--ag-color-primary, #FF6A00)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            }}
                        />
                        <Text size="xs" ta="center" className={classes.secondaryText}>
                            Arrastra una foto o haz clic para cambiarla
                        </Text>
                    </Box>
                ) : (
                    <>
                        <Dropzone.Accept>
                            <IconUpload size={32} stroke={1.5} className={classes.icon} />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX size={32} stroke={1.5} className={classes.rejectIcon} />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconPhoto size={32} stroke={1.5} className={classes.icon} />
                        </Dropzone.Idle>
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
                    </>
                )}
            </Stack>
        </Dropzone>
    );
}
