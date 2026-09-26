import { useState, useEffect, useMemo } from 'react';
import {
    Alert,
    Anchor,
    Breadcrumbs,
    Button,
    Group,
    Loader,
    SimpleGrid,
    Text,
    ThemeIcon,
    UnstyledButton,
} from '@mantine/core';
import {
    IconAlertCircle,
    IconChevronRight,
    IconHome,
    IconLayoutGrid,
    IconLogout,
    IconUsers,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SeccionCard } from '../../components/SeccionCard/SeccionCard.jsx';
import { api } from '../../scripts/services/api.js';
import { resolverModuloPorRuta, rutaModulo } from '../../scripts/modulosRutas.js';
import classes from './Dashboard.module.css';

const iconoModulo = (nombre) => {
    if (nombre === 'Usuarios') {
        return IconUsers;
    }
    return IconLayoutGrid;
};

/**
 * Dashboard:
 * - Grid de secciones según permisos del usuario
 * - Módulos navegables por ruta
 * - Breadcrumbs coherentes en inicio, sección y módulo hijo
 */
export function Dashboard({ children, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [secciones, setSecciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [seccionActiva, setSeccionActiva] = useState(null);

    useEffect(() => {
        const cargar = async () => {
            try {
                setErrorCarga(null);
                const resp = await api.seccion.obtenerMisSecciones();

                if (resp.responseFlag !== 0) {
                    throw new Error(resp.message || 'No se pudieron cargar las secciones');
                }

                const lista = Array.isArray(resp.data) ? resp.data : [];
                setSecciones(lista);
            } catch (err) {
                setSecciones([]);
                setErrorCarga(err.message || 'Error al cargar secciones');
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, []);

    const moduloEnRuta = useMemo(
        () => resolverModuloPorRuta(secciones, location.pathname),
        [secciones, location.pathname]
    );

    const mostrarChildren = !!children;
    const enInicio = location.pathname === '/';

    const irInicio = () => {
        setSeccionActiva(null);
        navigate('/');
    };

    const abrirModulo = (modulo) => {
        const ruta = rutaModulo(modulo.nombre);
        if (ruta) {
            navigate(ruta);
        }
    };

    const seccionContexto = moduloEnRuta?.seccion ?? seccionActiva;

    const migas = [
        {
            label: 'Inicio',
            icon: <IconHome size={14} />,
            onClick: irInicio,
        },
    ];

    if (seccionContexto && (seccionActiva || moduloEnRuta)) {
        migas.push({
            label: seccionContexto.nombre,
            onClick: moduloEnRuta
                ? () => {
                      setSeccionActiva(seccionContexto);
                      navigate('/');
                  }
                : null,
        });
    }

    if (moduloEnRuta?.modulo) {
        migas.push({ label: moduloEnRuta.modulo.nombre, onClick: null });
    }

    const breadcrumbItems = migas.map((m, i) =>
        m.onClick ? (
            <Anchor
                key={i}
                component="button"
                type="button"
                onClick={m.onClick}
                size="sm"
                className={classes.breadcrumbLink}
            >
                <span className={classes.breadcrumbInner}>
                    {m.icon}
                    {m.label}
                </span>
            </Anchor>
        ) : (
            <Text key={i} size="sm" className={classes.breadcrumbCurrent}>
                {m.label}
            </Text>
        )
    );

    const renderContenidoPrincipal = () => {
        if (mostrarChildren) {
            return children;
        }

        if (cargando) {
            return (
                <Group justify="center" mt="xl">
                    <Loader color="apex" />
                    <Text c="dimmed">Cargando secciones…</Text>
                </Group>
            );
        }

        if (errorCarga) {
            return (
                <Alert
                    icon={<IconAlertCircle size={18} />}
                    title="Error al cargar"
                    color="red"
                    variant="light"
                    mt="md"
                >
                    {errorCarga}
                </Alert>
            );
        }

        if (!seccionActiva) {
            return (
                <>
                    {secciones.length === 0 ? (
                        <div className={classes.emptyState}>
                            <ThemeIcon
                                size={64}
                                variant="light"
                                color="apex"
                                radius="xl"
                                mx="auto"
                                mb="md"
                                className={classes.emptyIcon}
                            >
                                <IconLayoutGrid size={32} stroke={1.2} />
                            </ThemeIcon>
                            <Text fw={600} size="lg" c="var(--ag-color-black)">
                                Sin acceso a secciones
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                No tienes permisos asignados. Contacta al administrador.
                            </Text>
                        </div>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                            {secciones.map((sec) => (
                                <SeccionCard
                                    key={sec.id}
                                    seccion={sec}
                                    onClick={(seccion) => setSeccionActiva(seccion)}
                                />
                            ))}
                        </SimpleGrid>
                    )}
                </>
            );
        }

        return (
            <>
                <Text className={classes.pageTitle}>{seccionActiva.nombre}</Text>
                {seccionActiva.descripcion && (
                    <Text className={classes.pageSubtitle}>{seccionActiva.descripcion}</Text>
                )}
                {seccionActiva.modulos?.length === 0 ? (
                    <Text c="dimmed">Esta sección no tiene módulos disponibles.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                        {seccionActiva.modulos.map((mod) => {
                            const Icono = iconoModulo(mod.nombre);
                            const tieneRuta = !!rutaModulo(mod.nombre);

                            return (
                                <UnstyledButton
                                    key={mod.id}
                                    className={classes.moduloCard}
                                    onClick={() => abrirModulo(mod)}
                                    disabled={!tieneRuta}
                                    data-disabled={!tieneRuta || undefined}
                                >
                                    <ThemeIcon
                                        size={44}
                                        variant="light"
                                        radius="md"
                                        mb="sm"
                                        className={classes.moduloIcon}
                                    >
                                        <Icono size={24} stroke={1.5} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm" c="var(--ag-color-black)">
                                        {mod.nombre}
                                    </Text>
                                    {mod.descripcion && (
                                        <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                                            {mod.descripcion}
                                        </Text>
                                    )}
                                    {!tieneRuta && (
                                        <Text size="xs" c="dimmed" mt={6}>
                                            Ruta no configurada
                                        </Text>
                                    )}
                                </UnstyledButton>
                            );
                        })}
                    </SimpleGrid>
                )}
            </>
        );
    };

    return (
        <div className={classes.shell}>
            <header className={classes.header}>
                <UnstyledButton className={classes.logo} onClick={irInicio}>
                    Apex<span className={classes.logoAccent}>Gym</span>
                </UnstyledButton>

                <Group gap="xs">
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconLogout size={14} stroke={1.5} />}
                        onClick={onLogout}
                        className={classes.logoutBtn}
                    >
                        Cerrar sesión
                    </Button>
                </Group>
            </header>

            <main className={classes.content}>
                {(enInicio || mostrarChildren) && (
                    <Breadcrumbs
                        className={classes.breadcrumb}
                        separator={<IconChevronRight size={14} color="var(--ag-color-secondary)" />}
                    >
                        {breadcrumbItems}
                    </Breadcrumbs>
                )}

                <div className={classes.pageBody}>{renderContenidoPrincipal()}</div>
            </main>
        </div>
    );
}

export default Dashboard;
