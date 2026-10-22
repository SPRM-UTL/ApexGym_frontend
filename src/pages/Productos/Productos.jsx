import { useMemo } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Divider,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
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
];

const SectionTitle = ({ children }) => (
    <Box mb="xs" mt="xs">
        <Text fw={600} size="sm" c="#1E293B" mb={4}>
            {children}
        </Text>
        <Divider color="#E2E8F0" />
    </Box>
);

function FInput({ label, required, placeholder, type = 'text', value, error, onChange }) {
    return (
        <TextInput
            label={label}
            withAsterisk={required}
            placeholder={placeholder}
            type={type}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FTextarea({ label, placeholder, value, error, onChange }) {
    return (
        <Textarea
            label={label}
            placeholder={placeholder}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            minRows={3}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

function FSelect({ label, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect
            label={label}
            withAsterisk={required}
            value={value ?? ''}
            error={error}
            size="md"
            radius="md"
            data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
}

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
