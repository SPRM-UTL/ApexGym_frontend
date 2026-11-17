import {
    Box,
    Button,
    Divider,
    Drawer,
    Group,
    NativeSelect,
    PasswordInput,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { DropzoneImagen } from '../DropzoneImagen/DropzoneImagen.jsx';
import classes from './ModalFormulario.module.css';

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

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
    loading = false,
}) {
    return (
        <Drawer
            opened={abierto}
            onClose={() => !loading && onClose()}
            position="right"
            size={560}
            title={
                <Group gap="sm">
                    <IconUser size={22} stroke={1.8} color="var(--ag-color-primary)" />
                    <div>
                        <Title order={4} fw={700} c="#1E293B">
                            {usuarioEditando ? 'Editar usuario' : 'Nuevo usuario'}
                        </Title>
                        <Text size="xs" c="dimmed">
                            {usuarioEditando
                                ? 'Modifica los datos del usuario y guarda los cambios.'
                                : 'Completa los campos para registrar un nuevo usuario.'}
                        </Text>
                    </div>
                </Group>
            }
            overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
            zIndex={999999}
            styles={{
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                },
                header: {
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: 16,
                    marginBottom: 0,
                },
                body: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px 24px 0 24px',
                },
            }}
        >
            <div style={{ flex: 1, paddingBottom: 20 }}>
                <Stack gap="md" className={classes.content}>
                    <Box>
                        <SectionTitle>Fotografía de perfil</SectionTitle>
                        <DropzoneImagen
                            variant="compact"
                            archivo={form.fotoUsuario}
                            preview={form.fotoPreview}
                            onDrop={onFotoDrop}
                            onReject={onFotoReject}
                        />
                    </Box>

                    <Box>
                        <SectionTitle>Datos del usuario</SectionTitle>
                        <Stack gap="md">
                            <TextInput
                                label="Nombre completo"
                                placeholder="Ej. Juan Pérez"
                                size="md"
                                radius="md"
                                withAsterisk
                                value={form.nombre}
                                onChange={(event) => onChange('nombre', event.currentTarget.value)}
                                error={errores.nombre}
                            />
                            <TextInput
                                label="Correo electrónico"
                                placeholder="Ej. usuario@correo.com"
                                size="md"
                                radius="md"
                                withAsterisk
                                value={form.correo}
                                onChange={(event) => onChange('correo', event.currentTarget.value)}
                                error={errores.correo}
                            />
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                                <PasswordInput
                                    label={usuarioEditando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                                    placeholder="Ingresa contraseña"
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
                            </SimpleGrid>
                        </Stack>
                    </Box>
                </Stack>
            </div>

            <Group
                justify="flex-end"
                gap="sm"
                py="md"
                style={{
                    borderTop: '1px solid #E2E8F0',
                    backgroundColor: 'var(--ag-color-surface-elevated, #ffffff)',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    marginTop: 'auto',
                }}
            >
                <Button variant="default" onClick={onClose} disabled={loading} radius="md">
                    Cancelar
                </Button>
                <Button
                    color="apex"
                    onClick={onGuardar}
                    loading={loading}
                    radius="md"
                    className={classes.submitButton}
                    styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
                >
                    {usuarioEditando ? 'Actualizar' : 'Guardar'}
                </Button>
            </Group>
        </Drawer>
    );
}
