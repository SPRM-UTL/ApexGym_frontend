import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
    Modal,
    Button,
    Group,
    Stack,
    Box,
    SimpleGrid,
    NativeSelect,
    TextInput,
    Switch,
    Title,
    ThemeIcon,
    Text
} from '@mantine/core';
import {
    IconId,
    IconCalendar,
    IconCalendarOff,
    IconCurrencyDollar,
    IconCertificate
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};

export function ModalAsignarMembresia({ opened, onClose, cliente }) {
    const [tiposMembresia, setTiposMembresia] = useState([]);
    const [form, setForm] = useState({
        tipoMembresiaId: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: '',
        renovacionAutomatica: false
    });
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
        if (!cliente?.id || !form.tipoMembresiaId || !form.fechaInicio) return;
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
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="sm" c="white">
                    <IconCertificate size={22} stroke={1.8} />
                    <Title order={4} c="white">Asignar Membresía a {cliente?.nombre}</Title>
                </Group>
            }
            fullScreen
            radius={0}
            zIndex={999999}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
            styles={{ header: { backgroundColor: '#1B1F3A' }, close: { color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } } }}
        >
            <Stack maw={800} mx="auto" mt="md" gap="md">
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconId size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Selección de Plan</Title>
                    </div>
                    <NativeSelect
                        label="Tipo de Membresía"
                        placeholder="Elige el plan a asignar"
                        withAsterisk
                        size="md"
                        radius="md"
                        data={[
                            { value: '', label: 'Selecciona un plan' },
                            ...tiposMembresia.map(t => ({ value: String(t.id), label: `${t.nombre} - $${t.precio}` }))
                        ]}
                        value={form.tipoMembresiaId}
                        onChange={(e) => setForm({ ...form, tipoMembresiaId: e.currentTarget.value })}
                        leftSection={<IconCertificate size={16} />}
                    />
                </Box>

                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconCalendar size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Vigencia</Title>
                    </div>
                    <SimpleGrid cols={2} spacing="md">
                        <TextInput
                            label="Fecha de Inicio"
                            type="date"
                            withAsterisk
                            size="md"
                            radius="md"
                            value={form.fechaInicio}
                            onChange={(e) => setForm({ ...form, fechaInicio: e.currentTarget.value })}
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
                    <Box mt="xs" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: 8, border: '1px dashed #ced4da' }}>
                        <Group justify="space-between" align="center">
                            <div>
                                <Text size="sm" fw={500} c="dimmed">Total a cobrar:</Text>
                                <Text size="xl" fw={700} c="green.7">${tipoSeleccionado.precio}</Text>
                            </div>
                            <div>
                                <Text size="sm" fw={500} c="dimmed">Duración:</Text>
                                <Text size="md" fw={600}>{tipoSeleccionado.duracionDias} días</Text>
                            </div>
                        </Group>
                    </Box>
                )}

                <Switch
                    mt="sm"
                    size="md"
                    color="apex"
                    label="Renovación automática"
                    description="El sistema recordará renovar la membresía cuando termine la vigencia."
                    checked={form.renovacionAutomatica}
                    onChange={(e) => setForm({ ...form, renovacionAutomatica: e.currentTarget.checked })}
                />

                <Group grow mt="lg">
                    <Button variant="default" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button color="apex" disabled={!form.tipoMembresiaId || !form.fechaInicio} loading={loading} onClick={handleAsignar}>
                        Asignar
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
