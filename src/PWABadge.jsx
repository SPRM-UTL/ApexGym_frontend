import './PWABadge.css';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWABadge() {
  const periodoMs = 60 * 60 * 1000;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (periodoMs <= 0 || !registration) return;
      if (registration.active?.state === 'activated') {
        registrarSincronizacionPeriodica(periodoMs, swUrl, registration);
      } else if (registration.installing) {
        registration.installing.addEventListener('statechange', (event) => {
          const sw = event.target;
          if (sw?.state === 'activated') {
            registrarSincronizacionPeriodica(periodoMs, swUrl, registration);
          }
        });
      }
    },
  });

  const cerrar = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="PWABadge" role="status" aria-live="polite" aria-labelledby="pwa-toast-message">
      <div className="PWABadge-toast">
        <div className="PWABadge-message">
          <span id="pwa-toast-message">
            {needRefresh
              ? 'Hay una actualización de ApexGym disponible. Recarga para aplicar los cambios.'
              : 'ApexGym quedó lista para operar sin conexión.'}
          </span>
        </div>
        <div className="PWABadge-buttons">
          {needRefresh && (
            <button
              type="button"
              className="PWABadge-toast-button PWABadge-toast-button--primary"
              onClick={() => updateServiceWorker(true)}
            >
              Actualizar ahora
            </button>
          )}
          <button
            type="button"
            className="PWABadge-toast-button"
            onClick={cerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWABadge;

function registrarSincronizacionPeriodica(periodoMs, swUrl, registration) {
  if (periodoMs <= 0) return;

  setInterval(async () => {
    if ('onLine' in navigator && !navigator.onLine) return;

    try {
      const respuesta = await fetch(swUrl, {
        cache: 'no-store',
        headers: {
          cache: 'no-store',
          'cache-control': 'no-cache',
        },
      });
      if (respuesta?.status === 200) {
        await registration.update();
      }
    } catch {
      // Ignorar fallos de red temporales al consultar actualizaciones
    }
  }, periodoMs);
}
