import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Alert,
    Anchor,
    Badge,
    Breadcrumbs,
    Button,
    Group,
    Loader,
    Menu,
    SimpleGrid,
    Text,
    ThemeIcon,
    UnstyledButton,
    Space,
    Image
} from '@mantine/core';
import {
    IconAlertCircle,
    IconBuildingStore,
    IconChevronDown,
    IconChevronRight,
    IconHome,
    IconLayoutGrid,
    IconLogout,
    IconRefresh,
    IconUsers,
} from '@tabler/icons-react';
import { isSession, useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '../../components/UserButton/UserButton.jsx';
import { ModuloCard } from '../../components/ModuloCard/ModuloCard.jsx';
import { SeccionCard } from '../../components/SeccionCard/SeccionCard.jsx';
import { SucursalCard } from '../../components/SucursalCard/SucursalCard.jsx';
import { notifications } from '@mantine/notifications';
import { api } from '../../scripts/services/api.js';
import { obtenerUsuarioActual } from '../../scripts/constantes.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { resolverModuloPorRuta, rutaModulo } from '../../scripts/modulosRutas.js';
import { useSucursal } from '../../context/SucursalContext.jsx';
import classes from './Dashboard.module.css';
import logoImg from '../../assets/apex_gym_large.png';

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
    const usuarioActual = obtenerUsuarioActual();
    const contentRef = useRef(null);
    const {
        sucursalActiva,
        sucursales,
        seleccionarSucursal,
        sucursalConfirmada,
        confirmarSucursal,
        desconfirmarSucursal,
    } = useSucursal();

    const [secciones, setSecciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [seccionActiva, setSeccionActiva] = useState(null);

    useEffect(() => {
        contentRef.current?.scrollTo(0, 0);
    }, [location.pathname, seccionActiva]);

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

    cambioNombreWeb(
        !sucursalConfirmada
            ? 'Seleccionar Sucursal'
            : !mostrarChildren
            ? seccionActiva?.nombre || 'Inicio'
            : moduloEnRuta?.modulo?.nombre || null
    );

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

    if (!sucursalConfirmada) {
        migas.push({
            label: 'Seleccionar Sucursal',
        });
    } else if (seccionContexto && (seccionActiva || moduloEnRuta)) {
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
        if (!sucursalConfirmada) {
            return (
                <>
                    <Text className={classes.pageTitle}>Seleccionar Sucursal de Operación</Text>
                    <Text className={classes.pageSubtitle}>
                        Cada sucursal cuenta con diferentes empleados, productos, cajas e inventario. Elige la sede con la que deseas operar hoy:
                    </Text>
                    <Space h={16} />
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                        {sucursales.map((suc) => (
                            <SucursalCard
                                key={suc.id}
                                sucursal={suc}
                                esActiva={suc.id === sucursalActiva?.id}
                                onClick={(s) => {
                                    confirmarSucursal(s.id);
                                    notifications.show({
                                        title: 'Sucursal seleccionada',
                                        message: `Operando en ${s.nombre}`,
                                        color: 'orange',
                                    });
                                }}
                            />
                        ))}
                    </SimpleGrid>
                </>
            );
        }

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
                        <>
                            <Space h={24} />
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                                {secciones.map((sec) => (
                                    <SeccionCard
                                        key={sec.id}
                                        seccion={sec}
                                        onClick={(seccion) => setSeccionActiva(seccion)}
                                    />
                                ))}
                            </SimpleGrid>
                        </>
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
                                <ModuloCard
                                    key={mod.id}
                                    modulo={mod}
                                    icon={Icono}
                                    onClick={() => abrirModulo(mod)}
                                    disabled={!tieneRuta}
                                />
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
                    <Image
                        radius="md"
                        h={90}
                        src={logoImg}
                    />
                </UnstyledButton>

                <Group gap="sm" wrap="nowrap">
                    {sucursales && sucursales.length > 0 && (
                        <Menu shadow="md" width={240} position="bottom-end">
                            <Menu.Target>
                                <Button
                                    className={classes.sucursalBtn}
                                    size="xs"
                                    radius="md"
                                    leftSection={<IconBuildingStore size={16} stroke={1.6} />}
                                    rightSection={<IconChevronDown size={14} stroke={1.6} />}
                                >
                                    {sucursalActiva?.nombre || 'Sucursal Matriz'}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Sucursal en sesión</Menu.Label>
                                {sucursales.map((s) => {
                                    const esActiva = s.id === sucursalActiva?.id;
                                    return (
                                        <Menu.Item
                                            key={s.id}
                                            onClick={() => {
                                                if (s.id !== sucursalActiva?.id) {
                                                    seleccionarSucursal(s.id);
                                                    notifications.show({
                                                        title: 'Sucursal cambiada',
                                                        message: `Cargando datos de ${s.nombre}...`,
                                                        color: 'orange',
                                                        autoClose: 2500,
                                                    });
                                                }
                                            }}
                                            leftSection={<IconBuildingStore size={14} />}
                                            color={esActiva ? 'orange' : undefined}
                                        >
                                            <Group justify="space-between" wrap="nowrap" gap="xs">
                                                <span>{s.nombre}</span>
                                                {esActiva && (
                                                    <Badge size="xs" color="orange" variant="light">
                                                        Activa
                                                    </Badge>
                                                )}
                                            </Group>
                                        </Menu.Item>
                                    );
                                })}
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<IconRefresh size={14} />}
                                    onClick={() => {
                                        desconfirmarSucursal();
                                        navigate('/');
                                    }}
                                >
                                    Cambiar de sucursal...
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    )}
                    <UserButton usuario={usuarioActual} />
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

            <main ref={contentRef} className={classes.content}>
                {(enInicio || mostrarChildren) && (
                    <>
                        <Space h={8} />
                        <Breadcrumbs
                            className={classes.breadcrumb}
                            separator={<IconChevronRight size={14} color="var(--ag-color-secondary)" />}
                        >
                            {breadcrumbItems}
                        </Breadcrumbs>
                    </>
                )}

                <div key={`sucursal-${sucursalActiva?.id || 1}`} className={classes.pageBody}>
                    {renderContenidoPrincipal()}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
