import { useEffect, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Divider,
    Grid,
    Group,
    Loader,
    Paper,
    Tabs,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconBuildingSkyscraper,
    IconCheck,
    IconClock,
    IconDeviceFloppy,
    IconMapPin,
    IconReceipt2,
    IconRefresh,
} from '@tabler/icons-react';
import { DEFAULT_EMPRESA, useEmpresa } from '../../context/EmpresaContext.jsx';
import { cambioNombreWeb } from '../../scripts/globales.js';
import classes from './Empresa.module.css';

export function Empresa() {
    cambioNombreWeb('Empresa');

    const { empresa, cargandoEmpresa, recargarEmpresa, actualizarEmpresa } = useEmpresa();

    const [form, setForm] = useState(() => ({ ...DEFAULT_EMPRESA, ...(empresa || {}) }));
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (empresa) {
            setForm((prev) => ({ ...prev, ...empresa }));
        }
    }, [empresa]);

    const validarCampo = (key, value) => {
        if (key === 'nombreComercial') {
            if (!String(value ?? '').trim()) {
                return 'El nombre comercial es obligatorio';
            }
            if (String(value).trim().length > 150) {
                return 'Máximo 150 caracteres';
            }
        }
        if (key === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value).trim())) {
                return 'Ingresa un correo electrónico válido';
            }
        }
        return null;
    };

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (touched[key] || errors[key]) {
            const errorMsg = validarCampo(key, value);
            setErrors((prev) => ({ ...prev, [key]: errorMsg }));
        }
    };

    const handleBlur = (key) => {
        setTouched((prev) => ({ ...prev, [key]: true }));
        const errorMsg = validarCampo(key, form[key]);
        setErrors((prev) => ({ ...prev, [key]: errorMsg }));
    };

    const validarTodo = () => {
        const nuevosErrores = {};
        for (const campo of ['nombreComercial', 'email']) {
            const err = validarCampo(campo, form[campo]);
            if (err) {
                nuevosErrores[campo] = err;
            }
        }
        setTouched({ nombreComercial: true, email: true });
        setErrors(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleGuardar = async (e) => {
        e?.preventDefault();
        if (!validarTodo()) {
            notifications.show({
                title: 'Revisa los campos requeridos',
                message: 'Corrige los campos marcados antes de guardar la configuración.',
                color: 'red',
            });
            return;
        }

        setGuardando(true);
        try {
            const respuesta = await actualizarEmpresa(form);
            notifications.show({
                title: 'Empresa actualizada',
                message: respuesta?.message || 'Los datos corporativos se guardaron correctamente.',
                color: 'teal',
                icon: <IconCheck size={18} />,
            });
        } catch (error) {
            notifications.show({
                title: 'Error al guardar',
                message: error?.message || 'No fue posible actualizar los datos de la empresa.',
                color: 'red',
                icon: <IconAlertCircle size={18} />,
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className={classes.layout}>
            <div className={classes.unifiedHeader}>
                <Group gap="sm" align="center">
                    <IconBuildingSkyscraper
                        size={38}
                        stroke={1.8}
                        color="var(--mantine-color-secondary-6)"
                    />
                    <Divider orientation="vertical" color="secondary.9" size="2" />
                    <Title order={2} className={classes.unifiedTitle}>
                        Empresa
                    </Title>
                    <Badge color={form.activo ? 'teal' : 'gray'} variant="light" size="sm" radius="sm">
                        {form.activo ? 'ACTIVA' : 'INACTIVA'}
                    </Badge>
                </Group>

                <Group gap="sm">
                    <Button
                        variant="default"
                        radius="md"
                        leftSection={<IconRefresh size={16} />}
                        loading={cargandoEmpresa}
                        onClick={recargarEmpresa}
                    >
                        Recargar
                    </Button>
                    <Button
                        className={classes.saveButton}
                        radius="md"
                        color="apex"
                        leftSection={<IconDeviceFloppy size={16} />}
                        loading={guardando}
                        onClick={handleGuardar}
                    >
                        Guardar cambios
                    </Button>
                </Group>
            </div>

            {cargandoEmpresa && (
                <Alert icon={<Loader size={16} />} color="orange" variant="light" title="Sincronizando datos">
                    Cargando configuración actual de la empresa...
                </Alert>
            )}

            <Paper withBorder radius="lg" p="lg" shadow="xs" component="form" onSubmit={handleGuardar} noValidate>
                <Tabs defaultValue="identidad" color="orange" radius="md">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="identidad" leftSection={<IconBuildingSkyscraper size={16} />}>
                            Identidad Fiscal y Comercial
                        </Tabs.Tab>
                        <Tabs.Tab value="ubicacion" leftSection={<IconMapPin size={16} />}>
                            Contacto y Ubicación
                        </Tabs.Tab>
                        <Tabs.Tab value="operacion" leftSection={<IconClock size={16} />}>
                            Operación, Moneda y Tickets
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* Tab 1: Identidad Fiscal y Comercial */}
                    <Tabs.Panel value="identidad">
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Nombre Comercial"
                                    placeholder="Ej. ApexGym"
                                    withAsterisk
                                    required
                                    value={form.nombreComercial ?? ''}
                                    error={touched.nombreComercial ? errors.nombreComercial : null}
                                    onBlur={() => handleBlur('nombreComercial')}
                                    onChange={(e) => handleChange('nombreComercial', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Razón Social"
                                    placeholder="Ej. ApexGym S.A. de C.V."
                                    value={form.razonSocial ?? ''}
                                    onChange={(e) => handleChange('razonSocial', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="RFC"
                                    placeholder="Ej. APX260101AAA"
                                    value={form.rfc ?? ''}
                                    onChange={(e) => handleChange('rfc', e.currentTarget.value.toUpperCase())}
                                />
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    {/* Tab 2: Contacto y Ubicación */}
                    <Tabs.Panel value="ubicacion">
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Teléfono de Contacto"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="Ej. 555-019-2834"
                                    value={form.telefono ?? ''}
                                    onChange={(e) => handleChange('telefono', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Correo Electrónico Oficial"
                                    type="email"
                                    autoComplete="email"
                                    description="Formato esperado: contacto@empresa.com"
                                    placeholder="contacto@apexgym.com"
                                    value={form.email ?? ''}
                                    error={touched.email ? errors.email : null}
                                    onBlur={() => handleBlur('email')}
                                    onChange={(e) => handleChange('email', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12 }}>
                                <TextInput
                                    label="Dirección Fiscal / Sucursal"
                                    autoComplete="street-address"
                                    placeholder="Av. Principal #100, Col. Centro"
                                    value={form.direccion ?? ''}
                                    onChange={(e) => handleChange('direccion', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 4 }}>
                                <TextInput
                                    label="Ciudad"
                                    placeholder="Ciudad de México"
                                    value={form.ciudad ?? ''}
                                    onChange={(e) => handleChange('ciudad', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 4 }}>
                                <TextInput
                                    label="Estado"
                                    placeholder="CDMX"
                                    value={form.estado ?? ''}
                                    onChange={(e) => handleChange('estado', e.currentTarget.value)}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 4 }}>
                                <TextInput
                                    label="Código Postal"
                                    autoComplete="postal-code"
                                    placeholder="06000"
                                    value={form.codigoPostal ?? ''}
                                    onChange={(e) => handleChange('codigoPostal', e.currentTarget.value)}
                                />
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    {/* Tab 3: Operación, Moneda y Tickets */}
                    <Tabs.Panel value="operacion">
                        <Grid gutter="md">
                            <Grid.Col span={{ base: 12 }}>
                                <Textarea
                                    label="Mensaje en Pie de Ticket / Reporte de Corte PDF"
                                    placeholder="¡Gracias por entrenar en ApexGym!"
                                    minRows={3}
                                    leftSection={<IconReceipt2 size={16} />}
                                    value={form.mensajeTicket ?? ''}
                                    onChange={(e) => handleChange('mensajeTicket', e.currentTarget.value)}
                                />
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>
                </Tabs>

                <Divider my="lg" />

                <Group justify="flex-end">
                    <Button
                        type="submit"
                        className={classes.saveButton}
                        radius="md"
                        color="apex"
                        leftSection={<IconDeviceFloppy size={16} />}
                        loading={guardando}
                    >
                        Guardar configuración de empresa
                    </Button>
                </Group>
            </Paper>
        </div>
    );
}

export default Empresa;
