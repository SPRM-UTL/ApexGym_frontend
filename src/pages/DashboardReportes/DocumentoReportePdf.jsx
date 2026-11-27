import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const formatoMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat('es-MX');

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: '#1E293B',
    },
    header: {
        backgroundColor: '#1B1F3A',
        padding: 14,
        borderRadius: 6,
        marginBottom: 14,
        borderBottomWidth: 3,
        borderBottomColor: '#FF6A00',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerMeta: {
        fontSize: 8.5,
        color: '#CBD5E1',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1B1F3A',
        marginTop: 10,
        marginBottom: 6,
        paddingBottom: 3,
        borderBottomWidth: 1.5,
        borderBottomColor: '#FF6A00',
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    kpiBox: {
        width: '23.5%',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderLeftWidth: 3,
        borderLeftColor: '#1B1F3A',
        borderRadius: 4,
        padding: 7,
    },
    kpiLabel: {
        fontSize: 7.5,
        color: '#64748B',
        textTransform: 'uppercase',
    },
    kpiValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 2,
    },
    table: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderBottomWidth: 1,
        borderBottomColor: '#CBD5E1',
        paddingVertical: 5,
        paddingHorizontal: 6,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E2E8F0',
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    colName: { flex: 2.2 },
    colNum: { flex: 1, textAlign: 'right' },
    colCenter: { flex: 0.9, textAlign: 'center' },
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 28,
        right: 28,
        fontSize: 7.5,
        color: '#94A3B8',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export function DocumentoReportePdf({ sucursalNombre, almacenNombre, filtros, reportes }) {
    const ventas = reportes?.ventas || {};
    const rendimiento = reportes?.rendimiento || {};
    const membresias = rendimiento.membresias || {};
    const caja = rendimiento.caja || {};
    const asistencias = rendimiento.asistencias || {};
    const ventasPorEmpleado = Array.isArray(rendimiento.ventasPorEmpleado) ? rendimiento.ventasPorEmpleado : [];
    const topProductos = Array.isArray(reportes?.topProductos?.top) ? reportes.topProductos.top : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>ApexGym · Dashboard y Reportes</Text>
                    <Text style={styles.headerMeta}>
                        Sucursal: {sucursalNombre} | Almacén: {almacenNombre} | Periodo: {filtros.fechaInicio} al {filtros.fechaFin}
                    </Text>
                </View>

                {/* 1. Reporte de Ventas */}
                <Text style={styles.sectionTitle}>1. Reportes de Ventas</Text>
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Ingresos totales</Text>
                        <Text style={styles.kpiValue}>{formatoMoneda.format(Number(ventas.ingresosTotales || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Transacciones</Text>
                        <Text style={styles.kpiValue}>{formatoNumero.format(Number(ventas.totalVentas || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Ticket promedio</Text>
                        <Text style={styles.kpiValue}>{formatoMoneda.format(Number(ventas.ticketPromedio || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Ingresos visitas</Text>
                        <Text style={styles.kpiValue}>{formatoMoneda.format(Number(asistencias.ingresosVisitas || 0))}</Text>
                    </View>
                </View>

                {/* 2. Reporte de Rendimiento */}
                <Text style={styles.sectionTitle}>2. Reportes de Rendimiento</Text>
                <View style={styles.kpiGrid}>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Vigentes</Text>
                        <Text style={styles.kpiValue}>{formatoNumero.format(Number(membresias.vigentes || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Por vencer (7d)</Text>
                        <Text style={styles.kpiValue}>{formatoNumero.format(Number(membresias.porVencer7Dias || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Vencidas</Text>
                        <Text style={styles.kpiValue}>{formatoNumero.format(Number(membresias.vencidas || 0))}</Text>
                    </View>
                    <View style={styles.kpiBox}>
                        <Text style={styles.kpiLabel}>Dif. caja</Text>
                        <Text style={styles.kpiValue}>{formatoMoneda.format(Number(caja.diferenciaAcumulada || 0))}</Text>
                    </View>
                </View>

                {ventasPorEmpleado.length > 0 && (
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colName}>Empleado</Text>
                            <Text style={styles.colCenter}># Ventas</Text>
                            <Text style={styles.colNum}>Total vendido</Text>
                            <Text style={styles.colNum}>Ticket prom.</Text>
                        </View>
                        {ventasPorEmpleado.slice(0, 10).map((emp, idx) => (
                            <View key={emp.empleadoId ?? idx} style={styles.tableRow}>
                                <Text style={styles.colName}>{emp.nombre}</Text>
                                <Text style={styles.colCenter}>{formatoNumero.format(Number(emp.cantidad || 0))}</Text>
                                <Text style={styles.colNum}>{formatoMoneda.format(Number(emp.total || 0))}</Text>
                                <Text style={styles.colNum}>{formatoMoneda.format(Number(emp.ticketPromedio || 0))}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* 3. Top de Productos Vendidos */}
                <Text style={styles.sectionTitle}>3. Top de Productos Vendidos</Text>
                {topProductos.length === 0 ? (
                    <Text style={{ color: '#64748B', marginBottom: 8 }}>Sin productos vendidos en el periodo.</Text>
                ) : (
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colName}>Producto</Text>
                            <Text style={styles.colCenter}>Unidades</Text>
                            <Text style={styles.colNum}>Ingresos</Text>
                            <Text style={styles.colCenter}>Stock</Text>
                        </View>
                        {topProductos.slice(0, 15).map((prod, idx) => (
                            <View key={prod.productoId ?? idx} style={styles.tableRow}>
                                <Text style={styles.colName}>{idx + 1}. {prod.nombre}</Text>
                                <Text style={styles.colCenter}>{formatoNumero.format(Number(prod.unidadesVendidas || 0))}</Text>
                                <Text style={styles.colNum}>{formatoMoneda.format(Number(prod.ingresos || 0))}</Text>
                                <Text style={styles.colCenter}>{formatoNumero.format(Number(prod.stockGlobal ?? prod.stock ?? 0))}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.footer} fixed>
                    <Text>Generado por ApexGym</Text>
                    <Text>{new Date().toLocaleString('es-MX')}</Text>
                </View>
            </Page>
        </Document>
    );
}

export default DocumentoReportePdf;
