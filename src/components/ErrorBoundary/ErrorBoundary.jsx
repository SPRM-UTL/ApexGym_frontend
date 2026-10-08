import React from 'react';
import { PaginaError } from '../../pages/Error/PaginaError.jsx';

/**
 * ErrorBoundary global de React para atrapar fallos no controlados
 * en el ciclo de renderizado y mostrar una pantalla de error adecuada.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Captura de excepción no controlada:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <PaginaError
                    codigo={500}
                    mensaje={this.state.error?.message || 'Ocurrió un error inesperado durante el procesamiento de la interfaz.'}
                    estaLogeadoEn={this.props.estaLogeadoEn ?? false}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
