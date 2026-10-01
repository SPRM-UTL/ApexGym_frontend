import { Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ModalConfirmacion } from '../../components/ModalConfirmacion/ModalConfirmacion.jsx';
// import { ModalFormulario } from '../../components/ModalFormulario/ModalFormulario.jsx';
import { ModalCategoriaProducto } from '../../components/ModalFormulario/ModalCategoriaProducto.jsx';
import { TablaRegistros } from '../../components/TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../../components/BarraAcciones/BarraAcciones.jsx';
import { api } from '../../scripts/services/api.js';
import classes from './CategoriaProducto.module.css';

const COLUMNAS_CATEGORIAS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'descripcion', label: 'Descripción', sortable: false, filterable: true },
];

export function CategoriaProducto() {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Carga de categorías ──────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.categoriaProducto.obtenerTodas();
            if (res.responseFlag !== 0) {
                throw new Error(res.message || 'Error al obtener las categorías');
            }
            setCategorias(res.data ?? []);
            setError(null);
        } catch (err) {
            setError(err.message);
            setCategorias([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const [abierto, setAbierto] = useState(false);
    const [categoriaEditando, setCategoriaEditando] = useState(null);
    const [registroPendiente, setRegistroPendiente] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Campos del formulario
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [errores, setErrores] = useState({});

    const datosTabla = useMemo(
        () =>
            categorias.map(({ id, nombre: n, descripcion: d }) => ({
                id,
                nombre: n,
                descripcion: d || '—',
            })),
        [categorias]
    );

    const limpiarFormulario = () => {
        setNombre('');
        setDescripcion('');
        setErrores({});
        setCategoriaEditando(null);
    };

    const manejarCambioFormulario = (campo, valor) => {
        const setters = {
            nombre: setNombre,
            descripcion: setDescripcion,
        };

        setters[campo]?.(valor);
        setErrores((prev) => ({ ...prev, [campo]: null }));
    };

    const guardar = async () => {
        const nuevosErrores = {};

        if (!nombre.trim()) {
            nuevosErrores.nombre = 'El nombre de la categoría es requerido';
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

            let response;
            let alerta;

            if (categoriaEditando) {
                response = await api.categoriaProducto.actualizar(
                    categoriaEditando,
                    nombre,
                    descripcion
                );
                alerta = {
                    title: 'Actualizado',
                    message: 'Categoría actualizada correctamente',
                    color: 'green',
                };
            } else {
                response = await api.categoriaProducto.crear(nombre, descripcion);
                alerta = {
                    title: 'Agregado',
                    message: 'Categoría creada correctamente',
                    color: 'green',
                };
            }

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al guardar la categoría');
            }

            notifications.show(alerta);
            await fetchData();
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al guardar la categoría',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }

        limpiarFormulario();
        setAbierto(false);
    };

    const abrirAgregar = () => {
        limpiarFormulario();
        setAbierto(true);
    };

    const handleEditar = useCallback(
        (categoria) => {
            const completo = categorias.find((c) => c.id === categoria.id) ?? categoria;
            setCategoriaEditando(completo.id);
            setNombre(completo.nombre ?? '');
            setDescripcion(completo.descripcion ?? '');
            setErrores({});
            setAbierto(true);
        },
        [categorias]
    );

    const solicitarEliminacion = (categoria) => {
        setRegistroPendiente(categoria);
    };

    const cancelarEliminacion = () => {
        if (!eliminando) setRegistroPendiente(null);
    };

    const confirmarEliminacion = async () => {
        if (!registroPendiente) return;

        try {
            setEliminando(true);
            setLoading(true);

            const response = await api.categoriaProducto.eliminar(registroPendiente.id);

            if (response.responseFlag !== 0) {
                throw new Error(response.message || 'Error al eliminar la categoría');
            }

            await fetchData();
            notifications.show({
                title: 'Eliminado',
                message: 'Categoría eliminada correctamente.',
                color: 'green',
            });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'Error al eliminar la categoría',
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
                message={`¿Deseas eliminar la categoría "${registroPendiente?.nombre ?? ''}"? Esta acción no se puede deshacer.`}
            />

            <ModalCategoriaProducto
                abierto={abierto}
                categoriaEditando={categoriaEditando}
                form={{
                    nombre,
                    descripcion,
                }}
                errores={errores}
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

                {loading && categorias.length === 0 ? (
                    <div className={classes.loadingBanner}>
                        <Group justify="center" gap="sm">
                            <Loader size="sm" color="apex" />
                            Cargando categorías…
                        </Group>
                    </div>
                ) : (
                    <TablaRegistros
                        data={datosTabla}
                        columns={COLUMNAS_CATEGORIAS}
                        onEditar={handleEditar}
                        onEliminar={solicitarEliminacion}
                        entityLabel="categoría"
                        pageSizeOptions={[10, 25, 50]}
                        loading={loading}
                    />
                )}
            </div>
        </>
    );
}