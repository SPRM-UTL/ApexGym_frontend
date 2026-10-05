/**
 * Genera y descarga / imprime el reporte oficial de Corte de Caja en PDF.
 * @param {object} corte - Datos del corte de caja
 * @param {Array} movimientos - Lista de movimientos de la caja
 * @param {object} [desglose] - Desglose de billetes (opcional)
 */
export function generarPdfCorte(corte, movimientos = [], desglose = null) {
    const ventana = window.open('', '_blank', 'width=850,height=950');
    if (!ventana) {
        alert('Por favor permite las ventanas emergentes para generar el PDF.');
        return;
    }

    const fechaHora = corte.fechaCorte
        ? new Date(corte.fechaCorte).toLocaleString('es-MX', {
              dateStyle: 'full',
              timeStyle: 'medium',
          })
        : new Date().toLocaleString('es-MX');

    const diferenciaNum = Number(corte.diferencia ?? 0);
    const difColor = diferenciaNum >= 0 ? '#2b8a3e' : '#c92a2a';
    const difTexto = diferenciaNum >= 0 ? `+$${diferenciaNum.toFixed(2)} (Sobrante / Cuadrado)` : `-$${Math.abs(diferenciaNum).toFixed(2)} (Faltante)`;

    const cajaNombre = corte.aperturaCaja?.caja?.nombre ?? corte.caja ?? 'Caja Principal';
    const empleadoNombre = corte.empleado
        ? `${corte.empleado.nombre} ${corte.empleado.apellidoPaterno ?? ''} ${corte.empleado.apellidoMaterno ?? ''}`.trim()
        : corte.empleadoNombre ?? 'Empleado';

    const estadoTexto = corte.estado === 'VALIDADO' ? 'VALIDADO / AUDITADO' : 'PENDIENTE DE VALIDACIÓN';
    const estadoColor = corte.estado === 'VALIDADO' ? '#2b8a3e' : '#e67700';

    const desgloseItems = desglose && typeof desglose === 'object' ? Object.entries(desglose) : [];

    const filasMovimientos = (movimientos ?? [])
        .map(
            (m, i) => `
        <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${i + 1}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">
                <span style="font-weight: 600; color: ${m.tipo === 'ENTRADA' ? '#2b8a3e' : '#c92a2a'};">
                    ${m.tipo}
                </span>
            </td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${m.concepto ?? '—'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">$${Number(m.monto ?? 0).toFixed(2)}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; color: #666;">
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
    <title>Corte de Caja #${corte.id ?? ''} - ApexGym</title>
    <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { margin: 0; padding: 24px; color: #1B1F3A; background: #fff; font-size: 13px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #FF6A00; padding-bottom: 12px; margin-bottom: 18px; }
        .logo-title h1 { margin: 0; font-size: 24px; font-weight: 800; color: #FF6A00; letter-spacing: 0.5px; }
        .logo-title p { margin: 3px 0 0 0; font-size: 11px; color: #666; }
        .badge-estado { display: inline-block; padding: 5px 12px; border-radius: 14px; font-weight: 700; font-size: 11px; text-transform: uppercase; background: ${corte.estado === 'VALIDADO' ? '#ebfbee' : '#fff9db'}; color: ${estadoColor}; border: 1px solid ${estadoColor}; }
        
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; background: #f8f9fa; padding: 12px 16px; border-radius: 8px; border: 1px solid #e9ecef; }
        .info-item { display: flex; flex-direction: column; }
        .info-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #868e96; margin-bottom: 2px; }
        .info-value { font-size: 13px; font-weight: 600; color: #212529; }
        
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1B1F3A; margin: 18px 0 8px 0; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
        
        .kpi-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
        .kpi-card { background: #fff; border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; text-align: center; }
        .kpi-card.highlight { background: #fff9f5; border-color: #FF6A00; }
        .kpi-label { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; }
        .kpi-value { font-size: 16px; font-weight: 800; color: #1B1F3A; margin-top: 4px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { background: #e8eaf0; color: #1B1F3A; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid #ced4da; }
        
        .firmas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 45px; text-align: center; }
        .linea-firma { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 11px; font-weight: 600; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #868e96; border-top: 1px dashed #ced4da; padding-top: 8px; }
        
        @media print {
            body { padding: 10px; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-title">
            <h1>APEX GYM</h1>
            <p>Control Financiero Operativo · Reporte Oficial de Arqueo y Corte de Caja</p>
        </div>
        <div style="text-align: right;">
            <div class="badge-estado">${estadoTexto}</div>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">Folio: <b>#CORTE-${corte.id ?? '—'}</b></p>
        </div>
    </div>

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
            <span class="info-label">ID Apertura Relacionada</span>
            <span class="info-value">#APERTURA-${corte.aperturaCajaId ?? '—'}</span>
        </div>
    </div>

    <div class="section-title">
        <span>Resumen Financiero del Turno</span>
    </div>

    <div class="kpi-cards">
        <div class="kpi-card">
            <div class="kpi-label">Fondo Inicial</div>
            <div class="kpi-value">$${Number(corte.aperturaCaja?.montoInicial ?? 0).toFixed(2)}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Entradas (+)</div>
            <div class="kpi-value" style="color: #2b8a3e;">+$${Number(corte.totalEntradas ?? 0).toFixed(2)}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Total Salidas (-)</div>
            <div class="kpi-value" style="color: #c92a2a;">-$${Number(corte.totalSalidas ?? 0).toFixed(2)}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Efectivo Teórico Esperado</div>
            <div class="kpi-value">$${(Number(corte.aperturaCaja?.montoInicial ?? 0) + Number(corte.totalEntradas ?? 0) - Number(corte.totalSalidas ?? 0)).toFixed(2)}</div>
        </div>
        <div class="kpi-card highlight">
            <div class="kpi-label">Efectivo Contado (Físico)</div>
            <div class="kpi-value" style="color: #FF6A00;">$${Number(corte.efectivoContado ?? 0).toFixed(2)}</div>
        </div>
        <div class="kpi-card" style="background: ${diferenciaNum >= 0 ? '#f4fbf5' : '#fff5f5'}; border-color: ${difColor};">
            <div class="kpi-label">Diferencia</div>
            <div class="kpi-value" style="color: ${difColor};">${difTexto}</div>
        </div>
    </div>

    ${
        corte.observaciones
            ? `<div style="background: #f8f9fa; border-left: 3px solid #FF6A00; padding: 8px 12px; margin-bottom: 16px; border-radius: 4px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #868e96;">Observaciones del Corte:</span>
                <p style="margin: 3px 0 0 0; font-size: 12px;">${corte.observaciones}</p>
            </div>`
            : ''
    }

    ${
        desgloseItems.length > 0
            ? `
        <div class="section-title">
            <span>Desglose de Billetes y Monedas (Conteo Físico)</span>
        </div>
        <table style="margin-bottom: 16px;">
            <thead>
                <tr>
                    <th style="text-align: left;">Denominación</th>
                    <th style="text-align: center;">Cantidad</th>
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
                                <td style="padding: 4px 8px; border-bottom: 1px solid #eee;">$${val >= 1 ? val.toLocaleString() : '0.50'}</td>
                                <td style="padding: 4px 8px; border-bottom: 1px solid #eee; text-align: center;">${cant}</td>
                                <td style="padding: 4px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">$${(val * cant).toFixed(2)}</td>
                            </tr>
                        `;
                    })
                    .join('')}
            </tbody>
        </table>
    `
            : ''
    }

    <div class="section-title">
        <span>Movimientos Operativos de Caja Realizados (${(movimientos ?? []).length})</span>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th style="text-align: left;">Tipo</th>
                <th style="text-align: left;">Concepto</th>
                <th style="text-align: right;">Monto</th>
                <th style="text-align: left;">Hora</th>
            </tr>
        </thead>
        <tbody>
            ${
                filasMovimientos ||
                '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #868e96;">No se registraron movimientos manuales durante este turno.</td></tr>'
            }
        </tbody>
    </table>

    <div class="firmas">
        <div>
            <div class="linea-firma">
                ${empleadoNombre}<br>
                <span style="font-weight: 400; color: #666;">Cajero en Turno</span>
            </div>
        </div>
        <div>
            <div class="linea-firma">
                Firma de Supervisor / Gerente<br>
                <span style="font-weight: 400; color: #666;">Auditoría y Validación</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Documento generado por ApexGym Nexus System · Impreso el ${new Date().toLocaleString('es-MX')}</p>
    </div>

    <script>
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
