import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Group,
    SimpleGrid,
    Stack,
    Tooltip,
} from '@mantine/core';
import {
    IconEdit,
    IconPackage,
    IconTrash,
} from '@tabler/icons-react';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { SectionTitle, FInput, FSelect, FTextarea, FCheckbox } from '../../components/Controles/ControlesComponent.jsx';

const CAMPOS = [
    { key: 'nombre', label: 'Nombre de Producto', required: true },
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
    { key: 'precioCompra', label: 'Precio Compra', required: true, type: 'number', min: 0 },
    { key: 'stockActual', label: 'Stock Actual', required: true, type: 'number', min: 0 },
    { key: 'stockMinimo', label: 'Stock Mínimo', required: true, type: 'number', min: 0 },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'disponibleCompra', label: 'Disponible' },
];

const INICIAL = {
    nombre: '',
    descripcion: '',
    codigoBarras: '',
    categoriaProductoId: '',
    precioVenta: '',
    precioCompra: '',
    stockActual: '',
    stockMinimo: '',
    disponibleCompra: true
};

const COLUMNAS_PRODUCTOS = [
    { key: 'codigoBarras', label: 'Código', sortable: true, filterable: true },
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'categoriaNombre', label: 'Categoría', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
    { key: 'precioVentaTexto', label: 'Precio Venta', sortable: true, filterable: false },
    { key: 'precioCompraTexto', label: 'Precio Compra', sortable: true, filterable: false },
    { key: 'stockActual', label: 'Stock Actual', sortable: true, filterable: false },
    { key: 'stockMinimo', label: 'Stock Mínimo', sortable: true, filterable: false },
    { key: 'disponibleCompra', label: 'Disponible', sortable: true, filterable: false },
];


function ProductoForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Stack gap="md" style={{ width: '100%' }}>
            <Box>
                <SectionTitle>Información general</SectionTitle>
                <Stack gap="md">
                    <FInput
                        label="Nombre de Producto"
                        required
                        placeholder="Ej. Creatina Monohidratada"
                        value={form.nombre}
                        error={errors.nombre}
                        onChange={(v) => onChange('nombre', v)}
                    />
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

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        codigoBarras: record.codigoBarras ?? '',
        categoriaProductoId: record.categoriaProductoId
            ? String(record.categoriaProductoId)
            : record.categoria?.id
                ? String(record.categoria.id)
                : '',
        precioVenta: record.precioVenta ?? '',
        precioCompra: record.precioCompra ?? '',
        stockActual: record.stockActual ?? '',
        stockMinimo: record.stockMinimo ?? '',
        disponibleCompra: record.disponibleCompra
    }), []);

    const mapFormToPayload = (form) => ({
        nombre: form.nombre ?? '',
        descripcion: form.descripcion || null,
        codigoBarras: form.codigoBarras ? String(form.codigoBarras) : null,
        categoriaProductoId: Number(form.categoriaProductoId),
        precioVenta: Number(form.precioVenta),
        precioCompra: form.precioCompra ? Number(form.precioCompra) : null,
        stockActual: Number(form.stockActual ?? 0),
        stockMinimo: Number(form.stockMinimo ?? 1),
        disponibleCompra: form.disponibleCompra
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
        return {
            id: record.id,
            nombre: record.nombre ?? '',
            descripcion: record.descripcion ?? '—',
            codigoBarras: record.codigoBarras ?? '—',
            categoriaNombre: record.categoria?.nombre ?? 'Sin categoría',
            precioVentaTexto: record.precioVenta !== undefined && record.precioVenta !== null ? `$${Number(record.precioVenta).toFixed(2)}` : '—',
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
        <CrudCatalogo
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
        />
    );
}

export default Productos;
