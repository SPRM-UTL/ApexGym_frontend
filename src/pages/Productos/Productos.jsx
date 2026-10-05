import { Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
import { ModalProducto } from '../../components/ModalFormulario/ModalProducto.jsx';
import { TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../../components/BarraAcciones/BarraAcciones.jsx';
import { api } from '../../scripts/services/api.js';
import classes from './Productos.module.css';

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

export function Productos() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal Formulario
    const [abierto, setAbierto] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);

    // Modal Confirmación de Eliminación
    const [registroPendiente, setRegistroPendiente] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Campos del formulario
    const [nombre, setNombre] = useState('');
    const [categoriaProductoId, setCategoriaProductoId] = useState(null);
    const [codigoBarras, setCodigoBarras] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [precioCompra, setPrecioCompra] = useState('');
    const [stockActual, setStockActual] = useState(0);
    const [stockMinimo, setStockMinimo] = useState(1);
    const [errores, setErrores] = useState({});

    // ── Carga de datos ──────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            const [resProductos, resCategorias] = await Promise.all([
                api.producto.obtenerTodos().catch((e) => {
                    console.error('Error al obtener productos:', e);
                    return { data: [], responseFlag: 0 };
                }),
                api.categoriaProducto.obtenerTodas().catch((e) => {
                    console.error('Error al obtener categorías:', e);
                    return { data: [], responseFlag: 0 };
                }),
            ]);

            setProductos(resProductos.data ?? []);
            setCategorias(resCategorias.data ?? []);
            setError(null);
        } catch (err) {
            setError(err.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ── Preparar datos para TablaRegistros ──────────────────────────────────────
    const datosTabla = useMemo(
        () =>
            productos.map((prod) => ({
                ...prod,
                id: prod.id,
                categoriaNombre: prod.categoria?.nombre || 'Sin categoría',
                codigoBarras: prod.codigoBarras || '—',
                descripcion: prod.descripcion || '—',
                precioVentaTexto: `$ ${Number(prod.precioVenta || 0).toFixed(2)}`,
                precioCompraTexto: prod.precioCompra ? `$ ${Number(prod.precioCompra).toFixed(2)}` : '—',
            })),
        [productos]
    );

    const limpiarFormulario = () => {
        setNombre('');
        setCategoriaProductoId(null);
        setCodigoBarras('');
        setDescripcion('');
        setPrecioVenta('');
        setPrecioCompra('');
        setStockActual(0);
        setStockMinimo(1);
        setErrores({});
        setProductoEditando(null);
    };

    const manejarCambioFormulario = (campo, valor) => {
        const setters = {
            nombre: setNombre,
            categoriaProductoId: setCategoriaProductoId,
            codigoBarras: setCodigoBarras,
            descripcion: setDescripcion,
            precioVenta: setPrecioVenta,
            precioCompra: setPrecioCompra,
            stockActual: setStockActual,
            stockMinimo: setStockMinimo,
        };

        setters[campo]?.(valor);
        setErrores((prev) => ({ ...prev, [campo]: null }));
    };

    // ── Guardar (Crear o Actualizar) ───────────────────────────────────────────
    const guardar = async () => {
        const nuevosErrores = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre del producto es requerido';
        }

        if (!categoriaProductoId) {
            nuevosErrores.categoriaProductoId = 'Debes seleccionar una categoría';
        }

        if (precioVenta === '' || precioVenta === null || isNaN(Number(precioVenta))) {
            nuevosErrores.precioVenta = 'El precio de venta es requerido y debe ser numérico';
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            notifications.show({
                title: 'Error en el formulario',
                message: 'Por favor, revise los campos requeridos.',
                color: 'red',
            });
            return;
        }

        try {
            setLoading(true);
            const payload = {
                categoriaProductoId: Number(categoriaProductoId),
                codigoBarras: codigoBarras ? codigoBarras.trim() : null,
                nombre: nombre.trim(),
                descripcion: descripcion ? descripcion.trim() : null,
                precioVenta: parseFloat(precioVenta),
                precioCompra: precioCompra !== '' && precioCompra !== null ? parseFloat(precioCompra) : null,
                stockActual: stockActual !== '' && stockActual !== null ? Number(stockActual) : 0,
                stockMinimo: stockMinimo !== '' && stockMinimo !== null ? Number(stockMinimo) : 1,
            };

            let response;
            let alerta;

            if (productoEditando) {
                response = await api.producto.actualizar(productoEditando, payload);
                alerta = {
                    title: 'Actualizado',
                    message: 'Producto actualizado correctamente',
                    color: 'green',
                };
            } else {
                response = await api.producto.crear(payload);
                alerta = {
                    title: 'Agregado',
                    message: 'Producto creado correctamente',
                    color: 'green',
                };
            }

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al guardar el producto');
            }

            notifications.show(alerta);
            await fetchData();
            limpiarFormulario();
            setAbierto(false);
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al guardar el producto',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const abrirAgregar = () => {
        limpiarFormulario();
        setAbierto(true);
    };

    const handleEditar = useCallback(
        (producto) => {
            const completo = productos.find((p) => p.id === producto.id) ?? producto;
            setProductoEditando(completo.id);
            setNombre(completo.nombre ?? '');
            setCategoriaProductoId(completo.categoriaProductoId ? String(completo.categoriaProductoId) : null);
            setCodigoBarras(completo.codigoBarras ?? '');
            setDescripcion(completo.descripcion ?? '');
            setPrecioVenta(completo.precioVenta ?? '');
            setPrecioCompra(completo.precioCompra ?? '');
            setStockActual(completo.stockActual ?? 0);
            setStockMinimo(completo.stockMinimo ?? 1);
            setErrores({});
            setAbierto(true);
        },
        [productos]
    );

    const solicitarEliminacion = (producto) => {
        setRegistroPendiente(producto);
    };

    const cancelarEliminacion = () => {
        if (!eliminando) setRegistroPendiente(null);
    };

    const confirmarEliminacion = async () => {
        if (!registroPendiente) return;

        try {
            setEliminando(true);
            setLoading(true);

            const response = await api.producto.eliminar(registroPendiente.id);

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al eliminar el producto');
            }

            await fetchData();
            notifications.show({
                title: 'Eliminado',
                message: 'Producto eliminado correctamente.',
                color: 'green',
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al eliminar el producto',
                color: 'red',
            });
        } finally {
            setEliminando(false);
            setLoading(false);
        }

        setRegistroPendiente(null);
    };

    const handleReload = () => {
        fetchData();
    };

    return (
        <>
            <ModalConfirmacion
                opened={Boolean(registroPendiente)}
                onClose={cancelarEliminacion}
                onConfirm={confirmarEliminacion}
                loading={eliminando}
                title="Confirmar eliminación"
                message={`¿Deseas eliminar el producto "${registroPendiente?.nombre ?? ''}"? Esta acción no se puede deshacer.`}
            />

            <ModalProducto
                abierto={abierto}
                productoEditando={productoEditando}
                form={{
                    nombre,
                    categoriaProductoId,
                    codigoBarras,
                    descripcion,
                    precioVenta,
                    precioCompra,
                    stockActual,
                    stockMinimo,
                }}
                errores={errores}
                categorias={categorias}
                onClose={() => {
                    setAbierto(false);
                    limpiarFormulario();
                }}
                onGuardar={guardar}
                onChange={manejarCambioFormulario}
            />

            <div className={classes.crudLayout}>
                <BarraAcciones onAdd={abrirAgregar} onReload={handleReload} />

                {error && <div className={classes.errorBanner}>{error}</div>}

                {loading && productos.length === 0 ? (
                    <div className={classes.loadingBanner}>
                        <Group justify="center" gap="sm">
                            <Loader size="sm" color="apex" />
                            Cargando productos…
                        </Group>
                    </div>
                ) : (
                    <TablaRegistros
                        data={datosTabla}
                        columns={COLUMNAS_PRODUCTOS}
                        onEditar={handleEditar}
                        onEliminar={solicitarEliminacion}
                        entityLabel="Producto"
                        pageSizeOptions={[10, 25, 50]}
                        loading={loading}
                    />
                )}
            </div>
        </>
    );
}