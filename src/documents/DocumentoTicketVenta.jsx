import {
    Document,
    Page,
    StyleSheet,
    Text,
    View,
} from '@react-pdf/renderer';
import { prepararDatosTicketVenta } from '../utils/exportaciones/ticketVenta.utils.js';

const ANCHO_TICKET = 226.77;

const styles = StyleSheet.create({
    page: {
        padding: 18,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#202020',
    },
    encabezado: {
        alignItems: 'center',
        marginBottom: 12,
    },
    marca: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    titulo: {
        fontSize: 10,
        marginBottom: 5,
    },
    separador: {
        borderBottomWidth: 1,
        borderBottomColor: '#777777',
        borderStyle: 'dashed',
        marginVertical: 7,
    },
    dato: {
        marginBottom: 4,
    },
    encabezadoProductos: {
        flexDirection: 'row',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    filaProducto: {
        marginBottom: 7,
    },
    detalleProducto: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    nombreProducto: {
        maxWidth: '100%',
    },
    totalFila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    totalFinal: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 3,
    },
    pie: {
        textAlign: 'center',
        marginTop: 12,
    },
});

export default function DocumentoTicketVenta({ venta }) {
    const ticket = prepararDatosTicketVenta(venta);
    const camposVariables = [
        ticket.folio,
        ticket.fecha,
        ticket.cliente,
        ticket.empleado,
        ticket.caja,
        ticket.metodoPago,
        ticket.estado,
        ticket.motivoCancelacion,
    ];
    const lineasExtra = camposVariables.reduce(
        (total, valor) => total + Math.max(0, Math.ceil(String(valor).length / 38) - 1),
        0
    );
    const altura = 350
        + lineasExtra * 12
        + ticket.productos.reduce(
            (total, producto) =>
                total + Math.max(1, Math.ceil(producto.descripcion.length / 38)) * 12 + 20,
            0
        );

    return (
        <Document title={`Ticket de venta ${ticket.folio}`}>
            <Page size={[ANCHO_TICKET, altura]} style={styles.page}>
                <View style={styles.encabezado}>
                    <Text style={styles.marca}>ApexGym</Text>
                    <Text style={styles.titulo}>Ticket de venta</Text>
                    <Text>Folio: {ticket.folio}</Text>
                    <Text>{ticket.fecha}</Text>
                </View>

                <View style={styles.separador} />
                <Text style={styles.dato}>Cliente: {ticket.cliente}</Text>
                <Text style={styles.dato}>Empleado: {ticket.empleado}</Text>
                <Text style={styles.dato}>Caja: {ticket.caja}</Text>
                <Text style={styles.dato}>Método de pago: {ticket.metodoPago}</Text>
                <Text style={styles.dato}>Estado: {ticket.estado}</Text>

                <View style={styles.separador} />
                <View style={styles.encabezadoProductos}>
                    <Text style={{ flex: 1 }}>Producto</Text>
                    <Text style={{ width: 30, textAlign: 'right' }}>Cant.</Text>
                    <Text style={{ width: 55, textAlign: 'right' }}>Importe</Text>
                </View>
                {ticket.productos.map((producto, indice) => (
                    <View key={producto.id ?? `${producto.descripcion}-${indice}`} style={styles.filaProducto} wrap={false}>
                        <Text style={styles.nombreProducto}>{producto.descripcion}</Text>
                        <View style={styles.detalleProducto}>
                            <Text>{producto.cantidad} × {producto.precioUnitario}</Text>
                            <Text>{producto.importe}</Text>
                        </View>
                    </View>
                ))}

                <View style={styles.separador} />
                <View style={styles.totalFila}>
                    <Text>Subtotal</Text>
                    <Text>{ticket.subtotal}</Text>
                </View>
                <View style={styles.totalFila}>
                    <Text>IVA</Text>
                    <Text>{ticket.iva}</Text>
                </View>
                <View style={[styles.totalFila, styles.totalFinal]}>
                    <Text>Total</Text>
                    <Text>{ticket.total}</Text>
                </View>
                {ticket.motivoCancelacion && (
                    <Text style={styles.dato}>Motivo de cancelación: {ticket.motivoCancelacion}</Text>
                )}
                <Text style={styles.pie}>Gracias por tu compra</Text>
            </Page>
        </Document>
    );
}
