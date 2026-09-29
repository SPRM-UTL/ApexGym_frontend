import {
    Button,
    Group,
    Modal,
    SimpleGrid,
    Stack,
    TextInput,
    Textarea,
    Title,
} from '@mantine/core';
import { IconCategory } from '@tabler/icons-react';
import { DropzoneImagen } from '../DropzoneImagen/DropzoneImagen.jsx';
import classes from './ModalFormulario.module.css';

export function ModalCategoriaProducto({
    abierto,
    categoriaEditando,
    form = {},
    errores = {},
    onClose,
    onGuardar,
    onChange,
    onFotoDrop,
    onFotoReject,
}) {
    return (
        <Modal
            opened={abierto}
            onClose={onClose}
            title={
                <Group gap="sm">
                    <IconCategory size={22} stroke={1.8} />
                    <Title order={4} className={classes.title}>
                        {categoriaEditando ? 'Editar categoría' : 'Agregar categoría'}
                    </Title>
                </Group>
            }
            fullScreen
            radius={0}
            zIndex={999999}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
        >
            <Stack maw={780} mx="auto" mt="xl" gap="xl" className={classes.content}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="xl">
                    <Stack gap="md">
                        <TextInput
                            label="Nombre de la categoría"
                            placeholder="Ej. Suplementos, Accesorios..."
                            size="md"
                            radius="md"
                            withAsterisk
                            value={form.nombre || ''}
                            onChange={(event) => onChange('nombre', event.currentTarget.value)}
                            error={errores.nombre}
                        />
                        <Textarea
                            label="Descripción"
                            placeholder="Descripción opcional de la categoría"
                            size="md"
                            radius="md"
                            value={form.descripcion || ''}
                            onChange={(event) => onChange('descripcion', event.currentTarget.value)}
                            error={errores.descripcion}
                        />
                    </Stack>


                </SimpleGrid>

                <Group grow>
                    <Button variant="default" onClick={onClose} size="md">
                        Cancelar
                    </Button>
                    <Button onClick={onGuardar} size="md" className={classes.submitButton}>
                        {categoriaEditando ? 'Actualizar' : 'Guardar'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}