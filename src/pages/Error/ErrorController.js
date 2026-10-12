import {
    IconError404,
    IconShieldLock,
    IconServerOff,
    IconAlertTriangle,
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cambioNombreWeb } from '../../scripts/globales.js';

/**
 * Catálogo de configuraciones predeterminadas para códigos de error.
 */
export const TIPOS_ERROR = {
    404: {
        codigo: 404,
        titulo: 'Página no encontrada',
        subtitulo: 'La ruta que intentas consultar no existe, fue trasladada o eliminada del sistema.',
        color: 'apex',
        badge: '404 No Encontrado',
        icono: IconError404,
    },
    403: {
        codigo: 403,
        titulo: 'Acceso denegado',
        subtitulo: 'No cuentas con los permisos o privilegios necesarios para acceder a esta sección.',
        color: 'red',
        badge: '403 Prohibido',
        icono: IconShieldLock,
    },
    500: {
        codigo: 500,
        titulo: 'Error en el servidor',
        subtitulo: 'Se produjo un problema interno al procesar tu solicitud. Por favor intenta nuevamente más tarde.',
        color: 'red',
        badge: '500 Error de Servidor',
        icono: IconServerOff,
    },
    DEFAULT: {
        codigo: 'Error',
        titulo: 'Ocurrió un problema',
        subtitulo: 'Se presentó un inconveniente inesperado al cargar la vista solicitada.',
        color: 'orange',
        badge: 'Aviso del Sistema',
        icono: IconAlertTriangle,
    },
};

/**
 * Controlador de lógica de negocio y navegación para vistas de error.
 */
export class ErrorController {
    /**
     * Resuelve los datos del error según el código o mensaje suministrado.
     * @param {number|string} codigo 
     * @param {string|null} mensajePersonalizado 
     */
    static resolverConfiguracion(codigo, mensajePersonalizado = null) {
        const plantilla = TIPOS_ERROR[codigo] || TIPOS_ERROR.DEFAULT;
        return {
            ...plantilla,
            codigo: codigo ?? plantilla.codigo,
            subtitulo: mensajePersonalizado || plantilla.subtitulo,
        };
    }

    /**
     * Redirige al inicio o al login dependiendo del estado de autenticación.
     * @param {Function|null} navigate 
     * @param {boolean} estaLogeado 
     */
    static irInicio(navigate, estaLogeado = false) {
        const destino = estaLogeado ? '/' : '/login';
        if (typeof navigate === 'function') {
            navigate(destino, { replace: true });
        } else {
            window.location.href = destino;
        }
    }

    /**
     * Regresa a la página anterior si existe historial, o al fallback.
     * @param {Function|null} navigate 
     * @param {string} fallbackPath 
     */
    static volverAtras(navigate, fallbackPath = '/') {
        if (typeof navigate === 'function' && window.history.length > 1) {
            navigate(-1);
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            if (typeof navigate === 'function') {
                navigate(fallbackPath, { replace: true });
            } else {
                window.location.href = fallbackPath;
            }
        }
    }

    /**
     * Recarga el navegador web.
     */
    static recargarPagina() {
        window.location.reload();
    }
}

/**
 * Hook reactivo que conecta la vista con el ErrorController.
 * @param {object} props
 * @param {number|string} [props.codigo]
 * @param {string} [props.mensaje]
 * @param {boolean} [props.estaLogeadoEn]
 */
export function useErrorController({ codigo: codigoProp, mensaje: mensajeProp, estaLogeadoEn = false } = {}) {
    const navigate = useNavigate();
    const location = useLocation();

    // Obtener parámetros de props o del estado de navegación de react-router
    const estadoNavegacion = location?.state || {};
    const codigoFinal = codigoProp ?? estadoNavegacion.codigo ?? 404;
    const mensajeFinal = mensajeProp ?? estadoNavegacion.mensaje ?? null;

    const config = ErrorController.resolverConfiguracion(codigoFinal, mensajeFinal);

    // Ajusta el título en la pestaña del navegador
    cambioNombreWeb(`${config.badge} | ${config.titulo}`);

    return {
        config,
        irInicio: () => ErrorController.irInicio(navigate, estaLogeadoEn),
        volverAtras: () => ErrorController.volverAtras(navigate, estaLogeadoEn ? '/' : '/login'),
        recargarPagina: ErrorController.recargarPagina,
    };
}
