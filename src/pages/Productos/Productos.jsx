import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Group,
    SimpleGrid,
    Stack,
    Tabs,
    Tooltip,
} from '@mantine/core';
import {
    IconBuildingWarehouse,
    IconCheck,
    IconEdit,
    IconExternalLink,
    IconPackage,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { useSecciones } from '../../context/SeccionesContext.jsx';
import { rutaModulo, tieneAccesoModulo } from '../../scripts/modulosRutas.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionTitle, FInput, FSelect, FTextarea, FCheckbox } from '../../components/Controles/ControlesComponent.jsx';
import { CampoImagen } from '../../components/CampoImagen/CampoImagen.jsx';
import { PedidosCompraPanel } from './PedidosCompraPanel.jsx';
import { Almacenes } from '../Almacenes/Almacenes.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre de Producto', required: true },
    { key: 'imagen', label: 'Imagen del producto', type: 'image' },
    { key: 'codigoBarras', label: 'Código de barras', required: true },
    {
        key: 'categoriaProductoId',
        label: 'Categoría',
        required: true,
        loadOptions: async () => {
            try {
                const res = await api.categoriaProducto.obtenerTodas();
                return (res.data ?? []).map((c) => ({ value: String(c.id), label: c.nombre }));
            } catch (err) {
                console.error('[Productos] Error al cargar categorías:', err);
                return [];
            }
        },
    },
    { key: 'precioVenta', label: 'Precio Venta', required: true, type: 'number', min: 0 },
    { key: 'descuentoPorcentaje', label: 'Descuento (%)', type: 'number', min: 0, max: 100, step: 0.01, decimalScale: 2 },
    { key: 'precioCompra', label: 'Precio Compra', required: true, type: 'number', min: 0 },
    { key: 'stockActual', label: 'Stock Actual', required: true, type: 'number', min: 0 },
    { key: 'stockMinimo', label: 'Stock Mínimo', required: true, type: 'number', min: 0 },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado', label: 'Estado', required: true },
    { key: 'disponibleCompra', label: 'Disponible' },
];

const INICIAL = {
    nombre: '',
    imagen: null,
    descripcion: '',
    codigoBarras: '',
    categoriaProductoId: '',
    precioVenta: '',
    descuentoPorcentaje: 0,
    precioCompra: '',
    stockActual: '',
    stockMinimo: '',
    estado: 'ACTIVO',
    disponibleCompra: true,
    imagenUrl: '',
    quitarImagen: false,
};

const COLUMNAS_PRODUCTOS = [
    { key: 'codigoBarras', label: 'Código', sortable: true, filterable: true },
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'categoriaNombre', label: 'Categoría', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'precioVentaTexto', label: 'Precio Venta', sortable: true, filterable: false },
    { key: 'descuentoPorcentajeTexto', label: 'Descuento', sortable: false, filterable: false },
    { key: 'precioCompraTexto', label: 'Precio Compra', sortable: true, filterable: false },
    { key: 'stockActual', label: 'Stock Actual', sortable: true, filterable: false },
    { key: 'stockMinimo', label: 'Stock Mínimo', sortable: true, filterable: false },
    { key: 'estadoBadge', label: 'Estado', sortable: true, filterable: false },
    { key: 'disponibleCompra', label: 'Disponible', sortable: true, filterable: false },
];

function ProductoForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <Stack gap="md">
                    <FInput
                        label="Nombre de Producto"
                        required
                        placeholder="Ej. Creatina Monohidratada"
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />
                    <Box>
                        <SectionTitle
                            rightSection={
                                form.imagen instanceof File || (form.imagenUrl && !form.quitarImagen) ? (
                                    <Button
                                        variant="outline"
                                        color="red"
                                        size="compact-xs"
                                        radius="md"
                                        leftSection={<IconTrash size={14} stroke={1.8} />}
                                        onClick={() => {
                                            onChange('imagen', null);
                                            onChange('quitarImagen', Boolean(form.imagenUrl));
                                        }}
                                        styles={{
                                            root: {
                                                border: '1px solid #EF4444',
                                                backgroundColor: '#FEF2F2',
                                                color: '#DC2626',
                                                fontWeight: 600,
                                                '&:hover': {
                                                    backgroundColor: '#FEE2E2',
                                                },
                                            },
                                        }}
                                    >
                                        Quitar imagen
                                    </Button>
                                ) : null
                            }
                        >
                            Imagen del producto
                        </SectionTitle>
                        <CampoImagen
                            imagen={form.imagen instanceof File
                                ? form.imagen
                                : form.quitarImagen
                                    ? null
                                    : form.imagenUrl}
                            onChange={(imagen) => {
                                onChange('imagen', imagen);
                                onChange('quitarImagen', false);
                            }}
                        />
                    </Box>
                    <SectionTitle>Información general</SectionTitle>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput
                            label="Código de barras"
                            required
                            placeholder="Ej. 750123456789"
                            value={form.codigoBarras}
                            error={errors.codigoBarras}
                            onChange={(v) => onChange('codigoBarras', v)}
                        />
                        <FSelect
                            label="Categoría"
                            required
                            placeholder="Selecciona una categoría"
                            options={fieldOptions?.categoriaProductoId ?? []}
                            value={form.categoriaProductoId}
                            error={errors.categoriaProductoId}
                            onChange={(v) => onChange('categoriaProductoId', v)}
                        />
                        <FSelect
                            label="Estado"
                            required
                            placeholder="Selecciona un estado"
                            options={[
                                { value: 'ACTIVO', label: 'Activo' },
                                { value: 'INACTIVO', label: 'Inactivo' },
                            ]}
                            value={form.estado}
                            error={errors.estado}
                            onChange={(v) => onChange('estado', v)}
                        />
                    </SimpleGrid>
                    <FTextarea
                        label="Descripción"
                        placeholder="Breve descripción del producto"
                        value={form.descripcion}
                        error={errors.descripcion}
                        onChange={(v) => onChange('descripcion', v)}
                    />
                    <FCheckbox
                        label="Producto Disponible"
                        mt="xl"
                        size="md"
                        checked={form.disponibleCompra}
                        onChange={(v) => onChange('disponibleCompra', v)}
                    />
                </Stack>
            </Box>

            <Box>
                <SectionTitle>Precios e inventario</SectionTitle>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                    <FInput
                        label="Precio Compra"
                        required
                        type="number"
                        placeholder="Ej. 150.00"
                        value={form.precioCompra}
                        error={errors.precioCompra}
                        onChange={(v) => onChange('precioCompra', v)}
                    />
                    <FInput
                        label="Precio Venta"
                        required
                        type="number"
                        placeholder="Ej. 499.00"
                        value={form.precioVenta}
                        error={errors.precioVenta}
                        onChange={(v) => onChange('precioVenta', v)}
                    />
                    <FInput
                        label="Descuento (%)"
                        type="number"
                        placeholder="Ej. 10"
                        value={form.descuentoPorcentaje}
                        error={errors.descuentoPorcentaje}
                        onChange={(v) => onChange('descuentoPorcentaje', v)}
                    />
                    <FInput
                        label="Stock Actual"
                        required
                        type="number"
                        placeholder="Ej. 100"
                        value={form.stockActual}
                        error={errors.stockActual}
                        onChange={(v) => onChange('stockActual', v)}
                    />
                    <FInput
                        label="Stock Mínimo"
                        required
                        type="number"
                        placeholder="Ej. 10"
                        value={form.stockMinimo}
                        error={errors.stockMinimo}
                        onChange={(v) => onChange('stockMinimo', v)}
                    />
                </SimpleGrid>
            </Box>
        </Stack>
    );
}

export function Productos() {
    cambioNombreWeb('Productos');
    const navigate = useNavigate();
    const { secciones } = useSecciones();
    const [tabActiva, setTabActiva] = useState('catalogo');
    const [refreshCatalogoKey, setRefreshCatalogoKey] = useState(0);
    const [pendientesPedidos, setPendientesPedidos] = useState(0);

    const puedeAbrirModuloAlmacenes = useMemo(
        () => tieneAccesoModulo(secciones, 'inventario', 'almacenes'),
        [secciones]
    );
    const rutaAlmacenes = rutaModulo('Almacenes', 'Inventario') || '/inventario/almacenes';

    const cargarConteoPendientes = useCallback(async () => {
        try {
            const res = await api.pedidoCompra.obtenerTodos('PENDIENTE');
            const lista = Array.isArray(res?.data) ? res.data : [];
            setPendientesPedidos(lista.length);
        } catch {
            // El contador inicial es informativo; PedidosCompraPanel muestra errores si falla al abrir.
        }
    }, []);

    useEffect(() => {
        cargarConteoPendientes();
    }, [cargarConteoPendientes]);

    const handleInventarioActualizado = useCallback(() => {
        setRefreshCatalogoKey((prev) => prev + 1);
    }, []);

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        imagen: null,
        descripcion: record.descripcion ?? '',
        codigoBarras: record.codigoBarras ?? '',
        categoriaProductoId: record.categoriaProductoId
            ? String(record.categoriaProductoId)
            : record.categoria?.id
                ? String(record.categoria.id)
                : '',
        precioVenta: record.precioVenta ?? '',
        descuentoPorcentaje: record.descuentoPorcentaje ?? 0,
        precioCompra: record.precioCompra ?? '',
        stockActual: record.stockActual ?? '',
        stockMinimo: record.stockMinimo ?? '',
        estado: record.estado ?? 'ACTIVO',
        disponibleCompra: record.disponibleCompra,
        imagenUrl: record.imagenUrl ?? '',
        quitarImagen: false,
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre ?? '',
        imagen: form.imagen instanceof File ? form.imagen : null,
        quitarImagen: Boolean(form.quitarImagen),
        descripcion: form.descripcion || null,
        codigoBarras: form.codigoBarras ? String(form.codigoBarras) : null,
        categoriaProductoId: Number(form.categoriaProductoId),
        precioVenta: Number(form.precioVenta),
        descuentoPorcentaje: Number(form.descuentoPorcentaje ?? 0),
        precioCompra: form.precioCompra ? Number(form.precioCompra) : null,
        stockActual: Number(form.stockActual ?? 0),
        stockMinimo: Number(form.stockMinimo ?? 1),
        estado: form.estado || 'ACTIVO',
        disponibleCompra: form.disponibleCompra,
    });

    const colorStock = (actual, minimo) => {
        const stock = Number(actual ?? 0);
        const min = Number(minimo ?? 0);
        if (stock <= 0) return 'red';
        if (stock <= min) return 'orange';
        return 'green';
    };

    const mapRecordToRow = (record) => {
        const stockActualNum = Number(record.stockActual ?? 0);
        const stockMinimoNum = Number(record.stockMinimo ?? 0);
        const disponible = record.disponibleCompra;
        const estado = String(record.estado ?? 'ACTIVO').trim().toUpperCase();
        return {
            id: record.id,
            nombre: record.nombre ?? '',
            descripcion: record.descripcion ?? '—',
            codigoBarras: record.codigoBarras ?? '—',
            categoriaNombre: record.categoria?.nombre ?? 'Sin categoría',
            precioVentaTexto: record.precioVenta !== undefined && record.precioVenta !== null ? `$${Number(record.precioVenta).toFixed(2)}` : '—',
            descuentoPorcentajeTexto: `${Number(record.descuentoPorcentaje ?? 0).toFixed(2)}%`,
            precioCompraTexto: record.precioCompra !== undefined && record.precioCompra !== null ? `$${Number(record.precioCompra).toFixed(2)}` : '—',
            stockActual: (
                <Badge
                    size="sm"
                    variant="light"
                    color={colorStock(stockActualNum, stockMinimoNum)}
                    radius="sm"
                    fw={700}
                >
                    {stockActualNum}
                </Badge>
            ),
            stockMinimo: stockMinimoNum,
            estadoBadge: (
                <Badge
                    size="sm"
                    variant="light"
                    color={estado === 'ACTIVO' ? 'green' : estado === 'INACTIVO' ? 'red' : 'gray'}
                    radius="sm"
                    fw={700}
                >
                    {estado}
                </Badge>
            ),
            disponibleCompra: (<>
                {disponible 
                    ? 
                <Badge
                    size="sm"
                    variant="light"
                    color="green"
                    radius="sm"
                    fw={700}
                >
                    Disponible
                </Badge> 
                : 
                <Badge
                    size="sm"
                    variant="light"
                    color="red"
                    radius="sm"
                    fw={700}
                >
                    No Disponible
                </Badge>}
            </>
            )
        };
    };

    const renderAccionesFila = (fila, { openEdit, setPendingDelete } = {}) => (
        <Group gap={6} wrap="nowrap">
            {openEdit && (
                <Tooltip label="Editar Producto" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="blue"
                        size="md"
                        radius="md"
                        onClick={() => openEdit(fila)}
                    >
                        <IconEdit size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}
            {setPendingDelete && (
                <Tooltip label="Eliminar Producto" withArrow openDelay={250}>
                    <ActionIcon
                        variant="light"
                        color="red"
                        size="md"
                        radius="md"
                        onClick={() => setPendingDelete(fila)}
                    >
                        <IconTrash size={17} stroke={1.8} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );

    return (
        <Tabs
            value={tabActiva}
            onChange={(val) => setTabActiva(val || 'catalogo')}
            color="orange"
            variant="outline"
            radius="md"
        >
            <Tabs.List mb="md">
                <Tabs.Tab value="catalogo" leftSection={<IconPackage size={16} stroke={1.8} />}>
                    Catálogo de Productos
                </Tabs.Tab>
                <Tabs.Tab
                    value="pedidos"
                    leftSection={<IconCheck size={16} stroke={1.8} />}
                    rightSection={
                        pendientesPedidos > 0 ? (
                            <Badge size="xs" variant="filled" color="red" circle>
                                {pendientesPedidos}
                            </Badge>
                        ) : null
                    }
                >
                    Pedidos de Compra
                </Tabs.Tab>
                <Tabs.Tab
                    value="almacenes"
                    leftSection={<IconBuildingWarehouse size={16} stroke={1.8} />}
                >
                    Stock por Almacén
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="catalogo">
                <CrudCatalogo
                    key={refreshCatalogoKey}
                    titulo="Productos"
                    singular="Producto"
                    icon={IconPackage}
                    servicio={api.Productos}
                    columnas={COLUMNAS_PRODUCTOS}
                    campos={CAMPOS}
                    valoresIniciales={INICIAL}
                    mapRecordToForm={mapRecordToForm}
                    mapFormToPayload={mapFormToPayload}
                    mapRecordToRow={mapRecordToRow}
                    renderForm={(props) => <ProductoForm {...props} />}
                    renderAccionesFila={renderAccionesFila}
                    permitirEditar={false}
                    permitirEliminar={false}
                    formMode="drawer"
                    drawerSize={580}
                    headerVariant="unified"
                    tableHeaderVariant="neutral"
                    tableMinWidth={1500}
                />
            </Tabs.Panel>

            <Tabs.Panel value="pedidos">
                <PedidosCompraPanel
                    onInventarioActualizado={handleInventarioActualizado}
                    onConteoPendientesChange={setPendientesPedidos}
                />
            </Tabs.Panel>

            <Tabs.Panel value="almacenes">
                {tabActiva === 'almacenes' && (
                    <Almacenes
                        embedded
                        onInventarioActualizado={handleInventarioActualizado}
                        extraHeaderAction={
                            puedeAbrirModuloAlmacenes ? (
                                <Button
                                    size="xs"
                                    variant="default"
                                    leftSection={<IconExternalLink size={15} />}
                                    onClick={() => navigate(rutaAlmacenes)}
                                    style={{ minHeight: 36, fontWeight: 600 }}
                                >
                                    Ir a Almacenes
                                </Button>
                            ) : null
                        }
                    />
                )}
            </Tabs.Panel>
        </Tabs>
    );
}

export default Productos;
