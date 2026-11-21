import { notifications } from '@mantine/notifications';
import { obtenerUsuarioActual } from '../../scripts/constantes.js';
import { api } from '../../scripts/services/api.js';

const STORAGE_PUSH_ENABLED = 'apexgym_web_push_enabled';
const STORAGE_PUSH_TOKEN = 'apexgym_web_push_token';
const POLLING_INTERVAL_MS = 30_000;

const listeners = new Set();
const idsNotificados = new Set();
let cargaInicialCompletada = false;
let activos = 0;
let unsubscribeStream = null;
let pollingTimer = null;
let eventosDomRegistrados = false;

let state = {
  notificaciones: [],
  noLeidasCount: 0,
  cargando: false,
  actualizando: false,
  error: null,
  filtro: 'TODAS', // 'TODAS' | 'NO_LEIDAS' | 'ACTIVIDAD_ANDROID'
  streamEstado: 'desconectado', // 'conectado' | 'error' | 'desconectado'
  pushHabilitado: leerPreferenciaPush(),
  pushPermiso: leerPermisoNotification(),
  registrandoPush: false,
};

function leerPreferenciaPush() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(STORAGE_PUSH_ENABLED) === 'true'
      && leerPermisoNotification() === 'granted';
  } catch {
    return false;
  }
}

function leerPermisoNotification() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function obtenerOTokenWeb() {
  try {
    const existente = localStorage.getItem(STORAGE_PUSH_TOKEN);
    if (existente) return existente;
    const nuevo = typeof globalThis.crypto?.randomUUID === 'function'
      ? `web-${globalThis.crypto.randomUUID()}`
      : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_PUSH_TOKEN, nuevo);
    return nuevo;
  } catch {
    return `web-${Date.now()}`;
  }
}

function emitirCambio() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(parcial) {
  state = { ...state, ...parcial };
  emitirCambio();
}

async function mostrarPushNavegador(notificacion) {
  if (!state.pushHabilitado || leerPermisoNotification() !== 'granted') return;
  const clave = notificacion?.id ? `id:${notificacion.id}` : `msg:${notificacion?.titulo}:${notificacion?.createdAt}`;
  if (idsNotificados.has(clave)) return;
  idsNotificados.add(clave);

  const titulo = notificacion?.titulo || 'ApexGym';
  const opciones = {
    body: notificacion?.mensaje || 'Tienes una nueva notificación operativa.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: notificacion?.id ? `apexgym-notif-${notificacion.id}` : 'apexgym-notif',
    data: notificacion,
  };

  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.showNotification) {
        await reg.showNotification(titulo, opciones);
        return;
      }
    }
    if (typeof Notification !== 'undefined') {
      new Notification(titulo, opciones);
    }
  } catch {
    // Fallback silencioso si el navegador bloquea notificaciones en segundo plano
  }
}

function extraerListaNotificaciones(respuesta) {
  if (Array.isArray(respuesta?.data)) return respuesta.data;
  if (Array.isArray(respuesta?.data?.registros)) return respuesta.data.registros;
  if (Array.isArray(respuesta)) return respuesta;
  return [];
}

function normalizarNotificacion(item) {
  if (!item || typeof item !== 'object') return null;
  const base = item.notificacion && typeof item.notificacion === 'object' ? item.notificacion : item;
  if (!base.titulo && !base.mensaje && !base.id) return null;
  return {
    ...base,
    estado: String(base.estado || 'PENDIENTE').toUpperCase(),
    tipo: String(base.tipo || 'GENERAL').toUpperCase(),
  };
}

export async function refrescarNotificaciones({ silencioso = false } = {}) {
  if (!obtenerUsuarioActual()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  if (!silencioso) {
    setState({ cargando: state.notificaciones.length === 0, actualizando: true, error: null });
  }

  try {
    const [resLista, resCount] = await Promise.all([
      api.notificacion.obtenerTodas(),
      api.notificacion.contarNoLeidas().catch(() => null),
    ]);

    if (resLista?.responseFlag !== undefined && resLista.responseFlag !== 0) {
      throw new Error(resLista.message || 'No se pudieron obtener las notificaciones');
    }

    const lista = extraerListaNotificaciones(resLista)
      .map(normalizarNotificacion)
      .filter(Boolean);

    const pendientes = lista.filter((n) => n.estado === 'PENDIENTE');
    const countApi = Number(resCount?.data?.count);
    const noLeidasCount = Number.isFinite(countApi) ? countApi : pendientes.length;

    if (!cargaInicialCompletada) {
      for (const n of lista) {
        if (n.id) idsNotificados.add(`id:${n.id}`);
      }
      cargaInicialCompletada = true;
    } else {
      for (const n of pendientes) {
        if (n.id && !idsNotificados.has(`id:${n.id}`)) {
          mostrarPushNavegador(n);
        }
      }
    }

    setState({
      notificaciones: lista,
      noLeidasCount,
      cargando: false,
      actualizando: false,
      error: null,
    });
  } catch (error) {
    if (error?.statusCode === 403) {
      setState({
        notificaciones: [],
        noLeidasCount: 0,
        cargando: false,
        actualizando: false,
        error: null,
      });
      return;
    }

    setState({
      cargando: false,
      actualizando: false,
      error: silencioso ? state.error : (error?.message || 'No se pudieron cargar las notificaciones'),
    });
  }
}

function conectarStreamYPolling() {
  desconectarStreamYPolling();

  if (!obtenerUsuarioActual()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  unsubscribeStream = api.notificacion.suscribirStream({
    onEstado: (estado) => {
      setState({ streamEstado: estado });
    },
    onNotificacion: (evento) => {
      const notif = normalizarNotificacion(evento);
      if (!notif) {
        refrescarNotificaciones({ silencioso: true });
        return;
      }

      const existentes = state.notificaciones.filter((item) => item.id !== notif.id);
      const actualizadas = [notif, ...existentes];
      const pendientes = actualizadas.filter((item) => item.estado === 'PENDIENTE').length;

      setState({
        notificaciones: actualizadas,
        noLeidasCount: pendientes,
      });

      if (notif.estado === 'PENDIENTE') {
        mostrarPushNavegador(notif);
      }
    },
    onError: () => {
      setState({ streamEstado: 'error' });
    },
  });

  pollingTimer = setInterval(() => {
    if (state.streamEstado !== 'conectado') {
      refrescarNotificaciones({ silencioso: true });
    }
  }, POLLING_INTERVAL_MS);
}

function desconectarStreamYPolling() {
  if (unsubscribeStream) {
    unsubscribeStream();
    unsubscribeStream = null;
  }
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  setState({ streamEstado: 'desconectado' });
}

function asegurarEventosGlobales() {
  if (eventosDomRegistrados || typeof window === 'undefined') return;
  eventosDomRegistrados = true;

  window.addEventListener('online', () => {
    if (activos > 0 && obtenerUsuarioActual()) {
      refrescarNotificaciones({ silencioso: true });
      conectarStreamYPolling();
    }
  });

  window.addEventListener('offline', () => {
    desconectarStreamYPolling();
  });

  window.addEventListener('apexgym:auth-login', () => {
    cargaInicialCompletada = false;
    idsNotificados.clear();
    if (activos > 0) {
      refrescarNotificaciones();
      conectarStreamYPolling();
    }
  });

  window.addEventListener('apexgym:auth-logout', () => {
    cargaInicialCompletada = false;
    idsNotificados.clear();
    desconectarStreamYPolling();
    setState({
      notificaciones: [],
      noLeidasCount: 0,
      error: null,
    });
  });
}

export function suscribirStoreNotificaciones(listener) {
  listeners.add(listener);
  activos += 1;
  asegurarEventosGlobales();

  if (activos === 1 && obtenerUsuarioActual()) {
    refrescarNotificaciones();
    conectarStreamYPolling();
    if (leerPreferenciaPush()) {
      const token = obtenerOTokenWeb();
      api.notificacion.registrarDispositivoWeb(token).catch(() => {});
    }
  }

  return () => {
    listeners.delete(listener);
    activos = Math.max(0, activos - 1);
    if (activos === 0) {
      desconectarStreamYPolling();
    }
  };
}

export function obtenerSnapshotNotificaciones() {
  return state;
}

export function cambiarFiltroNotificaciones(filtro) {
  setState({ filtro });
}

export async function marcarNotificacionLeida(id) {
  try {
    await api.notificacion.marcarLeida(id);
    const actualizadas = state.notificaciones.map((n) => (
      n.id === id ? { ...n, estado: 'LEIDA', leidaAt: new Date().toISOString() } : n
    ));
    setState({
      notificaciones: actualizadas,
      noLeidasCount: actualizadas.filter((n) => n.estado === 'PENDIENTE').length,
    });
  } catch (error) {
    notifications.show({
      color: 'red',
      message: error?.message || 'No se pudo marcar la notificación como leída.',
    });
  }
}

export async function marcarNotificacionIgnorada(id) {
  try {
    await api.notificacion.marcarIgnorada(id);
    const actualizadas = state.notificaciones.map((n) => (
      n.id === id ? { ...n, estado: 'IGNORADA' } : n
    ));
    setState({
      notificaciones: actualizadas,
      noLeidasCount: actualizadas.filter((n) => n.estado === 'PENDIENTE').length,
    });
  } catch (error) {
    notifications.show({
      color: 'red',
      message: error?.message || 'No se pudo ignorar la notificación.',
    });
  }
}

export async function marcarTodasNotificacionesLeidas() {
  try {
    await api.notificacion.marcarTodasLeidas();
    const actualizadas = state.notificaciones.map((n) => (
      n.estado === 'PENDIENTE'
        ? { ...n, estado: 'LEIDA', leidaAt: new Date().toISOString() }
        : n
    ));
    setState({
      notificaciones: actualizadas,
      noLeidasCount: 0,
    });
    notifications.show({
      color: 'green',
      message: 'Todas las notificaciones fueron marcadas como leídas.',
    });
  } catch (error) {
    notifications.show({
      color: 'red',
      message: error?.message || 'No se pudieron marcar todas como leídas.',
    });
  }
}

export async function alternarPushNavegador(activar) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    notifications.show({
      color: 'yellow',
      title: 'Push no disponible',
      message: 'Este navegador no soporta notificaciones nativas.',
    });
    return false;
  }

  if (!activar) {
    try {
      localStorage.setItem(STORAGE_PUSH_ENABLED, 'false');
    } catch {
      // Ignorar errores de almacenamiento
    }
    setState({ pushHabilitado: false, pushPermiso: Notification.permission });
    return false;
  }

  setState({ registrandoPush: true });
  try {
    const permiso = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permiso !== 'granted') {
      try {
        localStorage.setItem(STORAGE_PUSH_ENABLED, 'false');
      } catch {
        // Ignorar
      }
      setState({
        pushHabilitado: false,
        pushPermiso: permiso,
        registrandoPush: false,
      });
      notifications.show({
        color: 'yellow',
        title: 'Permiso no concedido',
        message: permiso === 'denied'
          ? 'Bloqueaste las notificaciones en el navegador. Habilítalas desde la configuración del sitio.'
          : 'Acepta el permiso de notificaciones para recibir alertas en tiempo real.',
      });
      return false;
    }

    const token = obtenerOTokenWeb();
    await api.notificacion.registrarDispositivoWeb(token);

    try {
      localStorage.setItem(STORAGE_PUSH_ENABLED, 'true');
    } catch {
      // Ignorar
    }

    setState({
      pushHabilitado: true,
      pushPermiso: 'granted',
      registrandoPush: false,
    });

    notifications.show({
      color: 'green',
      title: 'Notificaciones Push activadas',
      message: 'Dispositivo web registrado para recibir alertas y actividad de empleados.',
    });
    return true;
  } catch (error) {
    setState({ registrandoPush: false });
    notifications.show({
      color: 'red',
      title: 'No se pudo registrar el dispositivo web',
      message: error?.message || 'Verifica tu conexión e intenta nuevamente.',
    });
    return false;
  }
}
