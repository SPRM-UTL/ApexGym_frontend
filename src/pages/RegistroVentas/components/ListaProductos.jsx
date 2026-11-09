import classes from '../Nueva/Nueva.module.css';
import { IconPackage } from '@tabler/icons-react';
import { Center, Loader, Pagination, ScrollArea, SimpleGrid, Text } from '@mantine/core';
import { TarjetaProducto } from './TarjetaProducto.jsx';

export function ListaProductos({
    productos,
    tipoItem,
    agregarProducto,
    busqueda,
    categoriaId,
    pagina,
    totalPaginas,
    total,
    cargando,
    error,
    onPaginaChange,
}) {
    const hayFiltros = Boolean(busqueda.trim() || categoriaId);

    return (
        <div className={classes.listaProductosContenedor}>
            <ScrollArea className={classes.listaProductos} h="100%" offsetScrollbars>
                {cargando ? (
                    <Center className={classes.catalogoVacio}>
                        <Loader color="orange" />
                        <Text fw={700}>Cargando catálogo...</Text>
                    </Center>
                ) : error ? (
                    <div className={classes.catalogoVacio}>
                        <Text fw={700}>{error}</Text>
                    </div>
                ) : productos.length > 0 ? (
                    <SimpleGrid
                        cols={{
                            base: 1,
                            sm: 2,
                            md: 3,
                            lg: 5,
                        }}
                        spacing="md"
                        pr="sm"
                    >
                        {productos.map((producto) => (
                            <TarjetaProducto key={producto.id} producto={producto} tipoItem={tipoItem} agregarProducto={agregarProducto} />
                        ))}
                    </SimpleGrid>
                ) : (
                    <div className={classes.catalogoVacio}>
                        <IconPackage size={88} stroke={1.35} aria-hidden="true" />
                        <Text fw={700}>
                            {hayFiltros
                                ? 'No se encontraron artículos con esos filtros.'
                                : 'No hay artículos disponibles.'}
                        </Text>
                    </div>
                )}
            </ScrollArea>
            <div className={classes.catalogoPaginacion}>
                <Text size="sm">{total} resultados</Text>
                {totalPaginas > 1 && (
                    <Pagination
                        value={pagina}
                        onChange={onPaginaChange}
                        total={totalPaginas}
                        disabled={cargando}
                        size="sm"
                    />
                )}
            </div>
        </div>
    );
}
