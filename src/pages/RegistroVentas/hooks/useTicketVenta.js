import { useCallback, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

export function useTicketVenta(estadoInicial = {}) {
    const [listaProductos, setListaProductosState] = useState(estadoInicial.listaProductos ?? []);
    const listaProductosRef = useRef(listaProductos);
    const [listaCaja1, setCaja1] = useState(estadoInicial.listaCaja1 ?? []);
    const [listaCaja2, setCaja2] = useState(estadoInicial.listaCaja2 ?? []);
    const [cajaActual, setCajaActual] = useState(estadoInicial.cajaActual ?? 1);

    const setListaProductos = useCallback((actualizar) => {
        const siguienteLista = typeof actualizar === 'function'
            ? actualizar(listaProductosRef.current)
            : actualizar;
        listaProductosRef.current = siguienteLista;
        setListaProductosState(siguienteLista);
    }, []);

    const cambiarCaja = (caja) => {
        if (caja === cajaActual) return;

        if (cajaActual === 1) setCaja1(listaProductos);
        else setCaja2(listaProductos);

        setListaProductos(caja === 1 ? listaCaja1 : listaCaja2);
        setCajaActual(caja);
    };

    const agregarProducto = (producto) => {
        const listaActual = listaProductosRef.current;
        const itemExistente = listaActual.find(
            (item) => item.id === producto.id && item.tipoItem === producto.tipoItem
        );

        if (producto.tipoItem === 'PRODUCTO' && producto.stockActual !== undefined && producto.stockActual !== null) {
            const stockDisponible = Number(producto.stockActual);
            const cantidadActual = itemExistente ? itemExistente.cantidad : 0;
            if (cantidadActual + 1 > stockDisponible) {
                notifications.show({
                    color: 'orange',
                    message: `Stock insuficiente. Solo hay ${stockDisponible} disponible(s) de ${producto.nombre}.`,
                });
                return;
            }
        }

        setListaProductos((listaAnterior) => {
            const articuloExistente = listaAnterior.find(
                (item) => item.id === producto.id && item.tipoItem === producto.tipoItem
            );
            if (articuloExistente) {
                return listaAnterior.map((item) => (
                    item.id === producto.id && item.tipoItem === producto.tipoItem
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                ));
            }

            return [...listaAnterior, { ...producto, cantidad: 1 }];
        });
    };

    const sumar = (producto) => {
        const itemExistente = listaProductosRef.current.find(
            (item) => item.id === producto.id && item.tipoItem === producto.tipoItem
        );
        if (!itemExistente) return;

        const stock = itemExistente.stockActual ?? producto.stockActual;
        if (itemExistente.tipoItem === 'PRODUCTO' && stock !== undefined && stock !== null) {
            const stockDisponible = Number(stock);
            if (itemExistente.cantidad + 1 > stockDisponible) {
                notifications.show({
                    color: 'orange',
                    message: `No puedes agregar más de ${stockDisponible} unidades de ${itemExistente.nombre}.`,
                });
                return;
            }
        }

        setListaProductos((listaAnterior) => {
            return listaAnterior.map((item) => (
                item.id === producto.id && item.tipoItem === producto.tipoItem
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item
            ));
        });
    };

    const restar = (producto) => {
        setListaProductos((listaAnterior) => {
            if (producto.cantidad > 1) {
                return listaAnterior.map((item) => (
                    item.id === producto.id && item.tipoItem === producto.tipoItem
                        ? { ...item, cantidad: item.cantidad - 1 }
                        : item
                ));
            }

            return listaAnterior.filter((item) => (
                item.id !== producto.id || item.tipoItem !== producto.tipoItem
            ));
        });
    };

    const eliminarProducto = (producto) => {
        setListaProductos((listaAnterior) => listaAnterior.filter((item) => (
            item.id !== producto.id || item.tipoItem !== producto.tipoItem
        )));
    };

    const eliminarTicket = () => setListaProductos([]);

    const limpiarTickets = () => {
        setCaja1([]);
        setCaja2([]);
        setListaProductos([]);
    };

    const filtrarArticulosDisponibles = useCallback((disponiblesPorTipo) => {
        const conservarDisponibles = (lista) => lista.filter((item) => (
            disponiblesPorTipo[item.tipoItem]?.has(String(item.id))
        ));

        setListaProductos(conservarDisponibles);
        setCaja1(conservarDisponibles);
        setCaja2(conservarDisponibles);
    }, [setListaProductos]);

    return {
        listaProductos,
        listaCaja1,
        listaCaja2,
        setListaProductos,
        cajaActual,
        cambiarCaja,
        agregarProducto,
        sumar,
        restar,
        eliminarProducto,
        eliminarTicket,
        limpiarTickets,
        filtrarArticulosDisponibles,
    };
}
