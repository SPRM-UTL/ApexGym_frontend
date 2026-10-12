import { useMemo } from 'react';
import {
    Box,
    Group,
    NativeSelect,
    SimpleGrid,
    Stack,
    Textarea,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconId,
    IconFileText,
    IconCalendar,
    IconCurrencyDollar,
    IconShieldCheck,
    IconCertificate
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
    { key: 'precioVenta', label: 'Precio Venta', required: true, type: 'number' },
    { key: 'precioCompra', label: 'Precio Compra', required: true, type: 'number' },
    { key: 'stockActual', label: 'Stock Actual', required: true, type: 'number' },
    { key: 'stockMinimo', label: 'Stock Mínimo', required: true, type: 'number' },
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

const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid var(--ag-color-border, #e9ecef)',
};


function FInput({ label, icon: Icon, required, placeholder, type = 'text', value, error, onChange }) {
    return (
        <TextInput label={label} withAsterisk={required} placeholder={placeholder} type={type} value={value ?? ''} error={error} size="md" radius="md" leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function FTextarea({ label, icon: Icon, placeholder, value, error, onChange }) {
    return (
        <Textarea label={label} placeholder={placeholder} value={value ?? ''} error={error} size="md" radius="md" minRows={2} leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function FSelect({ label, icon: Icon, required, placeholder, options = [], value, error, onChange }) {
    return (
        <NativeSelect label={label} withAsterisk={required} value={value ?? ''} error={error} size="md" radius="md" leftSection={Icon ? <Icon size={16} stroke={1.5} /> : undefined} data={[{ value: '', label: placeholder ?? `Selecciona ${label.toLowerCase()}` }, ...options]} onChange={(e) => onChange(e.currentTarget.value)} />
    );
}

function ProductoForm({ form, errors, onChange, fieldOptions }) {
    return (
        <Group align="stretch" gap="xl" wrap="nowrap">
            <Stack gap="md" style={{ flex: 1, minWidth: 0 }}>
                <Box>
                    <div style={sectionHeader}>
                        <ThemeIcon size="md" radius="md" variant="light" style={{ backgroundColor: '#e8eaf0', color: '#1B1F3A' }}>
                            <IconCertificate size={16} stroke={1.8} />
                        </ThemeIcon>
                        <Title order={5}>Datos de Producto</Title>
                    </div>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="xs">
                        <FInput label="Nombre de Producto" required icon={IconId} placeholder="Ej. Creatina Monohidratada" value={form.nombre} error={errors.nombre} onChange={(v) => onChange('nombre', v)} />
                        <FInput label="Código de barras" required icon={IconCalendar} placeholder="Ej. 750123456789" value={form.codigoBarras} error={errors.codigoBarras} onChange={(v) => onChange('codigoBarras', v)} />
                        <FSelect label="Categoría" required icon={IconShieldCheck} placeholder="Selecciona una categoría" options={fieldOptions?.categoriaProductoId ?? []} value={form.categoriaProductoId} error={errors.categoriaProductoId} onChange={(v) => onChange('categoriaProductoId', v)} />
                        <FInput label="Precio Venta" required icon={IconCurrencyDollar} type="number" placeholder="Ej. 499.00" value={form.precioVenta} error={errors.precioVenta} onChange={(v) => onChange('precioVenta', v)} />
                        <FInput label="Precio Compra" required icon={IconCurrencyDollar} type="number" placeholder="Ej. 150.00" value={form.precioCompra} error={errors.precioCompra} onChange={(v) => onChange('precioCompra', v)} />
                        <FInput label="Stock Actual" required icon={IconCurrencyDollar} type="number" placeholder="Ej. 100" value={form.stockActual} error={errors.stockActual} onChange={(v) => onChange('stockActual', v)} />
                        <FInput label="Stock Mínimo" required icon={IconCurrencyDollar} type="number" placeholder="Ej. 10" value={form.stockMinimo} error={errors.stockMinimo} onChange={(v) => onChange('stockMinimo', v)} />
                    </SimpleGrid>
                    <Box mt="xs">
                        <FTextarea label="Descripción" icon={IconFileText} placeholder="Breve descripción del producto" value={form.descripcion} error={errors.descripcion} onChange={(v) => onChange('descripcion', v)} />
                    </Box>
                </Box>
            </Stack> 
        </Group>
    );
}
export function Productos(){
  cambioNombreWeb('Productos');

    const mapRecordToForm = useMemo(() => (record) => ({
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '',
        codigoBarras: record.codigoBarras ?? '',
        categoriaProductoId: record.categoriaProductoId ? String(record.categoriaProductoId) : (record.categoria?.id ? String(record.categoria.id) : ''),
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

    const mapRecordToRow = (record) => ({
        id: record.id,
        nombre: record.nombre ?? '',
        descripcion: record.descripcion ?? '-',
        codigoBarras: record.codigoBarras ?? '-',
        categoriaNombre: record.categoria?.nombre ?? 'Sin categoría',
        precioVentaTexto: record.precioVenta !== undefined ? `$${Number(record.precioVenta).toFixed(2)}` : '—',
        precioCompraTexto: record.precioCompra !== undefined && record.precioCompra !== null ? `$${Number(record.precioCompra).toFixed(2)}` : '—',
        stockActual: record.stockActual ?? 0,
        stockMinimo: record.stockMinimo ?? 0,
    });
    return (
            <CrudCatalogo 
                titulo="Productos" 
                singular="Producto" 
                icon={IconCertificate}
                servicio={api.Productos} 
                columnas={COLUMNAS_PRODUCTOS} 
                campos={CAMPOS} 
                valoresIniciales={INICIAL} 
                mapRecordToForm={mapRecordToForm} 
                mapFormToPayload={mapFormToPayload} 
                mapRecordToRow={mapRecordToRow} 
                renderForm={(props) => <ProductoForm {...props} />} 
            />
        );
}

export default Productos;