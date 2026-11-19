import { pdf } from '@react-pdf/renderer';

export async function generarDocumentoPDF(documento) {
    if (!documento) {
        throw new Error('Se requiere un documento PDF para generarlo.');
    }

    return pdf(documento).toBlob();
}

export function descargarDocumentoPDF(documento, nombreArchivo = 'documento-apexgym.pdf') {
    const esBlob = documento instanceof Blob;
    if (!esBlob && (typeof documento !== 'string' || !documento)) {
        throw new Error('No se proporcionó un documento PDF para descargar.');
    }

    const urlDocumento = esBlob ? URL.createObjectURL(documento) : documento;
    const enlace = document.createElement('a');
    enlace.href = urlDocumento;
    enlace.download = normalizarNombreArchivoPDF(nombreArchivo);
    document.body.appendChild(enlace);
    try {
        enlace.click();
    } finally {
        enlace.remove();
        if (esBlob) window.setTimeout(() => URL.revokeObjectURL(urlDocumento), 1000);
    }
}

function normalizarNombreArchivoPDF(nombreArchivo) {
    const nombre = String(nombreArchivo || 'documento-apexgym.pdf')
        .replace(/[<>:"/\\|?*]/g, '-')
        .trim();

    return /\.pdf$/i.test(nombre) ? nombre : `${nombre || 'documento-apexgym'}.pdf`;
}
