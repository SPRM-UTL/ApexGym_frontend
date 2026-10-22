/**
 * Issue: [CAJA-06] Frontend: Diseno y generacion del reporte oficial de Corte de Caja en PDF #91
 * Parent: Control Operativo de Caja, Auditoria Contable y Reporte de Corte en PDF #85
 *
 * Tareas:
 * - Refactorizar src/scripts/generarPdfCorte.js con el diseno oficial institucional de ApexGym.
 * - Incluir tabla detallada de todos los movimientos de caja registrados en el turno.
 * - Incluir tabla con el arqueo fisico de billetes y monedas.
 * - Incluir resumen financiero de totales, diferencias y seccion para firmas de recepcion y gerencia.
 * - Soportar logotipo oficial del sistema y visibilidad configurable de huella digital/auditoría.
 * - Marca de agua obligatoria "REIMPRESIÓN" y badges dinámicos cuando se trate de una reimpresión/copia.
 * 
 * @param {object} corte - Datos del corte de caja
 * @param {Array} movimientos - Lista de movimientos de la caja
 * @param {object} [desglose] - Desglose de billetes (opcional)
 * @param {Array|object} [configuraciones] - Configuraciones del sistema para personalizar el reporte
 * @param {object} [opciones] - Opciones adicionales (ej. forzar reimpresión)
 */
export function generarPdfCorte(corte, movimientos = [], desglose = null, configuraciones = [], opciones = {}) {
    const ventana = window.open('', '_blank', 'width=950,height=1000');
    if (!ventana) {
        alert('Por favor permite las ventanas emergentes en tu navegador para generar el comprobante PDF.');
        return;
    }

    // ── Mapeo de Configuraciones del Sistema ─────────────────────────────────
    const configMap = Array.isArray(configuraciones)
        ? Object.fromEntries(configuraciones.map((c) => [c.clave, c.valor]))
        : (configuraciones || {});

    // Configuración para mostrar u ocultar la sección de huella digital y auditoría
    const configHuella = configMap['mostrar_huella_digital_corte'] ?? configMap['mostrar_auditoria_digital'];
    const mostrarHuella = configHuella !== undefined ? String(configHuella).toLowerCase() === 'true' : true;

    // Configuración para el logo del sistema
    const logoConfig = configMap['logo_sistema'] ?? configMap['imagen_sistema'] ?? configMap['logo'] ?? '/favicon.svg';
    let logoUrl = logoConfig;
    if (logoUrl && !logoUrl.startsWith('http://') && !logoUrl.startsWith('https://') && !logoUrl.startsWith('data:')) {
        const origin = window.location.origin || '';
        logoUrl = `${origin}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
    }

    // ── Conteo de impresiones y control de ORIGINAL vs REIMPRESIÓN ───────────
    const storageKey = `corte_impresiones_${corte?.id ?? 0}`;
    const vecesImpreso = Number(localStorage.getItem(storageKey) || 0);
    const esOriginal = opciones.esReimpresion !== undefined 
        ? !opciones.esReimpresion 
        : (vecesImpreso === 0);

    const numeroCopia = vecesImpreso === 0 ? 1 : vecesImpreso;

    // ── Generación de Huella Digital de Seguridad ────────────────────────────
    const seed = `${corte?.id || 0}-${corte?.fechaCorte || ''}-${corte?.efectivoContado || 0}-${corte?.diferencia || 0}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const hashHex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    const huellaDigital = `APX-${String(corte?.id || 0).padStart(4, '0')}-${hashHex}`;

    const fechaHora = corte?.fechaCorte
        ? new Date(corte.fechaCorte).toLocaleString('es-MX', {
              dateStyle: 'full',
              timeStyle: 'medium',
          })
        : new Date().toLocaleString('es-MX');

    const montoInicial = Number(corte?.aperturaCaja?.montoInicial ?? 0);
    const totalEntradas = Number(corte?.totalEntradas ?? 0);
    const totalSalidas = Number(corte?.totalSalidas ?? 0);
    const totalVentasEfectivo = Number(corte?.totalVentasEfectivo ?? 0);
    const efectivoEsperado = montoInicial + totalEntradas - totalSalidas + totalVentasEfectivo;
    const efectivoContado = Number(corte?.efectivoContado ?? 0);
    const diferenciaNum = Number(corte?.diferencia ?? (efectivoContado - efectivoEsperado));

    const difColor = diferenciaNum >= 0 ? '#2b8a3e' : '#c92a2a';
    const difTexto = diferenciaNum >= 0 ? `+$${diferenciaNum.toFixed(2)} (Sobrante)` : `-$${Math.abs(diferenciaNum).toFixed(2)} (Faltante)`;

    const cajaNombre = corte?.aperturaCaja?.caja?.nombre ?? corte?.caja ?? 'Caja Principal';
    const empleadoNombre = corte?.empleado
        ? `${corte.empleado.nombre} ${corte.empleado.apellidoPaterno ?? ''} ${corte.empleado.apellidoMaterno ?? ''}`.trim()
        : corte?.empleadoNombre ?? 'Empleado';

    const aperturaId = corte?.aperturaCajaId ?? corte?.aperturaCaja?.id ?? '—';
    const estadoTexto = corte?.estado === 'VALIDADO' ? 'VALIDADO / AUDITADO' : 'PENDIENTE DE VALIDACIÓN';
    const estadoColor = corte?.estado === 'VALIDADO' ? '#2b8a3e' : '#e67700';

    const desgloseItems = desglose && typeof desglose === 'object' ? Object.entries(desglose) : [];

    const totalMovs = (movimientos ?? []).length;
    const sumEntradas = (movimientos ?? []).filter(m => m.tipo === 'ENTRADA').reduce((acc, m) => acc + Number(m.monto || 0), 0);
    const sumSalidas = (movimientos ?? []).filter(m => m.tipo === 'SALIDA').reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const filasMovimientos = (movimientos ?? [])
        .map(
            (m, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#fcfcfd'};">
            <td style="padding: 7px 10px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: 600; color: #495057;">${i + 1}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e9ecef;">
                <span class="badge-tipo ${m.tipo === 'ENTRADA' ? 'tipo-entrada' : 'tipo-salida'}">
                    ${m.tipo}
                </span>
            </td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e9ecef; word-break: break-word;">
                <div style="font-weight: 600; color: #212529;">${m.concepto ?? '—'}</div>
                ${m.observaciones ? `<div style="font-size: 11px; color: #868e96; margin-top: 2px;">${m.observaciones}</div>` : ''}
            </td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 700; color: ${m.tipo === 'ENTRADA' ? '#2b8a3e' : '#c92a2a'};">
                ${m.tipo === 'ENTRADA' ? '+' : '-'}$${Number(m.monto ?? 0).toFixed(2)}
            </td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e9ecef; font-size: 11px; color: #666; text-align: center;">
                ${m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>
        </tr>
    `
        )
        .join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Corte de Caja #${corte?.id ?? ''} - ApexGym</title>
    <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { margin: 0; padding: 28px; color: #1B1F3A; background: #fff; font-size: 12px; line-height: 1.45; position: relative; }
        
        /* ── Barra de Herramientas Superior (Solo visible en pantalla) ── */
        .toolbar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1B1F3A;
            color: #ffffff;
            padding: 10px 18px;
            border-radius: 8px;
            margin-bottom: 22px;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
        }
        .btn-action {
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid #ced4da;
            background: #ffffff;
            color: #1B1F3A;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-action.primary {
            background: #FF6A00;
            border-color: #FF6A00;
            color: #ffffff;
        }
        .btn-action:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        /* ── Marca de agua de REIMPRESIÓN (Obligatoria para reimpresiones) ── */
        .watermark-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        }
        .watermark-reimpresion {
            transform: rotate(-32deg);
            font-size: 88px;
            font-weight: 900;
            color: rgba(220, 53, 69, 0.13);
            border: 8px solid rgba(220, 53, 69, 0.18);
            padding: 16px 48px;
            border-radius: 16px;
            letter-spacing: 16px;
            text-transform: uppercase;
            user-select: none;
            white-space: nowrap;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        /* Control estricto de visibilidad según el modo */
        body.modo-original .watermark-container,
        body.modo-original .watermark-reimpresion {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
        body.modo-reimpresion .watermark-container {
            display: flex !important;
        }
        body.modo-reimpresion .watermark-reimpresion {
            display: block !important;
        }

        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FF6A00; padding-bottom: 12px; margin-bottom: 14px; position: relative; z-index: 1; }
        .logo-title h1 { margin: 0; font-size: 26px; font-weight: 900; color: #FF6A00; letter-spacing: 0.5px; }
        .logo-title p { margin: 3px 0 0 0; font-size: 11px; color: #666; font-weight: 500; }
        
        .header-badges { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .badge-doc { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-doc.original { background: #e7f5ff; color: #1971c2; border: 1px solid #74c0fc; }
        .badge-doc.reimpresion { background: #fff5f5; color: #c92a2a; border: 1px solid #fa5252; }
        .badge-estado { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; background: ${corte?.estado === 'VALIDADO' ? '#ebfbee' : '#fff9db'}; color: ${estadoColor}; border: 1px solid ${estadoColor}; }
        
        .huella-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 6px 12px; font-size: 10px; color: #495057; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; position: relative; z-index: 1; }
        .huella-code { font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #1B1F3A; }

        /* Grid de información general */
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; background: #f8f9fa; padding: 10px 14px; border-radius: 6px; border: 1px solid #e9ecef; position: relative; z-index: 1; }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #868e96; margin-bottom: 2px; }
        .info-value { font-size: 12px; font-weight: 600; color: #212529; }
        
        .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1B1F3A; margin: 16px 0 8px 0; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.5px; position: relative; z-index: 1; }
        
        /* ── Resumen Financiero en UNA SOLA FILA compacta ── */
        .resumen-fila { display: grid; grid-template-columns: repeat(${totalVentasEfectivo > 0 ? 7 : 6}, 1fr); gap: 6px; margin-bottom: 14px; position: relative; z-index: 1; }
        .kpi-compact { background: #fff; border: 1px solid #dee2e6; border-radius: 6px; padding: 7px 6px; text-align: center; }
        .kpi-compact.highlight { background: #fff9f5; border-color: #FF6A00; }
        .kpi-compact.diff { background: ${diferenciaNum >= 0 ? '#f4fbf5' : '#fff5f5'}; border-color: ${difColor}; }
        .kpi-compact-label { font-size: 9px; font-weight: 700; color: #6c757d; text-transform: uppercase; display: block; margin-bottom: 3px; }
        .kpi-compact-value { font-size: 13px; font-weight: 800; color: #1B1F3A; display: block; }
        
        /* Tablas */
        table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 14px; position: relative; z-index: 1; }
        th { background: #e8eaf0; color: #1B1F3A; font-weight: 700; font-size: 10px; text-transform: uppercase; padding: 7px 10px; border-bottom: 2px solid #ced4da; letter-spacing: 0.4px; }
        tfoot td { background: #f8f9fa; font-weight: 700; border-top: 2px solid #ced4da; padding: 7px 10px; }
        
        .badge-tipo { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .tipo-entrada { background: #ebfbee; color: #2b8a3e; border: 1px solid #b2f2bb; }
        .tipo-salida { background: #fff5f5; color: #c92a2a; border: 1px solid #ffc9c9; }

        .firmas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 50px; margin-top: 35px; text-align: center; position: relative; z-index: 1; }
        .linea-firma { border-top: 1px solid #333; margin-top: 36px; padding-top: 6px; font-size: 11px; font-weight: 600; }
        
        .footer { margin-top: 25px; text-align: center; font-size: 10px; color: #868e96; border-top: 1px dashed #ced4da; padding-top: 8px; position: relative; z-index: 1; }
        
        @media print {
            body { padding: 10px; }
            .toolbar-header { display: none !important; }
            .no-print { display: none !important; }
            
            /* En modo original: NUNCA imprimir la marca de agua */
            body.modo-original .watermark-container,
            body.modo-original .watermark-reimpresion {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            /* En modo reimpresión: imprimir la marca de agua */
            body.modo-reimpresion .watermark-container {
                display: flex !important;
            }
            body.modo-reimpresion .watermark-reimpresion {
                display: block !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body class="${esOriginal ? 'modo-original' : 'modo-reimpresion'}">
    <!-- Barra de acciones interactiva para pantalla (No se imprime) -->
    <div class="no-print toolbar-header">
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 700; font-size: 11px; color: rgba(255, 255, 255, 0.85);">Estado de Emisión:</span>
            <span class="badge-doc ${esOriginal ? 'original' : 'reimpresion'}" id="toolbarStatusBadge">
                ${esOriginal ? 'ORIGINAL' : `REIMPRESIÓN (COPIA #${numeroCopia})`}
            </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn-action" onclick="toggleModoImpresion()" id="btnToggleModo">
                ${esOriginal ? '⚠️ Ver vista con Marca de Agua (Reimpresión)' : '📄 Ver vista Original (Sin Marca de Agua)'}
            </button>
            <button type="button" class="btn-action primary" onclick="window.print()">
                🖨️ Imprimir / Guardar PDF
            </button>
        </div>
    </div>

    <!-- Contenedor de Marca de Agua Oficial -->
    <div class="watermark-container" id="watermarkContainer">
        <div class="watermark-reimpresion">REIMPRESIÓN</div>
    </div>

    <div class="header">
        <div style="display: flex; align-items: center; gap: 14px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo ApexGym" style="height: 52px; width: auto; max-width: 90px; object-fit: contain;" onerror="this.style.display='none'" />` : ''}
            <div class="logo-title">
                <h1>APEX GYM</h1>
                <p>Control Financiero Operativo · Reporte Oficial de Arqueo y Corte de Turno</p>
            </div>
        </div>
        <div class="header-badges">
            <span class="badge-doc ${esOriginal ? 'original' : 'reimpresion'}" id="badgeDoc">
                ${esOriginal ? 'ORIGINAL' : `REIMPRESIÓN · COPIA #${numeroCopia}`}
            </span>
            <div class="badge-estado">${estadoTexto}</div>
            <span style="font-size: 11px; font-weight: 700; color: #495057;">Folio: #CORTE-${corte?.id ?? '—'}</span>
        </div>
    </div>

    <!-- Huella digital de seguridad condicional según configuración del sistema -->
    ${mostrarHuella ? `
    <div class="huella-box">
        <span><b>Seguridad y Auditoría Digital:</b> Huella <span class="huella-code">${huellaDigital}</span></span>
        <span id="huellaEstadoDoc">${esOriginal ? '● <b>DOCUMENTO ORIGINAL OFICIAL</b>' : `▲ <b>DOCUMENTO EN REIMPRESIÓN (COPIA #${numeroCopia})</b>`}</span>
    </div>
    ` : ''}

    <!-- Información General -->
    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">Caja Asignada</span>
            <span class="info-value">${cajaNombre}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Cajero Responsable</span>
            <span class="info-value">${empleadoNombre}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Fecha y Hora de Cierre</span>
            <span class="info-value">${fechaHora}</span>
        </div>
        <div class="info-item">
            <span class="info-label"># Apertura Relacionada</span>
            <span class="info-value">#${aperturaId}</span>
        </div>
    </div>

    <!-- ── 1 SOLA FILA COMPACTA DE RESUMEN FINANCIERO ── -->
    <div class="section-title">
        <span>Resumen Financiero del Turno</span>
        <span style="font-size: 9px; font-weight: 600; color: #868e96;">Cálculo Oficial Automatizado</span>
    </div>

    <div class="resumen-fila">
        <div class="kpi-compact">
            <span class="kpi-compact-label">Fondo Inicial</span>
            <span class="kpi-compact-value">$${montoInicial.toFixed(2)}</span>
        </div>
        <div class="kpi-compact">
            <span class="kpi-compact-label">Entradas (+)</span>
            <span class="kpi-compact-value" style="color: #2b8a3e;">+$${totalEntradas.toFixed(2)}</span>
        </div>
        <div class="kpi-compact">
            <span class="kpi-compact-label">Salidas (-)</span>
            <span class="kpi-compact-value" style="color: #c92a2a;">-$${totalSalidas.toFixed(2)}</span>
        </div>
        ${
            totalVentasEfectivo > 0
                ? `<div class="kpi-compact">
            <span class="kpi-compact-label">Ventas Ef. (+)</span>
            <span class="kpi-compact-value" style="color: #2b8a3e;">+$${totalVentasEfectivo.toFixed(2)}</span>
        </div>`
                : ''
        }
        <div class="kpi-compact">
            <span class="kpi-compact-label">Ef. Teórico</span>
            <span class="kpi-compact-value">$${efectivoEsperado.toFixed(2)}</span>
        </div>
        <div class="kpi-compact highlight">
            <span class="kpi-compact-label" style="color: #FF6A00;">Ef. Contado</span>
            <span class="kpi-compact-value" style="color: #FF6A00;">$${efectivoContado.toFixed(2)}</span>
        </div>
        <div class="kpi-compact diff">
            <span class="kpi-compact-label" style="color: ${difColor};">Diferencia</span>
            <span class="kpi-compact-value" style="color: ${difColor};">${difTexto}</span>
        </div>
    </div>

    ${
        corte?.observaciones
            ? `<div style="background: #fff9f5; border-left: 3px solid #FF6A00; padding: 7px 12px; margin-bottom: 12px; border-radius: 4px;">
                <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #FF6A00;">Observaciones del Corte:</span>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #212529;">${corte.observaciones}</p>
            </div>`
            : ''
    }

    ${
        desgloseItems.length > 0
            ? `
        <div class="section-title">
            <span>Arqueo de Efectivo Físico por Denominación</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">Denominación</th>
                    <th style="text-align: center;">Cantidad Contada</th>
                    <th style="text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${desgloseItems
                    .map(([denom, qty]) => {
                        const val = Number(denom);
                        const cant = Number(qty);
                        if (!cant) return '';
                        return `
                            <tr>
                                <td style="padding: 5px 10px; border-bottom: 1px solid #e9ecef; font-weight: 600;">$${val >= 1 ? val.toLocaleString() : '0.50'}</td>
                                <td style="padding: 5px 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${cant}</td>
                                <td style="padding: 5px 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 700;">$${(val * cant).toFixed(2)}</td>
                            </tr>
                        `;
                    })
                    .join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="text-align: right;">TOTAL ARQUEO FÍSICO:</td>
                    <td style="text-align: right; color: #FF6A00;">$${efectivoContado.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
    `
            : ''
    }

    <!-- ── Tabla de Movimientos del Turno ── -->
    <div class="section-title">
        <span>Movimientos Operativos Registrados en el Turno (${totalMovs})</span>
        <span style="font-size: 9px; font-weight: 600; color: #868e96;">Entradas: +$${sumEntradas.toFixed(2)} · Salidas: -$${sumSalidas.toFixed(2)}</span>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 110px; text-align: left;">Tipo</th>
                <th style="text-align: left;">Concepto y Detalles</th>
                <th style="width: 120px; text-align: right;">Monto</th>
                <th style="width: 90px; text-align: center;">Hora</th>
            </tr>
        </thead>
        <tbody>
            ${
                filasMovimientos ||
                '<tr><td colspan="5" style="text-align: center; padding: 14px; color: #868e96; font-style: italic;">No se registraron movimientos manuales de caja en este turno.</td></tr>'
            }
        </tbody>
        ${totalMovs > 0 ? `
        <tfoot>
            <tr>
                <td colspan="3" style="text-align: right;">TOTALES DEL TURNO:</td>
                <td style="text-align: right; font-size: 11px;">
                    <span style="color: #2b8a3e;">+$${sumEntradas.toFixed(2)}</span> / 
                    <span style="color: #c92a2a;">-$${sumSalidas.toFixed(2)}</span>
                </td>
                <td></td>
            </tr>
        </tfoot>` : ''}
    </table>

    <div class="firmas">
        <div>
            <div class="linea-firma">
                ${empleadoNombre}<br>
                <span style="font-weight: 400; color: #666; font-size: 10px;">Cajero Responsable</span>
            </div>
        </div>
        <div>
            <div class="linea-firma">
                Firma de Supervisor / Gerente<br>
                <span style="font-weight: 400; color: #666; font-size: 10px;">Auditoría y Validación Oficial</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Documento oficial emitido por ApexGym Nexus System${mostrarHuella ? ` · Huella de Auditoría: ${huellaDigital}` : ''} · Fecha: ${new Date().toLocaleString('es-MX')}</p>
    </div>

    <script>
        var storageKey = '${storageKey}';
        var numeroCopia = ${numeroCopia};

        function toggleModoImpresion() {
            var body = document.body;
            var badgeDoc = document.getElementById('badgeDoc');
            var toolbarBadge = document.getElementById('toolbarStatusBadge');
            var btnToggle = document.getElementById('btnToggleModo');
            var huellaDoc = document.getElementById('huellaEstadoDoc');

            var esModoOriginal = body.classList.contains('modo-original');
            if (esModoOriginal) {
                // Cambiar a REIMPRESIÓN
                body.classList.remove('modo-original');
                body.classList.add('modo-reimpresion');
                if (badgeDoc) {
                    badgeDoc.className = 'badge-doc reimpresion';
                    badgeDoc.innerText = 'REIMPRESIÓN · COPIA #' + (numeroCopia || 1);
                }
                if (toolbarBadge) {
                    toolbarBadge.className = 'badge-doc reimpresion';
                    toolbarBadge.innerText = 'REIMPRESIÓN (COPIA #' + (numeroCopia || 1) + ')';
                }
                if (btnToggle) {
                    btnToggle.innerText = '📄 Ver vista Original (Sin Marca de Agua)';
                }
                if (huellaDoc) {
                    huellaDoc.innerHTML = '▲ <b>DOCUMENTO EN REIMPRESIÓN (COPIA #' + (numeroCopia || 1) + ')</b>';
                }
            } else {
                // Cambiar a ORIGINAL
                body.classList.remove('modo-reimpresion');
                body.classList.add('modo-original');
                if (badgeDoc) {
                    badgeDoc.className = 'badge-doc original';
                    badgeDoc.innerText = 'ORIGINAL';
                }
                if (toolbarBadge) {
                    toolbarBadge.className = 'badge-doc original';
                    toolbarBadge.innerText = 'ORIGINAL';
                }
                if (btnToggle) {
                    btnToggle.innerText = '⚠️ Ver vista con Marca de Agua (Reimpresión)';
                }
                if (huellaDoc) {
                    huellaDoc.innerHTML = '● <b>DOCUMENTO ORIGINAL OFICIAL</b>';
                }
            }
        }

        window.onafterprint = function() {
            try {
                var actual = Number(localStorage.getItem(storageKey) || 0);
                localStorage.setItem(storageKey, String(actual + 1));
            } catch (e) {}
        };

        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>
    `;

    ventana.document.write(html);
    ventana.document.close();
}
