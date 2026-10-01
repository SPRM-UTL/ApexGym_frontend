import { Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TablaRegistros } from '../../../components/TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../../../components/BarraAcciones/BarraAcciones.jsx';
import classes from './Ventas.module.css';
import { useLocation, useNavigate } from 'react-router-dom';

const COLUMNAS = [
    { key: 'folio', label: 'Folio', sortable: true, filterable: true },
    { key: 'cliente', label: 'Cliente', sortable: true, filterable: true },
    { key: 'fecha', label: 'Fecha', sortable: true, filterable: true },
    { key: 'subtotal', label: 'Subtotal', sortable: false, filterable: true },
    { key: 'total', label: 'Total', sortable: false, filterable: true },
];


export function Ventas() {

    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const datosPrueba = [
        {
            folio: "FOLIO1",
            cliente: "Ramiro",
            fecha: "29/09/2026",
            subtotal: 243.3,
            total: 250
        },
        {
            folio: "FOLIO1",
            cliente: "Ramiro",
            fecha: "29/09/2026",
            subtotal: 243.3,
            total: 250
        },
        {
            folio: "FOLIO1",
            cliente: "Ramiro",
            fecha: "29/09/2026",
            subtotal: 243.3,
            total: 250
        }
    ]

    const abrirAgregar = () => {
        navigate('/registro-de-ventas/nueva');
    };

    const handleReload = () => {
        
    };

    const handleEditar = useCallback(

    );

    const solicitarEliminacion = () => {
    };

        return (
            <>
                <div className={classes.crudLayout}>
                    <BarraAcciones onAdd={abrirAgregar} onReload={handleReload} />
    
                    {error && <div className={classes.errorBanner}>{error}</div>}
    
                    {loading && datosPrueba.length === 0 ? (
                        <div className={classes.loadingBanner}>
                            <Group justify="center" gap="sm">
                                <Loader size="sm" color="apex" />
                                Cargando usuarios…
                            </Group>
                        </div>
                    ) : (
                        <TablaRegistros
                            data={datosPrueba}
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
