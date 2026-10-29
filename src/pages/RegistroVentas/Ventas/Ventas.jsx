import { Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { TablaRegistros } from '../../../components/TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../../../components/BarraAcciones/BarraAcciones.jsx';
import classes from './Ventas.module.css';
import { api } from '../../../scripts/services/api.js';


const COLUMNAS = [
    { key: 'folio', label: 'Folio', sortable: true, filterable: true },
    { key: 'cliente', label: 'Cliente', sortable: true, filterable: true },
    { key: 'fecha', label: 'Fecha', sortable: true, filterable: true },
    { key: 'subtotal', label: 'Subtotal', sortable: false, filterable: true },
    { key: 'total', label: 'Total', sortable: false, filterable: true },
]


export function Ventas() {

    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ventas, setVentas] = useState([]);

    const cargarVentas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const respuesta = await api.venta.obtenerTodos();
            const lista = Array.isArray(respuesta) ? respuesta : respuesta?.data ?? [];

            setVentas(
                lista.map((v) => ({
                    id: v.id,
                    folio: v.folioVentaId,
                    cliente: v.cliente?.nombre ?? v.cliente ?? 'Público general',
                    fecha: v.createdAt,
                    subtotal: v.subtotal,
                    total: v.total,
                }))
            );
        } catch (e) {
            setError(e.message || 'No se pudieron cargar las ventas');
        } finally {
            setLoading(false);
        }
    }, []);

    const abrirAgregar = () => {
        navigate('/registro-de-ventas/nueva');
    };

    const handleReload = () => {
        cargarVentas();
    };

    const handleEditar = useCallback(
        (venta) => navigate(`/registro-de-ventas/${venta.id}`), [navigate]
    );

    const solicitarEliminacion = async (venta) =>{
        try {
            await api.venta.cancelarVenta(venta.id);
            notifications.show({ color: 'green', message: 'Venta cancelada' });
            cargarVentas();
        } catch (e) {
            notifications.show({ color: 'red', message: e.message || 'No se pudo cancelar la venta' });
        }
    };

    useEffect(() => {
        cargarVentas();
    }, [cargarVentas]);

        return (
            <>
                <div className={classes.crudLayout}>
                    <BarraAcciones onAdd={abrirAgregar} onReload={handleReload} />
    
                    {error && <div className={classes.errorBanner}>{error}</div>}
    
                    {loading && ventas.length === 0 ? (
                        <div className={classes.loadingBanner}>
                            <Group justify="center" gap="sm">
                                <Loader size="sm" color="apex" />
                                Cargando usuarios…
                            </Group>
                        </div>
                    ) : (
                        <TablaRegistros
                            data={ventas}
                            columns={COLUMNAS}
                            onEditar={handleEditar}
                            onEliminar={solicitarEliminacion}
                            entityLabel="venta"
                            pageSizeOptions={[10, 25, 50, 100]}
                            loading={loading}
                        />
                    )}
                </div>
            </>
        );
}
