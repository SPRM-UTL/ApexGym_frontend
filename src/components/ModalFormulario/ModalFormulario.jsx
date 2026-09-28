import {
    Button,
    Group,
    Modal,
    NativeSelect,
    PasswordInput,
    SimpleGrid,
    Stack,
    TextInput,
    Title,
} from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { DropzoneImagen } from '../DropzoneImagen/DropzoneImagen.jsx';
import classes from './ModalFormulario.module.css';

export function ModalFormulario({
    abierto,
    usuarioEditando,
    loadingRoles,
    opcionesRoles,
    form,
    errores,
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
                    <IconUser size={22} stroke={1.8} />
                    <Title order={4} className={classes.title}>
                        {usuarioEditando ? 'Editar usuario' : 'Agregar usuario'}
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
                            label="Nombre"
                            placeholder="Juán Pérez"
                            size="md"
                            radius="md"
                            withAsterisk
                            value={form.nombre}
                            onChange={(event) => onChange('nombre', event.currentTarget.value)}
                            error={errores.nombre}
                        />
                        <TextInput
                            label="Correo electrónico"
                            placeholder="hola@gmail.com"
                            size="md"
                            radius="md"
                            withAsterisk
                            value={form.correo}
                            onChange={(event) => onChange('correo', event.currentTarget.value)}
                            error={errores.correo}
                        />
                        <PasswordInput
                            label={usuarioEditando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                            placeholder="Tu contraseña"
                            size="md"
                            radius="md"
                            withAsterisk={!usuarioEditando}
                            value={form.contrasena}
                            onChange={(event) => onChange('contrasena', event.currentTarget.value)}
                            error={errores.contrasena}
                        />
                        <NativeSelect
                            label="Rol"
                            data={[
                                {
                                    value: '',
                                    label: loadingRoles ? 'Cargando roles…' : 'Selecciona un rol',
                                },
                                ...opcionesRoles,
                            ]}
                            value={form.rolSeleccionado ?? ''}
                            onChange={(event) =>
                                onChange('rolSeleccionado', event.currentTarget.value || null)
                            }
                            size="md"
                            radius="md"
                            withAsterisk={!usuarioEditando}
                            required={!usuarioEditando}
                            error={errores.rol}
                            disabled={loadingRoles}
                        />
                    </Stack>

                    <DropzoneImagen
                        archivo={form.fotoUsuario}
                        preview={form.fotoPreview}
                        onDrop={onFotoDrop}
                        onReject={onFotoReject}
                    />
                </SimpleGrid>

                <Group grow>
                    <Button variant="default" onClick={onClose} size="md">
                        Cancelar
                    </Button>
                    <Button onClick={onGuardar} size="md" className={classes.submitButton}>
                        {usuarioEditando ? 'Actualizar' : 'Guardar'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
