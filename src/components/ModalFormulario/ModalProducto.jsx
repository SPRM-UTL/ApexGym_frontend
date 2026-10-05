import {
    Button,
    Group,
    Modal,
    NativeSelect,
    NumberInput,
    SimpleGrid,
    Stack,
    TextInput,
    Textarea,
    Title,
} from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import classes from './ModalFormulario.module.css';

export function ModalProducto({
    abierto,
    productoEditando,
    form = {},
    errores = {},
    categorias = [],
    onClose,
    onGuardar,
    onChange,
}) {
    const opcionesCategorias = (categorias || []).map((cat) => ({
        value: String(cat.id),
        label: cat.nombre,
    }));

    return (
        <Modal
            opened={abierto}
            onClose={onClose}
            title={
                <Group gap="sm">
                    <IconPackage size={22} stroke={1.8} />
                    <Title order={4} className={classes.title}>
                        {productoEditando ? 'Editar producto' : 'Agregar producto'}
                    </Title>
                </Group>
            }
            fullScreen
            radius={0}
            zIndex={999999}
            transitionProps={{ transition: 'slide-up', duration: 200 }}
        >
            <Stack maw={780} mx="auto" mt="xl" gap="xl" className={classes.content}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="xl">
                    <Stack gap="md">
                        <TextInput
                            label="Nombre del producto"
                            placeholder="Ej. Proteína Whey 1kg, Cinto de fuerza..."
                            size="md"
                            radius="md"
                            withAsterisk
                            value={form.nombre || ''}
                            onChange={(event) => onChange('nombre', event.currentTarget.value)}
                            error={errores.nombre}
                        />

                        <NativeSelect
                            label="Categoría"
                            data={[
                                { value: '', label: 'Selecciona una categoría' },
                                ...opcionesCategorias,
                            ]}
                            size="md"
                            radius="md"
                            withAsterisk
                            value={form.categoriaProductoId ? String(form.categoriaProductoId) : ''}
                            onChange={(event) =>
                                onChange('categoriaProductoId', event.currentTarget.value || null)
                            }
                            error={errores.categoriaProductoId}
                        />

                        <TextInput
                            label="Código de barras"
                            placeholder="Ej. 750100123456"
                            size="md"
                            radius="md"
                            value={form.codigoBarras || ''}
                            onChange={(event) => onChange('codigoBarras', event.currentTarget.value)}
                            error={errores.codigoBarras}
                        />

                        <Textarea
                            label="Descripción"
                            placeholder="Descripción detallada del producto..."
                            size="md"
                            radius="md"
                            minRows={3}
                            value={form.descripcion || ''}
                            onChange={(event) => onChange('descripcion', event.currentTarget.value)}
                            error={errores.descripcion}
                        />
                    </Stack>

                    <Stack gap="md">
                        <NumberInput
                            label="Precio de venta"
                            placeholder="0.00"
                            size="md"
                            radius="md"
                            withAsterisk
                            decimalScale={2}
                            fixedDecimalScale
                            prefix="$ "
                            min={0}
                            value={form.precioVenta ?? ''}
                            onChange={(val) => onChange('precioVenta', val)}
                            error={errores.precioVenta}
                        />

                        <NumberInput
                            label="Precio de compra"
                            placeholder="0.00"
                            size="md"
                            radius="md"
                            decimalScale={2}
                            fixedDecimalScale
                            prefix="$ "
                            min={0}
                            value={form.precioCompra ?? ''}
                            onChange={(val) => onChange('precioCompra', val)}
                            error={errores.precioCompra}
                        />

                        <NumberInput
                            label="Stock actual"
                            placeholder="0"
                            size="md"
                            radius="md"
                            min={0}
                            value={form.stockActual ?? ''}
                            onChange={(val) => onChange('stockActual', val)}
                            error={errores.stockActual}
                        />

                        <NumberInput
                            label="Stock mínimo"
                            placeholder="1"
                            size="md"
                            radius="md"
                            min={0}
                            value={form.stockMinimo ?? ''}
                            onChange={(val) => onChange('stockMinimo', val)}
                            error={errores.stockMinimo}
                        />
                    </Stack>
                </SimpleGrid>

                <Group grow>
                    <Button variant="default" onClick={onClose} size="md">
                        Cancelar
                    </Button>
                    <Button onClick={onGuardar} size="md" className={classes.submitButton}>
                        {productoEditando ? 'Actualizar' : 'Guardar'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}