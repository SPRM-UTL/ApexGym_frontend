import { useEffect, useState } from 'react';
import { Alert, Button, Center, Stack } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from '../../../scripts/services/api.js';
import { obtenerRegistros } from '../../../utils/ventaHelper/ventaHelpers.js';
import PantallaCarga from '../../../components/PantallaCarga.jsx';
import { CajaProvider } from './CajaProvider.jsx';

export function ProteccionCajaAbierta({ onSessionExpired }) {
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
                        setEstado({
                            tipo: 'error',
                            mensaje: error.message || 'No se pudo validar la apertura de caja.',
                        });
                    }
                }
            }
        };

        validarCajaAbierta();
        return () => {
            activo = false;
        };
    }, [intento, onSessionExpired]);

    if (estado.tipo === 'cargando') return <PantallaCarga />;
    if (estado.tipo === 'sesion-expirada') return <Navigate to="/login" replace />;
    if (estado.tipo === 'cerrada') {
        return <Navigate to="/apertura-caja" replace state={{ from: location }} />;
    }
    if (estado.tipo === 'error') {
        return (
            <Center mih="100vh" p="md">
                <Stack maw={480} w="100%">
                    <Alert color="red" title="No se pudo validar la caja">
                        {estado.mensaje}
                    </Alert>
                    <Button onClick={() => setIntento((actual) => actual + 1)}>
                        Reintentar
                    </Button>
                </Stack>
            </Center>
        );
    }

    return (
        <CajaProvider aperturas={estado.aperturas}>
            <Outlet />
        </CajaProvider>
    );
}
