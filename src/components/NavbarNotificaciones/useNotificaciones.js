import { useSyncExternalStore } from 'react';
import {
  obtenerSnapshotNotificaciones,
  suscribirStoreNotificaciones,
} from './notificacionesStore.js';

export function useNotificaciones() {
  return useSyncExternalStore(
    suscribirStoreNotificaciones,
    obtenerSnapshotNotificaciones,
    obtenerSnapshotNotificaciones
  );
}
