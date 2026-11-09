import { useState } from 'react';

export function useTicketVenta() {
    const [listaProductos, setListaProductos] = useState([]);
    const [listaCaja1, setCaja1] = useState([]);
    const [listaCaja2, setCaja2] = useState([]);
    const [cajaActual, setCajaActual] = useState(1);

    const cambiarCaja = (caja) => {
        if (caja === cajaActual) return;

        if (cajaActual === 1) setCaja1(listaProductos);
        else setCaja2(listaProductos);

        setListaProductos(caja === 1 ? listaCaja1 : listaCaja2);
        setCajaActual(caja);
    };

    const agregarProducto = (producto) => {
        setListaProductos((listaAnterior) => {
            const existe = listaAnterior.some(
                (item) => item.id === producto.id && item.tipoItem === producto.tipoItem
            );

            if (existe) {
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
        setListaProductos((listaAnterior) => listaAnterior.map((item) => (
            item.id === producto.id && item.tipoItem === producto.tipoItem
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
        )));
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

    return {
        listaProductos,
        setListaProductos,
        cajaActual,
        cambiarCaja,
        agregarProducto,
        sumar,
        restar,
        eliminarProducto,
        eliminarTicket,
        limpiarTickets,
    };
}
