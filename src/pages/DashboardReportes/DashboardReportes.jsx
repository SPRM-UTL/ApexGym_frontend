import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Group,
    Loader,
    Menu,
    Paper,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconAlertTriangle,
    IconBuildingStore,
    IconBuildingWarehouse,
    IconCalendar,
    IconCash,
    IconCashRegister,
    IconChartBar,
    IconChartLine,
    IconCheck,
    IconChevronDown,
    IconDownload,
    IconFileCode,
    IconFileSpreadsheet,
    IconIdBadge,
    IconPackage,
    IconRefresh,
    IconReportAnalytics,
    IconStar,
    IconTrendingUp,
    IconUsers,
} from '@tabler/icons-react';
import { useSucursal } from '../../context/SucursalContext.jsx';
import { obtenerEmpresaCache } from '../../context/EmpresaContext.jsx';
import { appUrl } from '../../scripts/constantes.js';
import { api } from '../../scripts/services/api.js';
import { ReporteService } from '../../scripts/services/ReporteService.js';
import { AlmacenService } from '../../scripts/services/AlmacenService.js';
import classes from './DashboardReportes.module.css';

const formatoMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat('es-MX');

function numeroSeguro(valor, fallback = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : fallback;
}

function formatearFechaISO(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function calcularRangoPreset(preset) {
    const hoy = new Date();
    const fin = formatearFechaISO(hoy);
    if (preset === 'hoy') {
        return { fechaInicio: fin, fechaFin: fin };
    }
    if (preset === '7d') {
        const inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - 6);
        return { fechaInicio: formatearFechaISO(inicio), fechaFin: fin };
    }
    if (preset === 'mes') {
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return { fechaInicio: formatearFechaISO(inicio), fechaFin: fin };
    }
    // Por defecto: últimos 30 días
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - 29);
    return { fechaInicio: formatearFechaISO(inicio), fechaFin: fin };
}

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const texto = String(fechaStr).slice(0, 10);
    const partes = texto.split('-');
    if (partes.length === 3) {
        const [y, m, d] = partes.map(Number);
        const dt = new Date(y, m - 1, d);
        if (!Number.isNaN(dt.getTime())) {
            return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        }
    }
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function formatearFechaHora(fechaStr) {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (Number.isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function nombrePersona(obj, fallback = 'General') {
    if (!obj) return fallback;
    if (typeof obj === 'string') return obj;
    const completo = [obj.nombre, obj.apellidoPaterno, obj.apellidoMaterno]
        .filter(Boolean)
        .join(' ')
        .trim();
    return completo || obj.razonSocial || fallback;
}

function normalizarReporteVentas(raw) {
    const src = raw ?? {};
    const kpisRaw = src.kpis ?? {};
    const cancelaciones = kpisRaw.cancelaciones ?? {};
    const devoluciones = kpisRaw.devoluciones ?? {};

    const kpis = {
        ingresosTotales: numeroSeguro(
            kpisRaw.ingresosTotales ?? kpisRaw.totalIngresos ?? kpisRaw.totalCobrado ?? kpisRaw.montoTotal
        ),
        totalVentas: numeroSeguro(
            kpisRaw.totalVentas ?? kpisRaw.cantidadVentas ?? kpisRaw.numeroVentas ?? kpisRaw.cantidad
        ),
        ticketPromedio: numeroSeguro(kpisRaw.ticketPromedio),
        cancelacionesCantidad: numeroSeguro(
            typeof cancelaciones === 'object'
                ? (cancelaciones.cantidad ?? cancelaciones.total)
                : (kpisRaw.totalCanceladas ?? kpisRaw.cancelaciones)
        ),
        cancelacionesMonto: numeroSeguro(
            typeof cancelaciones === 'object'
                ? (cancelaciones.monto ?? cancelaciones.totalMonto)
                : (kpisRaw.montoCancelado ?? kpisRaw.totalCancelado)
        ),
        devolucionesCantidad: numeroSeguro(
            typeof devoluciones === 'object'
                ? (devoluciones.cantidad ?? devoluciones.total)
                : (kpisRaw.totalDevoluciones ?? kpisRaw.devoluciones)
        ),
        devolucionesMonto: numeroSeguro(
            typeof devoluciones === 'object'
                ? (devoluciones.monto ?? devoluciones.totalMonto)
                : (kpisRaw.montoDevuelto ?? kpisRaw.totalReembolsado)
        ),
    };

    const serieDiaria = Array.isArray(src.serieDiaria)
        ? src.serieDiaria.map((item) => ({
            fecha: item.fecha ?? item.dia ?? '',
            total: numeroSeguro(item.total ?? item.ingresos ?? item.monto),
            cantidad: numeroSeguro(item.cantidad ?? item.ventas ?? item.totalVentas),
        }))
        : [];

    const porMetodoPago = Array.isArray(src.porMetodoPago)
        ? src.porMetodoPago.map((item) => ({
            nombre: item.nombre ?? item.metodo ?? item.metodoPago?.nombre ?? item.codigo ?? 'Sin método',
            codigo: String(item.codigo ?? item.metodoPago?.codigo ?? '').toUpperCase(),
            cantidad: numeroSeguro(item.cantidad ?? item.ventas ?? item.totalVentas),
            total: numeroSeguro(item.total ?? item.monto ?? item.ingresos),
        }))
        : [];

    const porEstado = Array.isArray(src.porEstado)
        ? src.porEstado.map((item) => ({
            estado: String(item.estado ?? 'DESCONOCIDO').toUpperCase(),
            cantidad: numeroSeguro(item.cantidad ?? item.totalVentas ?? item.ventas),
            total: numeroSeguro(item.total ?? item.monto),
        }))
        : [];

    const ultimasVentas = Array.isArray(src.ultimasVentas)
        ? src.ultimasVentas.map((v) => ({
            id: v.id,
            folio: v.folio ?? v.folioVentaId ?? (v.id ? `#${v.id}` : '—'),
            fecha: v.fecha ?? v.createdAt,
            cliente: v.clienteNombre ?? nombrePersona(v.cliente, 'Público general'),
            empleado: v.empleadoNombre ?? nombrePersona(v.empleado, '—'),
            metodoPago: v.metodoPagoNombre ?? v.metodoPago?.nombre ?? (typeof v.metodoPago === 'string' ? v.metodoPago : '—'),
            estado: String(v.estado ?? 'completada').toUpperCase(),
            total: numeroSeguro(v.total),
        }))
        : [];

    return { kpis, serieDiaria, porMetodoPago, porEstado, ultimasVentas };
}

function normalizarReporteRendimiento(raw) {
    const src = raw ?? {};
    const ventasPorEmpleado = Array.isArray(src.ventasPorEmpleado)
        ? src.ventasPorEmpleado.map((item) => ({
            empleadoId: item.empleadoId ?? item.id,
            nombre: item.nombre ?? item.empleadoNombre ?? nombrePersona(item.empleado, 'Sin asignar'),
            puesto: item.puesto ?? item.empleado?.puesto?.nombre ?? '',
            cantidad: numeroSeguro(item.cantidad ?? item.totalVentas ?? item.ventas),
            total: numeroSeguro(item.total ?? item.montoTotal ?? item.ingresos),
            ticketPromedio: numeroSeguro(
                item.ticketPromedio ?? (
                    numeroSeguro(item.cantidad ?? item.totalVentas ?? item.ventas) > 0
                        ? numeroSeguro(item.total ?? item.montoTotal ?? item.ingresos) /
                          numeroSeguro(item.cantidad ?? item.totalVentas ?? item.ventas)
                        : 0
                )
            ),
        }))
        : [];

    const asistRaw = src.asistencias ?? {};
    const serieAsistencias = Array.isArray(asistRaw.serieDiaria)
        ? asistRaw.serieDiaria
        : Array.isArray(src.serieAsistenciasVisitas)
            ? src.serieAsistenciasVisitas
            : [];

    const asistencias = {
        totalAsistencias: numeroSeguro(
            asistRaw.totalAsistencias ?? asistRaw.asistencias ?? asistRaw.total ?? src.totalAsistencias
        ),
        totalVisitas: numeroSeguro(
            asistRaw.totalVisitas ?? asistRaw.visitas ?? src.visitas?.total ?? src.totalVisitas
        ),
        ingresosVisitas: numeroSeguro(
            asistRaw.ingresosVisitas ?? src.visitas?.ingresos ?? src.ingresosVisitas
        ),
        serieDiaria: serieAsistencias.map((d) => ({
            fecha: d.fecha ?? d.dia ?? '',
            asistencias: numeroSeguro(d.asistencias ?? d.cantidadAsistencias ?? d.socios),
            visitas: numeroSeguro(d.visitas ?? d.cantidadVisitas ?? d.externos),
        })),
    };

    const membRaw = src.membresias ?? {};
    const membresias = {
        vigentes: numeroSeguro(membRaw.vigentes ?? membRaw.activas),
        vencidas: numeroSeguro(membRaw.vencidas ?? membRaw.expiradas),
        canceladas: numeroSeguro(membRaw.canceladas),
        porVencer7Dias: numeroSeguro(
            membRaw.porVencer7Dias ?? membRaw.porVencer ?? membRaw.proximasAVencer
        ),
        clientesActivos: numeroSeguro(membRaw.clientesActivos ?? membRaw.totalClientesActivos),
    };

    const cajaRaw = src.caja ?? {};
    const caja = {
        aperturasAbiertas: numeroSeguro(cajaRaw.aperturasAbiertas ?? cajaRaw.abiertas),
        cortes: numeroSeguro(cajaRaw.cortes ?? cajaRaw.totalCortes ?? cajaRaw.cortesRealizados),
        diferenciaAcumulada: numeroSeguro(cajaRaw.diferenciaAcumulada ?? cajaRaw.diferenciaTotal),
        cortesCuadrados: numeroSeguro(cajaRaw.cortesCuadrados ?? cajaRaw.cuadrados),
    };

    return { ventasPorEmpleado, asistencias, membresias, caja };
}

function normalizarTopProductos(raw) {
    const src = raw ?? {};
    const lista = Array.isArray(src.top)
        ? src.top
        : Array.isArray(src.productos)
            ? src.productos
            : [];

    const top = lista.slice(0, 15).map((item, idx) => {
        const stockAlmacenesRaw =
            item.stockPorAlmacen ?? item.porAlmacen ?? item.almacenes ?? item.inventarios ?? [];
        const stockPorAlmacen = Array.isArray(stockAlmacenesRaw)
            ? stockAlmacenesRaw.map((alm) => ({
                almacenId: alm.almacenId ?? alm.id,
                nombre: alm.almacenNombre ?? alm.nombre ?? alm.almacen?.nombre ?? `Almacén #${alm.almacenId ?? ''}`,
                esPrincipal: Boolean(alm.esPrincipal ?? alm.almacen?.esPrincipal),
                stockActual: numeroSeguro(alm.stockActual ?? alm.stock),
                stockMinimo: numeroSeguro(alm.stockMinimo ?? alm.minimo, 1),
            }))
            : [];

        return {
            ranking: numeroSeguro(item.ranking ?? item.posicion, idx + 1),
            productoId: item.productoId ?? item.id ?? idx + 1,
            nombre: item.nombre ?? item.producto?.nombre ?? `Producto #${item.productoId ?? idx + 1}`,
            codigoBarras: item.codigoBarras ?? item.codigo ?? item.producto?.codigoBarras ?? '—',
            categoria: item.categoria ?? item.categoriaNombre ?? item.producto?.categoria?.nombre ?? 'Sin categoría',
            unidadesVendidas: numeroSeguro(
                item.unidadesVendidas ?? item.cantidadVendida ?? item.unidades ?? item.cantidad
            ),
            ingresos: numeroSeguro(item.ingresos ?? item.totalIngresos ?? item.total ?? item.monto),
            stockActual: numeroSeguro(item.stockActual ?? item.stock),
            stockGlobal: numeroSeguro(item.stockGlobal ?? item.stockActual ?? item.stock),
            stockMinimo: numeroSeguro(item.stockMinimo ?? item.minimo, 1),
            stockPorAlmacen,
        };
    });

    const resumenRaw = src.resumenStock ?? {};
    const resumenStock = {
        totalProductos: numeroSeguro(resumenRaw.totalProductos ?? resumenRaw.productosActivos),
        unidadesTotales: numeroSeguro(resumenRaw.unidadesTotales ?? resumenRaw.stockTotal ?? resumenRaw.totalUnidades),
        stockBajo: numeroSeguro(resumenRaw.stockBajo ?? resumenRaw.productosStockBajo ?? resumenRaw.bajoMinimo),
        agotados: numeroSeguro(resumenRaw.agotados ?? resumenRaw.sinStock ?? resumenRaw.productosAgotados),
        valorInventario: numeroSeguro(resumenRaw.valorInventario ?? resumenRaw.valorTotal),
    };

    return { top, resumenStock };
}

function extraerSeccionesResumen(raw) {
    const data = raw ?? {};
    const ventasSrc = data.ventas ?? data;
    const rendimientoSrc = data.rendimiento ?? data;
    const topSrc = data.topProductos ?? data.top_productos ?? data;
    return {
        ventas: normalizarReporteVentas(ventasSrc),
        rendimiento: normalizarReporteRendimiento(rendimientoSrc),
        topProductos: normalizarTopProductos(topSrc),
        rango: data.filtros ?? data.rango ?? null,
    };
}

function escaparCsv(valor) {
    const str = valor === null || valor === undefined ? '' : String(valor);
    const protegido = /^[=+@]/.test(str) ? `'${str}` : str;
    if (/[",\n\r]/.test(protegido)) {
        return `"${protegido.replace(/"/g, '""')}"`;
    }
    return protegido;
}

function construirCsvReportes({ sucursalNombre, almacenNombre, filtros, reportes }) {
    const filas = [];
    const agregarFila = (...cols) => filas.push(cols.map(escaparCsv).join(','));

    agregarFila('REPORTE APEXGYM');
    agregarFila('Sucursal', sucursalNombre);
    agregarFila('Almacén', almacenNombre || 'Todos los almacenes');
    agregarFila('Fecha inicio', filtros.fechaInicio);
    agregarFila('Fecha fin', filtros.fechaFin);
    agregarFila('Generado el', new Date().toLocaleString('es-MX'));
    agregarFila('');

    const { ventas, rendimiento, topProductos } = reportes;

    agregarFila('1. REPORTE DE VENTAS - KPIs');
    agregarFila('Ingresos totales', 'Número de ventas', 'Ticket promedio', 'Cancelaciones (Cant.)', 'Cancelaciones ($)', 'Devoluciones (Cant.)', 'Devoluciones ($)');
    agregarFila(
        ventas.kpis.ingresosTotales.toFixed(2),
        ventas.kpis.totalVentas,
        ventas.kpis.ticketPromedio.toFixed(2),
        ventas.kpis.cancelacionesCantidad,
        ventas.kpis.cancelacionesMonto.toFixed(2),
        ventas.kpis.devolucionesCantidad,
        ventas.kpis.devolucionesMonto.toFixed(2)
    );
    agregarFila('');

    agregarFila('VENTAS DIARIAS');
    agregarFila('Fecha', 'Ventas', 'Ingresos');
    ventas.serieDiaria.forEach((d) => agregarFila(d.fecha, d.cantidad, d.total.toFixed(2)));
    agregarFila('');

    agregarFila('DESGLOSE POR MÉTODO DE PAGO');
    agregarFila('Método', 'Cantidad', 'Total');
    ventas.porMetodoPago.forEach((m) => agregarFila(m.nombre, m.cantidad, m.total.toFixed(2)));
    agregarFila('');

    agregarFila('ÚLTIMAS VENTAS');
    agregarFila('Folio', 'Fecha', 'Cliente', 'Método de pago', 'Estado', 'Total');
    ventas.ultimasVentas.forEach((v) =>
        agregarFila(v.folio, formatearFechaHora(v.fecha), v.cliente, v.metodoPago, v.estado, v.total.toFixed(2))
    );
    agregarFila('');

    agregarFila('2. REPORTE DE RENDIMIENTO - VENTAS POR EMPLEADO');
    agregarFila('Empleado', 'Ventas', 'Ingresos', 'Ticket promedio');
    rendimiento.ventasPorEmpleado.forEach((e) =>
        agregarFila(e.nombre, e.cantidad, e.total.toFixed(2), e.ticketPromedio.toFixed(2))
    );
    agregarFila('');

    agregarFila('ASISTENCIAS Y VISITAS DIARIAS');
    agregarFila('Fecha', 'Asistencias socios', 'Visitas externos');
    rendimiento.asistencias.serieDiaria.forEach((a) =>
        agregarFila(a.fecha, a.asistencias, a.visitas)
    );
    agregarFila('');

    agregarFila('MEMBRESÍAS Y CAJA');
    agregarFila('Membresías vigentes', 'Vencidas', 'Canceladas', 'Por vencer (7 días)', 'Clientes activos', 'Aperturas abiertas', 'Cortes', 'Diferencia acumulada', 'Cortes cuadrados');
    agregarFila(
        rendimiento.membresias.vigentes,
        rendimiento.membresias.vencidas,
        rendimiento.membresias.canceladas,
        rendimiento.membresias.porVencer7Dias,
        rendimiento.membresias.clientesActivos,
        rendimiento.caja.aperturasAbiertas,
        rendimiento.caja.cortes,
        rendimiento.caja.diferenciaAcumulada.toFixed(2),
        rendimiento.caja.cortesCuadrados
    );
    agregarFila('');

    agregarFila('3. TOP PRODUCTOS VENDIDOS (#1..#15)');
    agregarFila('Ranking', 'Producto', 'Categoría', 'Unidades vendidas', 'Ingresos', 'Stock actual', 'Stock mínimo', 'Stock por almacén');
    topProductos.top.forEach((p) => {
        const detalleAlm = p.stockPorAlmacen
            .map((a) => `${a.nombre}: ${a.stockActual}`)
            .join(' | ');
        agregarFila(
            `#${p.ranking}`,
            p.nombre,
            p.categoria,
            p.unidadesVendidas,
            p.ingresos.toFixed(2),
            p.stockActual,
            p.stockMinimo,
            detalleAlm || '—'
        );
    });

    return `\uFEFF${filas.join('\r\n')}`;
}

function descargarArchivo(contenido, nombreArchivo, tipoMime) {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}

const ACENTO_KPI = {
    navy: '',
    orange: classes.kpiAccentOrange,
    green: classes.kpiAccentGreen,
    red: classes.kpiAccentRed,
    blue: classes.kpiAccentBlue,
};

function KpiCard({ label, value, hint, icon: Icono, accent = 'navy', iconColor = 'secondary' }) {
    return (
        <div className={`${classes.kpiCard} ${ACENTO_KPI[accent] ?? ''}`}>
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                <div style={{ minWidth: 0 }}>
                    <Text className={classes.kpiLabel}>{label}</Text>
                    <Text className={classes.kpiValue}>{value}</Text>
                    {hint && <Text className={classes.kpiHint}>{hint}</Text>}
                </div>
                {Icono && (
                    <ThemeIcon size={38} radius="md" variant="light" color={iconColor} style={{ flexShrink: 0 }}>
                        {createElement(Icono, { size: 20, stroke: 1.8 })}
                    </ThemeIcon>
                )}
            </Group>
        </div>
    );
}

function GraficaBarrasDiariaSvg({
    idTitulo,
    titulo,
    subtitulo,
    items,
    modo = 'ventas',
}) {
    const [indiceActivo, setIndiceActivo] = useState(null);

    const width = 680;
    const height = 228;
    const padLeft = 56;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const maxValor = useMemo(() => {
        if (!items || items.length === 0) return 1;
        let max = 0;
        for (const item of items) {
            if (modo === 'ventas') {
                max = Math.max(max, item.total);
            } else {
                max = Math.max(max, item.asistencias, item.visitas);
            }
        }
        return max > 0 ? max : 1;
    }, [items, modo]);

    const itemActivo =
        indiceActivo !== null && items[indiceActivo]
            ? items[indiceActivo]
            : items.length > 0
                ? items[items.length - 1]
                : null;

    const slotW = items.length > 0 ? plotW / items.length : plotW;
    const pasoEtiquetaX = items.length > 10 ? Math.ceil(items.length / 7) : 1;

    return (
        <Paper className={classes.panelCard}>
            <Group justify="space-between" align="center" mb="xs" wrap="wrap" gap="xs">
                <div>
                    <Text className={classes.panelHeading}>{titulo}</Text>
                    {subtitulo && (
                        <Text size="xs" c="#475569">
                            {subtitulo}
                        </Text>
                    )}
                </div>
                {modo === 'asistencias' ? (
                    <Group gap="sm">
                        <Group gap={6}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#1B1F3A', display: 'inline-block' }} />
                            <Text size="xs" fw={600} c="#1E293B">Asistencias</Text>
                        </Group>
                        <Group gap={6}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FF6A00', display: 'inline-block' }} />
                            <Text size="xs" fw={600} c="#1E293B">Visitas</Text>
                        </Group>
                    </Group>
                ) : (
                    <Group gap={6}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FF6A00', display: 'inline-block' }} />
                        <Text size="xs" fw={600} c="#1E293B">Ingresos diarios</Text>
                    </Group>
                )}
            </Group>

            {items.length === 0 ? (
                <Stack align="center" justify="center" py="xl" gap="xs">
                    <ThemeIcon size={40} radius="xl" variant="light" color="gray">
                        <IconChartBar size={20} />
                    </ThemeIcon>
                    <Text size="sm" c="#475569">
                        No hay registros diarios en el rango seleccionado.
                    </Text>
                </Stack>
            ) : (
                <>
                    <div className={classes.chartWrapper}>
                        <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className={classes.chartSvg}
                            role="img"
                            aria-labelledby={idTitulo}
                        >
                            <title id={idTitulo}>{titulo}</title>
                            <desc>
                                {modo === 'ventas'
                                    ? `Serie diaria de ingresos en el rango seleccionado con ${items.length} días.`
                                    : `Comparativa diaria de asistencias de socios y visitas externas en ${items.length} días.`}
                            </desc>

                            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                                const y = padTop + plotH - frac * plotH;
                                const val = maxValor * frac;
                                const label = modo === 'ventas'
                                    ? (val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${Math.round(val)}`)
                                    : Math.round(val);
                                return (
                                    <g key={frac}>
                                        <line
                                            x1={padLeft}
                                            y1={y}
                                            x2={width - padRight}
                                            y2={y}
                                            stroke="#E2E8F0"
                                            strokeDasharray={frac === 0 ? undefined : '3 3'}
                                        />
                                        <text
                                            x={padLeft - 8}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="10"
                                            fill="#475569"
                                            fontWeight="600"
                                        >
                                            {label}
                                        </text>
                                    </g>
                                );
                            })}

                            {items.map((item, idx) => {
                                const xSlot = padLeft + idx * slotW;
                                const esActivo = indiceActivo === idx;
                                const mostrarLabel = idx % pasoEtiquetaX === 0 || idx === items.length - 1;

                                if (modo === 'ventas') {
                                    const barW = Math.min(28, Math.max(8, slotW * 0.62));
                                    const barH = Math.max(item.total > 0 ? 3 : 0, (item.total / maxValor) * plotH);
                                    const x = xSlot + (slotW - barW) / 2;
                                    const y = padTop + plotH - barH;
                                    return (
                                        <g
                                            key={item.fecha || idx}
                                            className={classes.chartBarGroup}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`${formatearFechaCorta(item.fecha)}: ${formatoMoneda.format(item.total)}, ${item.cantidad} ventas`}
                                            onMouseEnter={() => setIndiceActivo(idx)}
                                            onFocus={() => setIndiceActivo(idx)}
                                            onMouseLeave={() => setIndiceActivo(null)}
                                        >
                                            <rect
                                                x={xSlot}
                                                y={padTop}
                                                width={slotW}
                                                height={plotH}
                                                fill="transparent"
                                            />
                                            <rect
                                                x={x}
                                                y={y}
                                                width={barW}
                                                height={barH}
                                                rx={4}
                                                fill={esActivo ? '#1B1F3A' : '#FF6A00'}
                                            />
                                            {mostrarLabel && (
                                                <text
                                                    x={xSlot + slotW / 2}
                                                    y={height - 12}
                                                    textAnchor="middle"
                                                    fontSize="10"
                                                    fill="#475569"
                                                    fontWeight={esActivo ? '700' : '500'}
                                                >
                                                    {formatearFechaCorta(item.fecha)}
                                                </text>
                                            )}
                                        </g>
                                    );
                                }

                                const pairW = Math.min(34, Math.max(12, slotW * 0.72));
                                const subW = Math.max(5, (pairW - 3) / 2);
                                const hAsist = Math.max(item.asistencias > 0 ? 3 : 0, (item.asistencias / maxValor) * plotH);
                                const hVisita = Math.max(item.visitas > 0 ? 3 : 0, (item.visitas / maxValor) * plotH);
                                const xBase = xSlot + (slotW - (subW * 2 + 3)) / 2;

                                return (
                                    <g
                                        key={item.fecha || idx}
                                        className={classes.chartBarGroup}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${formatearFechaCorta(item.fecha)}: ${item.asistencias} asistencias, ${item.visitas} visitas`}
                                        onMouseEnter={() => setIndiceActivo(idx)}
                                        onFocus={() => setIndiceActivo(idx)}
                                        onMouseLeave={() => setIndiceActivo(null)}
                                    >
                                        <rect
                                            x={xSlot}
                                            y={padTop}
                                            width={slotW}
                                            height={plotH}
                                            fill={esActivo ? 'rgba(27, 31, 58, 0.05)' : 'transparent'}
                                        />
                                        <rect
                                            x={xBase}
                                            y={padTop + plotH - hAsist}
                                            width={subW}
                                            height={hAsist}
                                            rx={3}
                                            fill="#1B1F3A"
                                        />
                                        <rect
                                            x={xBase + subW + 3}
                                            y={padTop + plotH - hVisita}
                                            width={subW}
                                            height={hVisita}
                                            rx={3}
                                            fill="#FF6A00"
                                        />
                                        {mostrarLabel && (
                                            <text
                                                x={xSlot + slotW / 2}
                                                y={height - 12}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fill="#475569"
                                                fontWeight={esActivo ? '700' : '500'}
                                            >
                                                {formatearFechaCorta(item.fecha)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {itemActivo && (
                        <div className={classes.chartReadout}>
                            <Text size="xs" fw={700} c="#1B1F3A">
                                {indiceActivo === null ? 'Último día: ' : 'Detalle: '}
                                {formatearFechaCorta(itemActivo.fecha)}
                            </Text>
                            {modo === 'ventas' ? (
                                <Group gap="md">
                                    <Text size="xs" fw={700} className={classes.accessibleOrangeText}>
                                        Ingresos: {formatoMoneda.format(itemActivo.total)}
                                    </Text>
                                    <Text size="xs" fw={600} c="#1E293B">
                                        Ventas: {formatoNumero.format(itemActivo.cantidad)}
                                    </Text>
                                </Group>
                            ) : (
                                <Group gap="md">
                                    <Text size="xs" fw={700} c="#1B1F3A">
                                        Asistencias: {formatoNumero.format(itemActivo.asistencias)}
                                    </Text>
                                    <Text size="xs" fw={700} className={classes.accessibleOrangeText}>
                                        Visitas: {formatoNumero.format(itemActivo.visitas)}
                                    </Text>
                                </Group>
                            )}
                        </div>
                    )}
                </>
            )}
        </Paper>
    );
}

function GraficaTopProductosSvg({ productos }) {
    const visibles = productos.slice(0, 8);
    const maxUnidades = useMemo(() => {
        const vals = visibles.map((p) => p.unidadesVendidas);
        return Math.max(1, ...vals);
    }, [visibles]);

    if (visibles.length === 0) return null;

    const width = 660;
    const rowH = 30;
    const padLeft = 180;
    const padRight = 95;
    const padTop = 10;
    const height = padTop * 2 + visibles.length * rowH;
    const plotW = width - padLeft - padRight;

    return (
        <Paper className={classes.panelCard}>
            <Group justify="space-between" align="center" mb="xs">
                <div>
                    <Text className={classes.panelHeading}>Comparativa visual de unidades vendidas</Text>
                    <Text size="xs" c="#475569">
                        Top {visibles.length} productos por volumen de salida
                    </Text>
                </div>
            </Group>
            <div className={classes.chartWrapper}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className={classes.chartSvg}
                    role="img"
                    aria-labelledby="titulo-grafica-top-productos"
                >
                    <title id="titulo-grafica-top-productos">Top productos vendidos</title>
                    <desc>Gráfica horizontal comparando las unidades vendidas e ingresos de los productos más populares.</desc>

                    {visibles.map((p, idx) => {
                        const y = padTop + idx * rowH;
                        const barW = Math.max(4, (p.unidadesVendidas / maxUnidades) * plotW);
                        const nombreCorto = p.nombre.length > 24 ? `${p.nombre.slice(0, 23)}…` : p.nombre;
                        return (
                            <g key={p.productoId || idx}>
                                <text
                                    x={padLeft - 10}
                                    y={y + 18}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="#1E293B"
                                    fontWeight={idx < 3 ? '700' : '500'}
                                >
                                    #{p.ranking} {nombreCorto}
                                </text>
                                <rect
                                    x={padLeft}
                                    y={y + 6}
                                    width={plotW}
                                    height={16}
                                    rx={4}
                                    fill="#F1F5F9"
                                />
                                <rect
                                    x={padLeft}
                                    y={y + 6}
                                    width={barW}
                                    height={16}
                                    rx={4}
                                    fill={idx === 0 ? '#FF6A00' : idx < 3 ? '#1B1F3A' : '#475569'}
                                />
                                <text
                                    x={padLeft + plotW + 8}
                                    y={y + 18}
                                    fontSize="11"
                                    fill="#1B1F3A"
                                    fontWeight="700"
                                >
                                    {formatoNumero.format(p.unidadesVendidas)} u.
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </Paper>
    );
}

const COLORES_METODOS = ['#FF6A00', '#1B1F3A', '#15803D', '#1D4ED8', '#7C3AED'];

const COLOR_ESTADO_VENTA = {
    COMPLETADA: 'green',
    COMPLETADO: 'green',
    APROBADO: 'green',
    PENDIENTE: 'yellow',
    CANCELADA: 'red',
    CANCELADO: 'red',
    REEMBOLSADO: 'blue',
    DEVUELTA: 'blue',
};

function SeccionVentas({ reporte }) {
    const { kpis, serieDiaria, porMetodoPago, porEstado, ultimasVentas } = reporte;
    const totalMetodos = useMemo(
        () => porMetodoPago.reduce((acc, m) => acc + m.total, 0),
        [porMetodoPago]
    );

    return (
        <Stack gap="md" component="section" aria-labelledby="sec-ventas-titulo">
            <div className={classes.sectionHeader}>
                <Group gap="xs">
                    <ThemeIcon size={34} radius="md" color="orange" variant="light">
                        <IconCash size={20} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={3} id="sec-ventas-titulo" className={classes.sectionTitle}>
                            1. Reportes de Ventas
                        </Title>
                        <Text size="xs" c="#475569">
                            Ingresos, volumen de transacciones, métodos de pago y actividad reciente
                        </Text>
                    </div>
                </Group>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <KpiCard
                    label="Ingresos totales"
                    value={formatoMoneda.format(kpis.ingresosTotales)}
                    hint="Ventas cobradas en el periodo"
                    icon={IconTrendingUp}
                    accent="orange"
                    iconColor="orange"
                />
                <KpiCard
                    label="Número de ventas"
                    value={formatoNumero.format(kpis.totalVentas)}
                    hint="Transacciones registradas"
                    icon={IconCashRegister}
                    accent="navy"
                    iconColor="indigo"
                />
                <KpiCard
                    label="Ticket promedio"
                    value={formatoMoneda.format(kpis.ticketPromedio)}
                    hint="Promedio por venta válida"
                    icon={IconChartLine}
                    accent="green"
                    iconColor="green"
                />
                <KpiCard
                    label="Cancelaciones y devoluciones"
                    value={`${kpis.cancelacionesCantidad} / ${kpis.devolucionesCantidad}`}
                    hint={`Canc: ${formatoMoneda.format(kpis.cancelacionesMonto)} · Dev: ${formatoMoneda.format(kpis.devolucionesMonto)}`}
                    icon={IconAlertTriangle}
                    accent="red"
                    iconColor="red"
                />
            </SimpleGrid>

            <div className={classes.salesChartGrid}>
                <GraficaBarrasDiariaSvg
                    idTitulo="titulo-grafica-ventas"
                    titulo="Tendencia diaria de ventas"
                    subtitulo="Pasa el cursor o enfoca cada barra para consultar ingresos y cantidad"
                    items={serieDiaria}
                    modo="ventas"
                />
                <Paper className={classes.panelCard} style={{ height: '100%' }}>
                    <Text className={classes.panelHeading} mb="xs">
                        Desglose por método de pago
                    </Text>
                    {porMetodoPago.length === 0 ? (
                        <Text size="sm" c="#475569" py="md">
                            Sin cobros registrados en el periodo.
                        </Text>
                    ) : (
                        <Stack gap="sm">
                            {porMetodoPago.map((metodo, idx) => {
                                const pct = totalMetodos > 0 ? Math.round((metodo.total / totalMetodos) * 100) : 0;
                                const color = COLORES_METODOS[idx % COLORES_METODOS.length];
                                return (
                                    <div key={`${metodo.codigo || metodo.nombre}-${idx}`}>
                                        <Group justify="space-between" mb={4} wrap="nowrap">
                                            <Text size="xs" fw={700} c="#1E293B" truncate>
                                                {metodo.nombre} ({metodo.cantidad})
                                            </Text>
                                            <Text size="xs" fw={700} c="#1B1F3A" className={classes.numericCell}>
                                                {formatoMoneda.format(metodo.total)} ({pct}%)
                                            </Text>
                                        </Group>
                                        <div className={classes.progressTrack}>
                                            <div
                                                className={classes.progressFill}
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </Stack>
                    )}

                    {porEstado.length > 0 && (
                        <Stack gap={6} mt="md" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
                            <Text size="xs" fw={700} c="#475569" tt="uppercase">
                                Por estado
                            </Text>
                            <Group gap="xs" wrap="wrap">
                                {porEstado.map((est) => (
                                    <Badge
                                        key={est.estado}
                                        variant="light"
                                        color={COLOR_ESTADO_VENTA[est.estado] ?? 'gray'}
                                        size="sm"
                                    >
                                        {est.estado}: {est.cantidad} ({formatoMoneda.format(est.total)})
                                    </Badge>
                                ))}
                            </Group>
                        </Stack>
                    )}
                </Paper>
            </div>

            <Paper className={classes.panelCard}>
                <Group justify="space-between" mb="xs">
                    <Text className={classes.panelHeading}>Últimas ventas del periodo</Text>
                    <Badge variant="light" color="gray" size="sm">
                        {ultimasVentas.length} registros
                    </Badge>
                </Group>
                {ultimasVentas.length === 0 ? (
                    <Text size="sm" c="#475569" py="md">
                        No hay ventas recientes que coincidan con los filtros actuales.
                    </Text>
                ) : (
                    <Table.ScrollContainer minWidth={680}>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Folio</Table.Th>
                                    <Table.Th>Fecha</Table.Th>
                                    <Table.Th>Cliente</Table.Th>
                                    <Table.Th>Método de pago</Table.Th>
                                    <Table.Th>Estado</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ultimasVentas.map((venta, idx) => (
                                    <Table.Tr key={venta.id ?? idx}>
                                        <Table.Td fw={700}>{venta.folio}</Table.Td>
                                        <Table.Td>{formatearFechaHora(venta.fecha)}</Table.Td>
                                        <Table.Td>{venta.cliente}</Table.Td>
                                        <Table.Td>{venta.metodoPago}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color={COLOR_ESTADO_VENTA[venta.estado] ?? 'gray'}
                                            >
                                                {venta.estado}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right', fontWeight: 700 }} className={classes.numericCell}>
                                            {formatoMoneda.format(venta.total)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>
        </Stack>
    );
}

function SeccionRendimiento({ reporte }) {
    const { ventasPorEmpleado, asistencias, membresias, caja } = reporte;

    return (
        <Stack gap="md" component="section" aria-labelledby="sec-rendimiento-titulo">
            <div className={classes.sectionHeader}>
                <Group gap="xs">
                    <ThemeIcon size={34} radius="md" color="indigo" variant="light">
                        <IconUsers size={20} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={3} id="sec-rendimiento-titulo" className={classes.sectionTitle}>
                            2. Reportes de Rendimiento
                        </Title>
                        <Text size="xs" c="#475569">
                            Productividad por empleado, flujo de asistencias/visitas, membresías y control de caja
                        </Text>
                    </div>
                </Group>
            </div>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                <Paper className={classes.panelCard}>
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                            <IconIdBadge size={18} color="#1B1F3A" />
                            <Text className={classes.panelHeading}>Resumen de membresías</Text>
                        </Group>
                        <Badge variant="light" color="teal" size="sm">
                            {formatoNumero.format(membresias.clientesActivos)} clientes activos
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                        <KpiCard label="Vigentes" value={formatoNumero.format(membresias.vigentes)} accent="green" />
                        <KpiCard label="Por vencer (7 días)" value={formatoNumero.format(membresias.porVencer7Dias)} accent="orange" />
                        <KpiCard label="Vencidas" value={formatoNumero.format(membresias.vencidas)} accent="red" />
                        <KpiCard label="Canceladas" value={formatoNumero.format(membresias.canceladas)} accent="navy" />
                        <KpiCard label="Clientes activos" value={formatoNumero.format(membresias.clientesActivos)} accent="blue" />
                    </SimpleGrid>
                </Paper>

                <Paper className={classes.panelCard}>
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                            <IconCashRegister size={18} color="#1B1F3A" />
                            <Text className={classes.panelHeading}>Resumen de caja</Text>
                        </Group>
                        <Badge
                            variant="light"
                            color={caja.diferenciaAcumulada === 0 ? 'green' : caja.diferenciaAcumulada > 0 ? 'blue' : 'red'}
                            size="sm"
                        >
                            Dif: {formatoMoneda.format(caja.diferenciaAcumulada)}
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 2 }} spacing="xs">
                        <KpiCard
                            label="Aperturas abiertas"
                            value={formatoNumero.format(caja.aperturasAbiertas)}
                            hint="Cajas actualmente activas"
                            accent="orange"
                        />
                        <KpiCard
                            label="Cortes realizados"
                            value={formatoNumero.format(caja.cortes)}
                            hint="En el rango seleccionado"
                            accent="navy"
                        />
                        <KpiCard
                            label="Cortes cuadrados"
                            value={formatoNumero.format(caja.cortesCuadrados)}
                            hint="Diferencia igual a $0.00"
                            accent="green"
                        />
                        <KpiCard
                            label="Diferencia acumulada"
                            value={formatoMoneda.format(caja.diferenciaAcumulada)}
                            hint="Suma neta de cortes"
                            accent={caja.diferenciaAcumulada < 0 ? 'red' : 'blue'}
                        />
                    </SimpleGrid>
                </Paper>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <KpiCard
                    label="Total asistencias (socios)"
                    value={formatoNumero.format(asistencias.totalAsistencias)}
                    hint="Entradas registradas"
                    icon={IconCheck}
                    accent="navy"
                    iconColor="indigo"
                />
                <KpiCard
                    label="Total visitas (externos)"
                    value={formatoNumero.format(asistencias.totalVisitas)}
                    hint="Pases y visitas por día"
                    icon={IconUsers}
                    accent="orange"
                    iconColor="orange"
                />
                <KpiCard
                    label="Ingresos por visitas"
                    value={formatoMoneda.format(asistencias.ingresosVisitas)}
                    hint="Cobro de visitas diarias"
                    icon={IconCash}
                    accent="green"
                    iconColor="green"
                />
            </SimpleGrid>

            <GraficaBarrasDiariaSvg
                idTitulo="titulo-grafica-asistencias"
                titulo="Asistencias y visitas diarias"
                subtitulo="Comparativo diario de acceso de socios vs visitas externas"
                items={asistencias.serieDiaria}
                modo="asistencias"
            />

            <Paper className={classes.panelCard}>
                <Group justify="space-between" mb="xs">
                    <Text className={classes.panelHeading}>Ventas por empleado</Text>
                    <Badge variant="light" color="gray" size="sm">
                        {ventasPorEmpleado.length} empleados
                    </Badge>
                </Group>
                {ventasPorEmpleado.length === 0 ? (
                    <Text size="sm" c="#475569" py="md">
                        Sin ventas atribuidas a empleados en el periodo.
                    </Text>
                ) : (
                    <Table.ScrollContainer minWidth={560}>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Empleado</Table.Th>
                                    <Table.Th style={{ textAlign: 'center' }}># Ventas</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Total vendido</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Ticket promedio</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ventasPorEmpleado.map((emp, idx) => (
                                    <Table.Tr key={emp.empleadoId ?? idx}>
                                        <Table.Td>
                                            <Text size="sm" fw={600} c="#1E293B">{emp.nombre}</Text>
                                            {emp.puesto && (
                                                <Text size="xs" c="#475569">{emp.puesto}</Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'center' }} className={classes.numericCell}>
                                            <Badge variant="light" color="indigo" size="sm">
                                                {formatoNumero.format(emp.cantidad)}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right', fontWeight: 700 }} className={classes.numericCell}>
                                            {formatoMoneda.format(emp.total)}
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }} className={classes.numericCell}>
                                            {formatoMoneda.format(emp.ticketPromedio)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>
        </Stack>
    );
}

function SeccionTopProductos({ reporte }) {
    const { top, resumenStock } = reporte;

    return (
        <Stack gap="md" component="section" aria-labelledby="sec-top-titulo">
            <div className={classes.sectionHeader}>
                <Group gap="xs">
                    <ThemeIcon size={34} radius="md" color="orange" variant="light">
                        <IconStar size={20} stroke={1.8} />
                    </ThemeIcon>
                    <div>
                        <Title order={3} id="sec-top-titulo" className={classes.sectionTitle}>
                            3. Top de Productos Vendidos
                        </Title>
                        <Text size="xs" c="#475569">
                            Ranking #1..#15 por unidades e ingresos, existencias globales y desglose por almacén
                        </Text>
                    </div>
                </Group>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <KpiCard
                    label="Productos en catálogo"
                    value={formatoNumero.format(resumenStock.totalProductos)}
                    hint="Productos activos en sucursal"
                    icon={IconPackage}
                    accent="navy"
                    iconColor="indigo"
                />
                <KpiCard
                    label="Unidades en stock"
                    value={formatoNumero.format(resumenStock.unidadesTotales)}
                    hint={`Valor ref: ${formatoMoneda.format(resumenStock.valorInventario)}`}
                    icon={IconBuildingWarehouse}
                    accent="green"
                    iconColor="green"
                />
                <KpiCard
                    label="Productos con stock bajo"
                    value={formatoNumero.format(resumenStock.stockBajo)}
                    hint="En o debajo del mínimo"
                    icon={IconAlertTriangle}
                    accent="orange"
                    iconColor="orange"
                />
                <KpiCard
                    label="Productos agotados"
                    value={formatoNumero.format(resumenStock.agotados)}
                    hint="Requieren reabastecimiento"
                    icon={IconAlertCircle}
                    accent="red"
                    iconColor="red"
                />
            </SimpleGrid>

            <GraficaTopProductosSvg productos={top} />

            <Paper className={classes.panelCard}>
                <Group justify="space-between" mb="xs">
                    <Text className={classes.panelHeading}>Ranking #1 al #15 de productos vendidos</Text>
                    <Badge variant="light" color="orange" size="sm">
                        Top {top.length}
                    </Badge>
                </Group>
                {top.length === 0 ? (
                    <Text size="sm" c="#475569" py="md">
                        No se encontraron ventas de productos para los filtros seleccionados.
                    </Text>
                ) : (
                    <Table.ScrollContainer minWidth={820}>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Ranking</Table.Th>
                                    <Table.Th>Producto</Table.Th>
                                    <Table.Th>Categoría</Table.Th>
                                    <Table.Th style={{ textAlign: 'center' }}>Unidades</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Ingresos</Table.Th>
                                    <Table.Th style={{ textAlign: 'center' }}>Stock vs Mínimo</Table.Th>
                                    <Table.Th>Desglose por almacén</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {top.map((prod) => {
                                    const agotado = prod.stockActual <= 0;
                                    const bajo = !agotado && prod.stockActual <= prod.stockMinimo;
                                    const colorStock = agotado ? 'red' : bajo ? 'orange' : 'green';
                                    return (
                                        <Table.Tr key={prod.productoId}>
                                            <Table.Td>
                                                <span
                                                    className={`${classes.rankBadge} ${
                                                        prod.ranking <= 3 ? classes.rankTop : classes.rankNormal
                                                    }`}
                                                >
                                                    #{prod.ranking}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={700} c="#1E293B">{prod.nombre}</Text>
                                                {prod.codigoBarras && prod.codigoBarras !== '—' && (
                                                    <Text size="xs" c="#475569">{prod.codigoBarras}</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color="gray" size="sm">
                                                    {prod.categoria}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center', fontWeight: 700 }} className={classes.numericCell}>
                                                {formatoNumero.format(prod.unidadesVendidas)}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right', fontWeight: 700 }} className={classes.numericCell}>
                                                {formatoMoneda.format(prod.ingresos)}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'center' }}>
                                                <Badge variant="light" color={colorStock} size="sm">
                                                    {prod.stockActual} / min {prod.stockMinimo}
                                                </Badge>
                                                {prod.stockGlobal !== prod.stockActual && (
                                                    <Text size="xs" c="#475569" mt={2}>
                                                        Global: {prod.stockGlobal}
                                                    </Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                {prod.stockPorAlmacen.length === 0 ? (
                                                    <Text size="xs" c="#475569">Sin desglose</Text>
                                                ) : (
                                                    <Group gap={4} wrap="wrap">
                                                        {prod.stockPorAlmacen.map((alm, aIdx) => (
                                                            <Badge
                                                                key={alm.almacenId ?? aIdx}
                                                                size="xs"
                                                                variant={alm.esPrincipal ? 'filled' : 'outline'}
                                                                color={alm.stockActual <= 0 ? 'red' : alm.esPrincipal ? 'orange' : 'dark'}
                                                            >
                                                                {alm.nombre}: {alm.stockActual}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>
        </Stack>
    );
}

export function DashboardReportes() {
    const { sucursalActiva } = useSucursal();
    const sucursalId = sucursalActiva?.id ?? 1;

    useEffect(() => {
        const nombreEmpresa = obtenerEmpresaCache()?.nombreComercial || 'ApexGym';
        document.title = `Dashboard y Reportes | ${nombreEmpresa}`;
    }, []);

    const reporteService = useMemo(
        () => api.reporte ?? new ReporteService(api.urlBase || appUrl),
        []
    );
    const almacenService = useMemo(
        () => api.almacen ?? new AlmacenService(api.urlBase || appUrl),
        []
    );

    const rangoInicial = useMemo(() => calcularRangoPreset('30d'), []);
    const [preset, setPreset] = useState('30d');
    const [fechaInicio, setFechaInicio] = useState(rangoInicial.fechaInicio);
    const [fechaFin, setFechaFin] = useState(rangoInicial.fechaFin);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState({ sucursalId, value: '' });
    const [vistaReporte, setVistaReporte] = useState('todos');

    const almacenId = almacenSeleccionado.sucursalId === sucursalId ? almacenSeleccionado.value : '';

    const [almacenes, setAlmacenes] = useState([]);
    const [reportes, setReportes] = useState(() => extraerSeccionesResumen(null));
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [desdeCacheOffline, setDesdeCacheOffline] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

    const cargarAlmacenes = useCallback(async () => {
        if (!sucursalId) return;
        try {
            const res = await almacenService.obtenerTodos();
            const lista = Array.isArray(res?.data) ? res.data : [];
            setAlmacenes(lista);
        } catch {
            // Si no tiene permiso de Almacenes, mantiene selector en "Todos" sin bloquear reportes
            setAlmacenes([]);
        }
    }, [almacenService, sucursalId]);

    useEffect(() => {
        cargarAlmacenes();
    }, [cargarAlmacenes]);

    const rangoInvalido = Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin);

    const cargarReportes = useCallback(async () => {
        if (!sucursalId || rangoInvalido) return;
        setCargando(true);
        setError(null);
        try {
            const params = {
                fechaInicio,
                fechaFin,
                ...(almacenId ? { almacenId: Number(almacenId) } : {}),
            };
            const res = await reporteService.obtenerResumen(params);
            const rawData = res?.data ?? res ?? {};
            const normalizado = extraerSeccionesResumen(rawData);

            // Si algún bloque viniera omitido en /resumen, lo completamos desde su endpoint dedicado
            const tareasFaltantes = [];
            if (!rawData?.ventas && !rawData?.kpis) {
                tareasFaltantes.push(
                    reporteService.obtenerVentas(params).then((r) => {
                        normalizado.ventas = normalizarReporteVentas(r?.data ?? r);
                    })
                );
            }
            if (!rawData?.rendimiento && !rawData?.ventasPorEmpleado) {
                tareasFaltantes.push(
                    reporteService.obtenerRendimiento(params).then((r) => {
                        normalizado.rendimiento = normalizarReporteRendimiento(r?.data ?? r);
                    })
                );
            }
            if (!rawData?.topProductos && !rawData?.top_productos && !rawData?.top) {
                tareasFaltantes.push(
                    reporteService.obtenerTopProductos(params).then((r) => {
                        normalizado.topProductos = normalizarTopProductos(r?.data ?? r);
                    })
                );
            }
            if (tareasFaltantes.length > 0) {
                await Promise.all(tareasFaltantes);
            }

            setReportes(normalizado);
            setDesdeCacheOffline(Boolean(res?.fromOfflineCache));
            setUltimaActualizacion(new Date());
        } catch (err) {
            setError(err?.message || 'No se pudieron cargar los reportes de la sucursal.');
        } finally {
            setCargando(false);
        }
    }, [reporteService, sucursalId, fechaInicio, fechaFin, almacenId, rangoInvalido]);

    useEffect(() => {
        cargarReportes();
    }, [cargarReportes]);

    const aplicarPreset = (nuevoPreset) => {
        setPreset(nuevoPreset);
        if (nuevoPreset !== 'personalizado') {
            const rango = calcularRangoPreset(nuevoPreset);
            setFechaInicio(rango.fechaInicio);
            setFechaFin(rango.fechaFin);
        }
    };

    const almacenActualObj = useMemo(
        () => almacenes.find((a) => String(a.id) === String(almacenId)) ?? null,
        [almacenes, almacenId]
    );

    const exportarCsv = () => {
        const csv = construirCsvReportes({
            sucursalNombre: sucursalActiva?.nombre || `Sucursal #${sucursalId}`,
            almacenNombre: almacenActualObj?.nombre || 'Todos los almacenes',
            filtros: { fechaInicio, fechaFin },
            reportes,
        });
        descargarArchivo(
            csv,
            `reporte-apexgym-sucursal-${sucursalId}-${fechaInicio}_a_${fechaFin}.csv`,
            'text/csv;charset=utf-8;'
        );
        notifications.show({
            title: 'Reporte exportado',
            message: 'Se descargó el archivo CSV con los datos actuales.',
            color: 'green',
            icon: <IconCheck size={16} />,
        });
    };

    const exportarJson = () => {
        const payload = {
            generadoEl: new Date().toISOString(),
            sucursal: {
                id: sucursalId,
                nombre: sucursalActiva?.nombre || `Sucursal #${sucursalId}`,
            },
            filtros: {
                preset,
                fechaInicio,
                fechaFin,
                almacenId: almacenId ? Number(almacenId) : null,
                almacenNombre: almacenActualObj?.nombre || 'Todos los almacenes',
            },
            reportes,
        };
        descargarArchivo(
            JSON.stringify(payload, null, 2),
            `reporte-apexgym-sucursal-${sucursalId}-${fechaInicio}_a_${fechaFin}.json`,
            'application/json;charset=utf-8;'
        );
        notifications.show({
            title: 'Reporte exportado',
            message: 'Se descargó el archivo JSON con los datos actuales.',
            color: 'green',
            icon: <IconCheck size={16} />,
        });
    };

    const opcionesAlmacen = useMemo(() => [
        { value: '', label: 'Todos los almacenes' },
        ...almacenes.map((a) => ({
            value: String(a.id),
            label: a.esPrincipal ? `${a.nombre} (Principal)` : a.nombre,
        })),
    ], [almacenes]);

    return (
        <Stack className={classes.page} gap="md">
            <Paper className={classes.heroBar}>
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                    <Group gap="sm" align="center">
                        <ThemeIcon size={46} radius="md" color="orange" variant="filled">
                            <IconReportAnalytics size={26} stroke={1.8} />
                        </ThemeIcon>
                        <div>
                            <Text className={classes.heroEyebrow}>Inteligencia operativa</Text>
                            <Title order={2} className={classes.heroTitle}>
                                Dashboard y Reportes
                            </Title>
                            <Group gap="xs" mt={4} wrap="wrap">
                                <Badge
                                    variant="filled"
                                    color="orange"
                                    leftSection={<IconBuildingStore size={12} />}
                                    size="sm"
                                >
                                    {sucursalActiva?.nombre || `Sucursal #${sucursalId}`}
                                </Badge>
                                {almacenActualObj && (
                                    <Badge
                                        variant="light"
                                        color="yellow"
                                        leftSection={<IconBuildingWarehouse size={12} />}
                                        size="sm"
                                    >
                                        {almacenActualObj.nombre}
                                    </Badge>
                                )}
                                {desdeCacheOffline && (
                                    <Badge variant="light" color="cyan" size="sm">
                                        Datos locales (sin conexión)
                                    </Badge>
                                )}
                                {ultimaActualizacion && (
                                    <Text className={classes.heroSubtitle}>
                                        Actualizado: {ultimaActualizacion.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </Group>
                        </div>
                    </Group>

                    <Group gap="sm" wrap="wrap">
                        <Button
                            className={classes.actionBtn}
                            variant="white"
                            color="dark"
                            leftSection={<IconRefresh size={16} />}
                            loading={cargando}
                            disabled={rangoInvalido}
                            onClick={cargarReportes}
                        >
                            Actualizar
                        </Button>

                        <Menu shadow="md" width={220} position="bottom-end">
                            <Menu.Target>
                                <Button
                                    className={classes.actionBtn}
                                    color="orange"
                                    leftSection={<IconDownload size={16} />}
                                    rightSection={<IconChevronDown size={14} />}
                                    disabled={cargando}
                                >
                                    Exportar reporte
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Formato de descarga</Menu.Label>
                                <Menu.Item
                                    leftSection={<IconFileSpreadsheet size={16} color="#15803D" />}
                                    onClick={exportarCsv}
                                >
                                    Exportar CSV (.csv)
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconFileCode size={16} color="#1D4ED8" />}
                                    onClick={exportarJson}
                                >
                                    Exportar JSON (.json)
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </Paper>

            <Paper className={classes.filterPanel}>
                <Stack gap="sm">
                    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                        <div>
                            <Text size="xs" fw={700} c="#475569" mb={6} tt="uppercase">
                                Periodo del reporte
                            </Text>
                            <SegmentedControl
                                value={preset}
                                onChange={aplicarPreset}
                                color="orange"
                                data={[
                                    { value: 'hoy', label: 'Hoy' },
                                    { value: '7d', label: '7 días' },
                                    { value: '30d', label: '30 días' },
                                    { value: 'mes', label: 'Este mes' },
                                    { value: 'personalizado', label: 'Personalizado' },
                                ]}
                            />
                        </div>

                        <Group gap="sm" align="flex-end" wrap="wrap">
                            <TextInput
                                label="Fecha inicio"
                                type="date"
                                size="sm"
                                leftSection={<IconCalendar size={15} />}
                                value={fechaInicio}
                                onChange={(e) => {
                                    setPreset('personalizado');
                                    setFechaInicio(e.currentTarget.value);
                                }}
                            />
                            <TextInput
                                label="Fecha fin"
                                type="date"
                                size="sm"
                                leftSection={<IconCalendar size={15} />}
                                value={fechaFin}
                                onChange={(e) => {
                                    setPreset('personalizado');
                                    setFechaFin(e.currentTarget.value);
                                }}
                            />
                            <Select
                                label="Almacén (opcional)"
                                size="sm"
                                leftSection={<IconBuildingWarehouse size={15} />}
                                data={opcionesAlmacen}
                                value={almacenId}
                                onChange={(val) =>
                                    setAlmacenSeleccionado({ sucursalId, value: val ?? '' })
                                }
                                comboboxProps={{ withinPortal: true }}
                                style={{ minWidth: 210 }}
                            />
                        </Group>
                    </Group>

                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                        <SegmentedControl
                            size="xs"
                            color="indigo"
                            value={vistaReporte}
                            onChange={setVistaReporte}
                            data={[
                                { value: 'todos', label: 'Vista completa (3 reportes)' },
                                { value: 'ventas', label: '1. Ventas' },
                                { value: 'rendimiento', label: '2. Rendimiento' },
                                { value: 'top', label: '3. Top productos' },
                            ]}
                        />
                        <Text size="xs" c="#475569">
                            Mostrando del <strong>{formatearFechaCorta(fechaInicio)}</strong> al{' '}
                            <strong>{formatearFechaCorta(fechaFin)}</strong>
                        </Text>
                    </Group>

                    {rangoInvalido && (
                        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                            La fecha de inicio no puede ser posterior a la fecha de fin.
                        </Alert>
                    )}
                </Stack>
            </Paper>

            {error && (
                <Alert
                    color="red"
                    variant="light"
                    title="Error al cargar reportes"
                    icon={<IconAlertCircle size={18} />}
                >
                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                        <Text size="sm">{error}</Text>
                        <Button size="xs" variant="light" color="red" onClick={cargarReportes}>
                            Reintentar
                        </Button>
                    </Group>
                </Alert>
            )}

            {cargando ? (
                <Paper className={classes.panelCard} py="xl">
                    <Group justify="center" gap="sm">
                        <Loader color="orange" size="md" />
                        <Text fw={600} c="#1B1F3A">
                            Calculando métricas de {sucursalActiva?.nombre || 'la sucursal'}…
                        </Text>
                    </Group>
                </Paper>
            ) : (
                <Stack gap="xl">
                    {(vistaReporte === 'todos' || vistaReporte === 'ventas') && (
                        <SeccionVentas reporte={reportes.ventas} />
                    )}
                    {(vistaReporte === 'todos' || vistaReporte === 'rendimiento') && (
                        <SeccionRendimiento reporte={reportes.rendimiento} />
                    )}
                    {(vistaReporte === 'todos' || vistaReporte === 'top') && (
                        <SeccionTopProductos reporte={reportes.topProductos} />
                    )}
                </Stack>
            )}
        </Stack>
    );
}

export default DashboardReportes;
