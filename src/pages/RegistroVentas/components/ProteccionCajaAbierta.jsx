import { useEffect, useState } from 'react';
import { Button, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../../scripts/services/api.js';
import { obtenerRegistros } from '../../../utils/ventaHelper/ventaHelpers.js';
import { CajaProvider } from './CajaProvider.jsx';

export function ProteccionCajaAbierta({ onSessionExpired, children }) {
    const [intento, setIntento] = useState(0);
    const [estado, setEstado] = useState({ tipo: 'cargando' });
    const location = useLocation();

    useEffect(() => {
        let activo = true;

        const validarCajaAbierta = async () => {
            setEstado({ tipo: 'cargando' });
            try {
                const respuesta = await api.aperturaCaja.obtenerAbiertas();
                const aperturas = obtenerRegistros(respuesta, 'aperturas de caja');

                if (activo) {
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
                        notifications.show({
                            color: 'red',
                            title: 'No se pudo validar la caja',
                            message: 'Intenta nuevamente.',
                        });
                        setEstado({ tipo: 'error' });
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
                <Loader color="blue" size="xl" type="bars" />
            </Center>
        );
    }
    if (estado.tipo === 'sesion-expirada') return <Navigate to="/login" replace />;
    if (estado.tipo === 'cerrada') {
        return <Navigate to="/apertura-caja" replace state={{ from: location }} />;
    }
    if (estado.tipo === 'error') {
        return (
            <Center mih="100vh">
                <Button onClick={() => setIntento((actual) => actual + 1)}>
                    Reintentar
                </Button>
            </Center>
        );
    }

    return (
        <CajaProvider aperturas={estado.aperturas}>
            {children ?? <Outlet />}
        </CajaProvider>
    );
}
