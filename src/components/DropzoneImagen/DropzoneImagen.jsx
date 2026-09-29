import { Box, Image, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { resolverUrlImagen } from '../../scripts/constantes.js';
import classes from './DropzoneImagen.module.css';

export function DropzoneImagen({ archivo, preview, onDrop, onReject, h: height }) {
    const urlFinal = resolverUrlImagen(preview);

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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <Stack align="center" justify="center" gap={4} style={{ width: '100%' }} className={classes.content}>
                {urlFinal ? (
                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 8 }}>
                        <Image
                            src={urlFinal}
                            alt="Foto del empleado"
                            h={150}
                            w="auto"
                            fit="contain"
                            radius="md"
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
