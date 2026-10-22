import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
    Drawer,
    Button,
    Group,
    Stack,
    Box,
    SimpleGrid,
    NativeSelect,
    TextInput,
    Switch,
    Title,
    Divider,
    Text,
} from '@mantine/core';
import {
    IconCalendar,
    IconCalendarOff,
    IconCertificate,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

export function ModalAsignarMembresia({ opened, onClose, cliente }) {
    const [tiposMembresia, setTiposMembresia] = useState([]);
    const [form, setForm] = useState({
        tipoMembresiaId: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: '',
        renovacionAutomatica: false
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (opened) {
            const cargarTipos = async () => {
                try {
                    const response = await api.tipoMembresia.obtenerTodos();
                    if (response.data) {
                        setTiposMembresia(response.data);
                    }
                } catch (error) {
                    console.error('Error al cargar tipos de membresía', error);
                }
            };
            cargarTipos();
            setForm({
                tipoMembresiaId: '',
                fechaInicio: new Date().toISOString().split('T')[0],
                fechaFin: '',
                renovacionAutomatica: false
            });
            setErrors({});
        }
    }, [opened]);

    useEffect(() => {
        if (form.tipoMembresiaId && form.fechaInicio) {
            const tipoSeleccionado = tiposMembresia.find(t => String(t.id) === String(form.tipoMembresiaId));
            if (tipoSeleccionado && tipoSeleccionado.duracionDias) {
                const fechaIni = new Date(form.fechaInicio);
                fechaIni.setDate(fechaIni.getDate() + tipoSeleccionado.duracionDias);
                setForm(prev => ({ ...prev, fechaFin: fechaIni.toISOString().split('T')[0] }));
            }
        }
    }, [form.tipoMembresiaId, form.fechaInicio, tiposMembresia]);

    const tipoSeleccionado = tiposMembresia.find(t => String(t.id) === String(form.tipoMembresiaId));

    const handleAsignar = async () => {
        const nextErrors = {};
        if (!form.tipoMembresiaId) {
            nextErrors.tipoMembresiaId = 'Selecciona un plan de membresía';
        }
        if (!form.fechaInicio) {
            nextErrors.fechaInicio = 'La fecha de inicio es obligatoria';
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        if (!cliente?.id) return;

        try {
            setLoading(true);
            const res = await api.clienteMembresia.asignar({
                clienteId: cliente.id,
                tipoMembresiaId: form.tipoMembresiaId,
                fechaInicio: form.fechaInicio,
                renovacionAutomatica: form.renovacionAutomatica
            });
            if (res.responseFlag === 0) {
                notifications.show({
                    title: 'Membresía Asignada',
                    message: `Se ha asignado la membresía exitosamente a ${cliente.nombre}.`,
                    color: 'green'
                });
                onClose();
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.message || 'No se pudo asignar la membresía',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={() => !loading && onClose()}
            position="right"
            size={520}
            title={
                <Group gap="sm">
                    <IconCertificate size={22} stroke={1.8} color="var(--ag-color-primary)" />
                    <div>
                        <Title order={4} fw={700} c="#1E293B">
                            Asignar Membresía
                        </Title>
                        <Text size="xs" c="dimmed">
                            <strong>Cliente:</strong> {cliente?.nombreCompleto ?? cliente?.nombre}
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
                <Stack gap="md">
                    <Box>
                        <Box mb={6}>
                            <Text fw={600} size="sm" c="#1E293B">
                                Selección de Plan
                            </Text>
                            <Divider color="#E2E8F0" mt={4} />
                        </Box>
                        <NativeSelect
                            label="Tipo de Membresía"
                            placeholder="Elige el plan a asignar"
                            withAsterisk
                            size="md"
                            radius="md"
                            error={errors.tipoMembresiaId}
                            data={[
                                { value: '', label: 'Selecciona un plan' },
                                ...tiposMembresia.map(t => ({ value: String(t.id), label: `${t.nombre} - $${t.precio}` }))
                            ]}
                            value={form.tipoMembresiaId}
                            onChange={(e) => {
                                const val = e.currentTarget.value;
                                setForm({ ...form, tipoMembresiaId: val });
                                if (val) setErrors((prev) => ({ ...prev, tipoMembresiaId: undefined }));
                            }}
                        />
                    </Box>

                    <Box>
                        <Box mb={6}>
                            <Text fw={600} size="sm" c="#1E293B">
                                Vigencia
                            </Text>
                            <Divider color="#E2E8F0" mt={4} />
                        </Box>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <TextInput
                                label="Fecha de Inicio"
                                type="date"
                                withAsterisk
                                size="md"
                                radius="md"
                                error={errors.fechaInicio}
                                value={form.fechaInicio}
                                onChange={(e) => {
                                    const val = e.currentTarget.value;
                                    setForm({ ...form, fechaInicio: val });
                                    if (val) setErrors((prev) => ({ ...prev, fechaInicio: undefined }));
                                }}
                                leftSection={<IconCalendar size={16} />}
                            />
                            <TextInput
                                label="Fecha de Fin"
                                type="date"
                                readOnly
                                variant="filled"
                                size="md"
                                radius="md"
                                value={form.fechaFin}
                                leftSection={<IconCalendarOff size={16} />}
                                styles={{ input: { color: 'var(--mantine-color-black)', fontWeight: 500 } }}
                            />
                        </SimpleGrid>
                    </Box>

                    {tipoSeleccionado && (
                        <Box p="md" style={{ backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <Group justify="space-between" align="center">
                                <div>
                                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.04em">Total a cobrar</Text>
                                    <Text size="xl" fw={700} c="green.7">${Number(tipoSeleccionado.precio).toFixed(2)} MXN</Text>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.04em">Duración</Text>
                                    <Text size="sm" fw={600} c="dark.6">{tipoSeleccionado.duracionDias} días</Text>
                                </div>
                            </Group>
                        </Box>
                    )}

                    <Switch
                        mt="xs"
                        size="md"
                        color="apex"
                        label="Renovación automática"
                        description="El sistema recordará renovar la membresía cuando termine la vigencia."
                        checked={form.renovacionAutomatica}
                        onChange={(e) => setForm({ ...form, renovacionAutomatica: e.currentTarget.checked })}
                    />
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
                <Button variant="default" radius="md" onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    color="apex"
                    radius="md"
                    loading={loading}
                    onClick={handleAsignar}
                    style={{ color: '#ffffff' }}
                    styles={{ label: { color: '#ffffff', fontWeight: 600 } }}
                >
                    Asignar
                </Button>
            </Group>
        </Drawer>
    );
}
