import { useState, useEffect } from 'react';
import {
    Drawer,
    Stack,
    TextInput,
    NativeSelect,
    Textarea,
    Button,
    Group,
    Text,
    Badge,
    Paper,
    ScrollArea,
    LoadingOverlay
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus, IconCash, IconNotes, IconUser } from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';

export function DrawerRegistrarVisita({ opened, onClose, onVisitaRegistrada }) {
    const [nombreVisitante, setNombreVisitante] = useState('');
    const [tipoVisitaId, setTipoVisitaId] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [tiposVisita, setTiposVisita] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [cargandoTipos, setCargandoTipos] = useState(false);
    const [errores, setErrores] = useState({});

    // Cargar catálogo de tipos de visita
    useEffect(() => {
        if (!opened) return;
        const cargarTipos = async () => {
            try {
                setCargandoTipos(true);
                const res = await api.tipoVisita.obtenerTodos();
                if (res.responseFlag === 0 && Array.isArray(res.data)) {
                    setTiposVisita(res.data);
                    if (res.data.length > 0 && !tipoVisitaId) {
                        setTipoVisitaId(String(res.data[0].id));
                    }
                }
            } catch (err) {
                notifications.show({
                    title: 'Error de catálogo',
                    message: err.message || 'No se pudieron cargar los tipos de visita',
                    color: 'red'
                });
            } finally {
                setCargandoTipos(false);
            }
        };
        cargarTipos();
    }, [opened]);

    // Obtener costo del tipo de visita seleccionado
    const tipoSeleccionado = tiposVisita.find((t) => String(t.id) === String(tipoVisitaId));
    const costoActual = tipoSeleccionado ? Number(tipoSeleccionado.costo || 0).toFixed(2) : '0.00';

    const limpiarFormulario = () => {
        setNombreVisitante('');
        setObservaciones('');
        setErrores({});
        if (tiposVisita.length > 0) {
            setTipoVisitaId(String(tiposVisita[0].id));
        }
    };

    const handleClose = () => {
        if (guardando) return;
        limpiarFormulario();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nuevosErrores = {};
        if (!nombreVisitante.trim()) {
            nuevosErrores.nombreVisitante = 'El nombre del visitante es requerido';
        }
        if (!tipoVisitaId) {
            nuevosErrores.tipoVisitaId = 'Selecciona un tipo de visita';
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        try {
            setGuardando(true);
            const res = await api.visita.crear({
                nombreVisitante: nombreVisitante.trim(),
                tipoVisitaId: Number(tipoVisitaId),
                observaciones: observaciones.trim() || null
            });

            if (res.responseFlag === 0) {
                notifications.show({
                    title: 'Visita registrada',
                    message: `Se registró la visita de ${nombreVisitante.trim()} ($${costoActual})`,
                    color: 'green'
                });
                limpiarFormulario();
                onClose();
                if (onVisitaRegistrada) onVisitaRegistrada(res.data);
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            notifications.show({
                title: 'Error al registrar visita',
                message: err.message || 'No se pudo guardar la visita',
                color: 'red'
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={handleClose}
            position="right"
            size="md"
            title={
                <Group gap="xs">
                    <IconUserPlus size={22} color="var(--mantine-color-apex-6, #FF6A00)" />
                    <Text fw={700} size="lg">Registrar Visita Temporal</Text>
                </Group>
            }
            scrollAreaComponent={ScrollArea.Autosize}
            lockScroll
            styles={{
                header: {
                    borderBottom: '1px solid #e9ecef',
                    paddingBottom: 16
                },
                body: {
                    paddingTop: 16
                }
            }}
        >
            <LoadingOverlay visible={guardando || cargandoTipos} overlayProps={{ blur: 2 }} />

            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <TextInput
                        label="Nombre completo del visitante"
                        placeholder="Ej. Carlos Mendoza Sánchez"
                        required
                        value={nombreVisitante}
                        onChange={(e) => {
                            setNombreVisitante(e.currentTarget.value);
                            setErrores((prev) => ({ ...prev, nombreVisitante: null }));
                        }}
                        error={errores.nombreVisitante}
                        leftSection={<IconUser size={18} stroke={1.5} />}
                        autoFocus
                    />

                    <NativeSelect
                        label="Tipo de Visita"
                        description="Selecciona la modalidad de pase temporal"
                        required
                        data={tiposVisita.map((t) => ({
                            value: String(t.id),
                            label: `${t.nombre} ($${Number(t.costo || 0).toFixed(2)})`
                        }))}
                        value={tipoVisitaId}
                        onChange={(e) => {
                            setTipoVisitaId(e.currentTarget.value);
                            setErrores((prev) => ({ ...prev, tipoVisitaId: null }));
                        }}
                        error={errores.tipoVisitaId}
                    />

                    <Paper p="md" withBorder radius="md" style={{ backgroundColor: '#fff9f4', borderColor: '#ffd8be' }}>
                        <Group justify="space-between" align="center">
                            <Group gap="xs">
                                <IconCash size={24} color="#e55f00" />
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total a cobrar</Text>
                                    <Text size="sm" fw={600} c="dark">Tarifa vigente del pase</Text>
                                </div>
                            </Group>
                            <Badge size="xl" variant="filled" color="apex">
                                ${costoActual} MXN
                            </Badge>
                        </Group>
                    </Paper>

                    <Textarea
                        label="Observaciones"
                        placeholder="Anotaciones adicionales o incidencias (opcional)"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.currentTarget.value)}
                        minRows={3}
                        leftSection={<IconNotes size={18} stroke={1.5} />}
                    />

                    <Group justify="flex-end" mt="xl" gap="sm">
                        <Button variant="default" onClick={handleClose} disabled={guardando}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            color="apex"
                            loading={guardando}
                            leftSection={<IconUserPlus size={18} />}
                        >
                            Registrar Visita
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Drawer>
    );
}
