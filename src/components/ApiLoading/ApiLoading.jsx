import { useSyncExternalStore } from 'react';
import PantallaCarga from '../PantallaCarga.jsx';
import { apiLoadingStore } from '../../scripts/apiLoading.js';

export function ApiLoading() {
    const cargando = useSyncExternalStore(
        apiLoadingStore.suscribirse,
        apiLoadingStore.obtenerEstado,
        apiLoadingStore.obtenerEstado
    );

    return cargando ? <PantallaCarga /> : null;
}

export default ApiLoading;
