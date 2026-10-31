import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
    IconShoppingCart,
} from '@tabler/icons-react';

import { cambioNombreWeb } from '../../../scripts/globales.js';
import { api } from '../../../scripts/services/api.js';
import { CrudCatalogo } from '../../../components/CrudCatalogo/CrudCatalogo.jsx';

const COLUMNAS = [
    { key: 'folio', label: 'Folio', sortable: true, filterable: true },
    { key: 'cliente', label: 'Cliente', sortable: true, filterable: true },
    { key: 'fecha', label: 'Fecha', sortable: true, filterable: true },
    { key: 'subtotal', label: 'Subtotal', sortable: false, filterable: true },
    { key: 'total', label: 'Total', sortable: false, filterable: true },
];

const CAMPOS = [
    {
        key: 'clienteId',
        label: 'Cliente',
        type: 'select',
        required: true,
        loadOptions: async () => {
            const response = await api.cliente.obtenerTodos();

            return (response.data ?? []).map((cliente) => ({
                value: String(cliente.id),
                label: `${cliente.nombre} ${cliente.apellidoPaterno ?? ''} ${cliente.apellidoMaterno ?? ''}`.trim(),
            }));
        },
    },
    {
        key: 'metodoPagoId',
        label: 'Método de pago',
        type: 'select',
        required: true,
        loadOptions: async () => {
            const response = await api.metodosPago.obtenerTodos();

            return (response.data ?? []).map((metodo) => ({
                value: String(metodo.id),
                label: metodo.nombre,
            }));
        },
    },
];

const INICIAL = {
    clienteId: '',
    metodoPagoId: '',
};



export function Ventas() {
    cambioNombreWeb('Ventas');

    const navigate = useNavigate();
    const [ventas, setVentas] = useState([]);

    const cargarVentas = useCallback(async () => {
        try {
            const respuesta = await api.venta.obtenerTodos();
            const lista = Array.isArray(respuesta)
                ? respuesta
                : respuesta?.data ?? [];

            setVentas(lista);
        } catch (e) {
            notifications.show({
                color: 'red',
                message: e.message || 'No se pudieron cargar las ventas',
            });
        }
    }, []);

    useEffect(() => {
        cargarVentas();
    }, [cargarVentas]);

const handleEditar =  (form) => {
    navigate(`/registro-de-ventas/${form.editingId}`, {
        state: { 
            metodoPago: form.metodoPago 
        }
    });
};

const abrirAgregar =  ({form}) => {
    navigate('/registro-de-ventas/nueva', {
        state: { 
            clienteId: form.clienteId,
            metodoPagoId: form.metodoPagoId,
        }
    });
};

    const mapRecordToForm = (venta) => ({
        clienteId: venta.cliente?.id
            ? String(venta.cliente.id)
            : '',
        metodoPagoId: venta.metodoPago?.id
            ? String(venta.metodoPago.id)
            : '',
    });

    const mapFormToPayload = (form) => ({
        clienteId: form.clienteId || null,
        metodoPagoId: form.metodoPagoId || null,
    });
    const mapRecordToRow = (v) => ({
        id: v.id,
        folio: v.folioVentaId ?? '—',
        cliente: v.cliente?.nombre ?? v.cliente ?? 'Público general',
        fecha: v.createdAt
            ? new Date(v.createdAt).toLocaleDateString('es-MX')
            : '—',
        subtotal: v.subtotal,
        total: v.total,
    });
    
    


    return (
        <CrudCatalogo
            titulo="Registro de Ventas"
            singular="Venta"
            icon={IconShoppingCart}
            servicio={api.venta}
            columnas={COLUMNAS}
            campos={CAMPOS}
            valoresIniciales={INICIAL}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            permitirAgregar = {false}
            permitirEditar={true}
            permitirEliminar={true}
            formMode="drawer"
            drawerSize={620}
            headerVariant="unified"
            tableHeaderVariant="neutral"
            persistencia={{
                clave: 'ventas.formulario',
                campos: ['clienteId', 'metodoPagoId'],
            }}
            createPersonalized = {abrirAgregar}
            updatePersonalized = {handleEditar}
        />
    );
}

export default Ventas;