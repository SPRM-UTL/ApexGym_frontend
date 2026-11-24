import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconWifiOff } from '@tabler/icons-react';
import { api } from '../../../scripts/services/api.js';
import { estaApiSinConexion } from '../../../scripts/services/httpClient.js';
import { obtenerRegistros } from '../../../utils/ventaHelper/ventaHelpers.js';
import { CajaProvider } from './CajaProvider.jsx';

export function ProteccionCajaAbierta({ onSessionExpired, children }) {
    const [intento, setIntento] = useState(0);
    const [estado, setEstado] = useState({ tipo: 'cargando' });
    const location = useLocation();
    const navigate = useNavigate();
    const avisoOfflineMostradoRef = useRef(false);

    useEffect(() => {
        let activo = true;

        const validarCajaAbierta = async () => {
            setEstado({ tipo: 'cargando' });
            try {
                const respuesta = await api.aperturaCaja.obtenerAbiertas();
                const aperturas = obtenerRegistros(respuesta, 'aperturas de caja');

                if (activo) {
                    if (respuesta?.fromOfflineCache && aperturas.length > 0 && !avisoOfflineMostradoRef.current) {
                        avisoOfflineMostradoRef.current = true;
                        notifications.show({
                            color: 'orange',
                            title: 'Operando con caché local de caja',
                            message: 'Sin conexión: solo se permitirán ventas en efectivo.',
                        });
                    }
                    setEstado(aperturas.length > 0
                        ? { tipo: 'abierta', aperturas }
                        : { tipo: 'cerrada' });
                }
            } catch (error) {
                if (activo) {
                    if (error.statusCode === 401) {
                        onSessionExpired();
                        setEstado({ tipo: 'sesion-expirada' });
                    } else {
                        const sinRed = estaApiSinConexion()
                            || (typeof navigator !== 'undefined' && navigator.onLine === false);
                        notifications.show({
                            color: 'red',
                            title: sinRed
                                ? 'Sin conexión y sin caja en caché local'
                                : 'No se pudo validar la caja',
                            message: sinRed
                                ? 'Conéctate a internet y sincroniza datos locales antes de vender sin conexión.'
                                : 'Intenta nuevamente.',
                        });
                        setEstado({ tipo: 'error', sinRed });
                    }
                }
            }
        };

        validarCajaAbierta();
        return () => {
            activo = false;
        };
    }, [intento, onSessionExpired]);

    if (estado.tipo === 'cargando') {
        return (
            <Center mih={320}>
                <Loader color="apex" size="xl" type="bars" />
            </Center>
        );
    }
    if (estado.tipo === 'sesion-expirada') return <Navigate to="/login" replace />;
    if (estado.tipo === 'cerrada') {
        return <Navigate to="/apertura-caja" replace state={{ from: location }} />;
    }
    if (estado.tipo === 'error') {
        return (
            <Center mih={320} p="md">
                <Stack align="center" maw={440} gap="md">
                    <Alert
                        color={estado.sinRed ? 'orange' : 'red'}
                        icon={<IconWifiOff size={18} />}
                        title={estado.sinRed ? 'Sin conexión y sin caché de apertura de caja' : 'No se pudo validar la caja'}
                    >
                        <Text size="sm">
                            {estado.sinRed
                                ? 'Para vender sin conexión primero inicia con internet y presiona "Sincronizar ahora" con una caja abierta.'
                                : 'No se pudo confirmar si hay una caja abierta en la sucursal.'}
                        </Text>
                    </Alert>
                    <Group>
                        <Button variant="default" onClick={() => navigate('/registro-de-ventas')}>
                            Volver a Ventas
                        </Button>
                        <Button onClick={() => setIntento((actual) => actual + 1)}>
                            Reintentar
                        </Button>
                    </Group>
                </Stack>
            </Center>
        );
    }

    return (
        <CajaProvider aperturas={estado.aperturas}>
            {children ?? <Outlet />}
        </CajaProvider>
    );
}
