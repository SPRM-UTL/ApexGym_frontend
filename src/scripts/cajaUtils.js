/* ─── Denominaciones monetarias (Pesos Mexicanos) ─────────────────────────── */
export const DENOMINACIONES = [
    { valor: 1000, tipo: 'billete', label: '$1,000' },
    { valor: 500,  tipo: 'billete', label: '$500'   },
    { valor: 200,  tipo: 'billete', label: '$200'   },
    { valor: 100,  tipo: 'billete', label: '$100'   },
    { valor: 50,   tipo: 'billete', label: '$50'    },
    { valor: 20,   tipo: 'billete', label: '$20'    },
    { valor: 10,   tipo: 'moneda',  label: '$10'    },
    { valor: 5,    tipo: 'moneda',  label: '$5'     },
    { valor: 2,    tipo: 'moneda',  label: '$2'     },
    { valor: 1,    tipo: 'moneda',  label: '$1'     },
    { valor: 0.5,  tipo: 'moneda',  label: '$0.50'  },
];

/**
 * Distribuye automáticamente un monto en denominaciones para representar el fondo
 * o efectivo cuando no se capturó un desglose individual previo.
 */
export function desglosarMonto(montoTotal) {
    let restante = Number(montoTotal) || 0;
    const resultado = {};
    for (const d of DENOMINACIONES) {
        if (restante >= d.valor) {
            const cant = Math.floor(restante / d.valor);
            resultado[d.valor] = cant;
            restante = Math.round((restante - cant * d.valor) * 100) / 100;
        } else {
            resultado[d.valor] = 0;
        }
    }
    return resultado;
}

/**
 * Formatea fecha y hora para visualización en tablas y modales (es-MX).
 */
export function formatearFechaHora(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}
