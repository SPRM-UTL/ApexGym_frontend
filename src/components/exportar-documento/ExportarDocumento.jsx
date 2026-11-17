import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconPrinter, IconX } from '@tabler/icons-react';
import classes from './ExportarDocumento.module.css';

export function ExportarDocumento({
    documento,
    crearDocumento,
    nombreArchivo = 'documento-apexgym.pdf',
    etiquetaBoton = 'Imprimir documento',
    soloDescargar = false,
    abrirAlMontar = false,
    ocultarBoton = false,
    onClose,
}) {
    const [generando, setGenerando] = useState(false);
    const [urlDocumento, setUrlDocumento] = useState('');
    const [errorGeneracion, setErrorGeneracion] = useState('');
    const iframeRef = useRef(null);
    const inicioAutomatico = useRef(false);

    useEffect(() => () => {
        if (urlDocumento) URL.revokeObjectURL(urlDocumento);
    }, [urlDocumento]);

    const generarVistaPrevia = useCallback(async () => {
        if (!documento && typeof crearDocumento !== 'function') {
            notifications.show({
                color: 'red',
                message: 'No se proporcionó el contenido del documento.',
            });
            return;
        }

        setGenerando(true);
        setErrorGeneracion('');
        try {
            const documentoActual = crearDocumento
                ? await crearDocumento()
                : documento;
            const { generarDocumentoPDF } = await import(
                '../../services/exportaciones/documento.service.js'
            );
            const blob = await generarDocumentoPDF(documentoActual);
            setUrlDocumento(URL.createObjectURL(blob));
        } catch (error) {
            setErrorGeneracion(error.message || 'Ocurrió un error al generar el PDF.');
            notifications.show({
                color: 'red',
                title: 'No se pudo generar el documento',
                message: error.message || 'Ocurrió un error al generar el PDF.',
            });
        } finally {
            setGenerando(false);
        }
    }, [crearDocumento, documento]);

    useEffect(() => {
        if (abrirAlMontar && !inicioAutomatico.current) {
            inicioAutomatico.current = true;
            generarVistaPrevia();
        }
    }, [abrirAlMontar, generarVistaPrevia]);

    const descargarTicket = async () => {
        if (!documento && typeof crearDocumento !== 'function') {
            notifications.show({
                color: 'red',
                message: 'No se proporcionó el contenido del documento.',
            });
            return;
        }

        setGenerando(true);
        try {
            const documentoActual = crearDocumento
                ? await crearDocumento()
                : documento;
            const {
                descargarDocumentoPDF,
                generarDocumentoPDF,
            } = await import(
                '../../services/exportaciones/documento.service.js'
            );
            const blob = await generarDocumentoPDF(documentoActual);
            descargarDocumentoPDF(blob, nombreArchivo);
            notifications.show({
                color: 'green',
                message: 'Ticket descargado correctamente.',
            });
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error.message || 'No se pudo descargar el documento.',
            });
        } finally {
            setGenerando(false);
        }
    };

    const descargar = async () => {
        try {
            const { descargarDocumentoPDF } = await import(
                '../../services/exportaciones/documento.service.js'
            );
            descargarDocumentoPDF(urlDocumento, nombreArchivo);
        } catch (error) {
            notifications.show({
                color: 'red',
                message: error.message || 'No se pudo descargar el documento.',
            });
        }
    };

    const imprimir = () => {
        const ventana = iframeRef.current?.contentWindow;
        if (!ventana) {
            notifications.show({
                color: 'red',
                message: 'No se pudo abrir la vista previa para imprimir.',
            });
            return;
        }

        ventana.focus();
        ventana.print();
    };

    const cerrarVistaPrevia = () => {
        setUrlDocumento('');
        setErrorGeneracion('');
        onClose?.();
    };

    return (
        <>
            {!ocultarBoton && (soloDescargar ? (
                <ActionIcon
                    type="button"
                    variant="light"
                    color="blue"
                    aria-label="Descargar ticket PDF"
                    title="Descargar ticket PDF"
                    loading={generando}
                    onClick={descargarTicket}
                >
                    <IconDownload size={18} />
                </ActionIcon>
            ) : (
                <Group>
                    <Button
                        type="button"
                        leftSection={<IconDownload size={18} />}
                        loading={generando}
                        onClick={descargarTicket}
                    >
                        Descargar ticket PDF
                    </Button>
                    <Button
                        type="button"
                        variant="light"
                        leftSection={<IconPrinter size={18} />}
                        loading={generando}
                        onClick={generarVistaPrevia}
                    >
                        {generando ? 'Preparando documento...' : etiquetaBoton}
                    </Button>
                </Group>
            ))}
            <Modal
                opened={Boolean(urlDocumento) || generando || Boolean(errorGeneracion)}
                onClose={cerrarVistaPrevia}
                title={(
                    <Group gap="sm" wrap="nowrap" className={classes.titleGroup}>
                        <IconPrinter size={24} className={classes.titleIcon} />
                        <Text className={classes.title}>Vista previa del documento</Text>
                    </Group>
                )}
                centered
                size="xl"
                zIndex={1200}
                padding={0}
                radius="lg"
                withCloseButton
                closeButtonProps={{ icon: <IconX size={20} />, 'aria-label': 'Cerrar vista previa' }}
                classNames={{
                    content: classes.modal,
                    header: classes.header,
                    title: classes.modalTitle,
                    close: classes.closeButton,
                    body: classes.body,
                }}
            >
                {generando ? (
                    <Stack align="center" py="xl">
                        <Loader />
                        <Text>Generando documento...</Text>
                    </Stack>
                ) : errorGeneracion ? (
                    <Alert color="red" title="No se pudo generar el documento">
                        {errorGeneracion}
                    </Alert>
                ) : urlDocumento ? (
                    <Stack gap={0}>
                        <div className={classes.preview}>
                        <iframe
                            ref={iframeRef}
                            title="Vista previa del documento PDF"
                            src={urlDocumento}
                            className={classes.iframe}
                        />
                        </div>
                        <Group justify="flex-end" className={classes.actions}>
                            <Button
                                type="button"
                                variant="light"
                                leftSection={<IconDownload size={16} />}
                                onClick={descargar}
                                className={classes.downloadButton}
                            >
                                Descargar PDF
                            </Button>
                            <Button
                                type="button"
                                leftSection={<IconPrinter size={16} />}
                                onClick={imprimir}
                                className={classes.printButton}
                            >
                                Imprimir
                            </Button>
                        </Group>
                    </Stack>
                ) : null}
            </Modal>
        </>
    );
}

export default ExportarDocumento;
