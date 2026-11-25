import { ResponseModel } from './models/ResponseModel.js';
import { httpClient } from './httpClient.js';

export class NotificacionService {
  constructor(urlBase) {
    this.urlBase = urlBase;
    this.urlApi = `${urlBase}/api/notificaciones`;
    this.urlDispositivos = `${urlBase}/api/dispositivos`;
  }

  async ejecutar(peticion, mensajeFallback) {
    try {
      const response = await peticion();
      return response.data;
    } catch (error) {
      const respuestaError = error?.response?.data || null;
      throw new ResponseModel(
        respuestaError,
        1,
        respuestaError?.message || error?.message || mensajeFallback,
        error?.response?.status || 500
      );
    }
  }

  obtenerTodas({ estado, tipo } = {}) {
    const params = {};
    if (estado) params.estado = estado;
    if (tipo) params.tipo = tipo;

    return this.ejecutar(
      () => httpClient.get(`${this.urlApi}/`, { params }),
      'Error al obtener las notificaciones'
    );
  }

  contarNoLeidas() {
    return this.ejecutar(
      () => httpClient.get(`${this.urlApi}/no-leidas/count`),
      'Error al consultar el contador de notificaciones'
    );
  }

  marcarLeida(id) {
    return this.ejecutar(
      () => httpClient.patch(`${this.urlApi}/${id}/leida`),
      'Error al marcar la notificación como leída'
    );
  }

  marcarIgnorada(id) {
    return this.ejecutar(
      () => httpClient.patch(`${this.urlApi}/${id}/ignorada`),
      'Error al ignorar la notificación'
    );
  }

  marcarTodasLeidas() {
    return this.ejecutar(
      () => httpClient.patch(`${this.urlApi}/leer-todas`),
      'Error al marcar todas las notificaciones como leídas'
    );
  }

  registrarDispositivoWeb(token) {
    return this.ejecutar(
      () => httpClient.post(`${this.urlDispositivos}/token`, {
        token,
        plataforma: 'WEB',
      }),
      'Error al registrar dispositivo web para notificaciones'
    );
  }

  suscribirStream({ onNotificacion, onEstado, onError } = {}) {
    if (typeof EventSource === 'undefined') {
      return () => {};
    }

    const source = new EventSource(`${this.urlApi}/stream`, { withCredentials: true });

    const procesarEvento = (event) => {
      if (!event?.data) return;
      try {
        const payload = JSON.parse(event.data);
        if (payload && typeof payload === 'object') {
          onNotificacion?.(payload);
        }
      } catch {
        // Ignorar eventos keepalive no JSON
      }
    };

    source.onopen = () => {
      onEstado?.('conectado');
    };

    source.addEventListener('conectado', () => {
      onEstado?.('conectado');
    });

    source.onmessage = procesarEvento;
    source.addEventListener('notificacion', procesarEvento);
    source.addEventListener('nueva_notificacion', procesarEvento);
    source.addEventListener('actividad_empleado', procesarEvento);

    source.onerror = (err) => {
      onEstado?.('error');
      onError?.(err);
    };

    return () => {
      try {
        source.close();
      } catch {
        // Ignorar errores al cerrar EventSource
      }
    };
  }
}

export default NotificacionService;
