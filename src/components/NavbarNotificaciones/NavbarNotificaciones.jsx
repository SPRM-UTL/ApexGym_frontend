import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Indicator,
  Loader,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertTriangle,
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconCheck,
  IconChecks,
  IconClock,
  IconEyeOff,
  IconInfoCircle,
  IconRefresh,
} from '@tabler/icons-react';
import {
  alternarPushNavegador,
  cambiarFiltroNotificaciones,
  marcarNotificacionIgnorada,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  refrescarNotificaciones,
} from './notificacionesStore.js';
import { useNotificaciones } from './useNotificaciones.js';
import classes from './NavbarNotificaciones.module.css';

function formatearTiempoNotificacion(fechaIso) {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 60000));
  if (diffMin < 1) return 'Hace instantes';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.round(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PanelNotificaciones({ compact = false, fullHeight = false }) {
  const {
    notificaciones,
    noLeidasCount,
    cargando,
    actualizando,
    error,
    filtro,
    streamEstado,
    pushHabilitado,
    pushPermiso,
    registrandoPush,
  } = useNotificaciones();

  const actividadCount = useMemo(
    () => notificaciones.filter((n) => n.tipo === 'ACTIVIDAD_EMPLEADO').length,
    [notificaciones]
  );

  const notificacionesFiltradas = useMemo(() => {
    if (filtro === 'NO_LEIDAS') {
      return notificaciones.filter((n) => n.estado === 'PENDIENTE');
    }
    if (filtro === 'ACTIVIDAD_ANDROID') {
      return notificaciones.filter((n) => n.tipo === 'ACTIVIDAD_EMPLEADO');
    }
    return notificaciones;
  }, [notificaciones, filtro]);

  return (
    <div className={fullHeight ? classes.panelFullHeight : (compact ? classes.panelCompact : classes.panel)}>
      {/* Barra de filtros tipo pestañas pill */}
      <SegmentedControl
        size="xs"
        radius="xl"
        fullWidth
        value={filtro}
        onChange={cambiarFiltroNotificaciones}
        classNames={{
          root: classes.filterTrack,
          indicator: classes.filterIndicator,
          label: classes.filterLabel,
        }}
        data={[
          {
            value: 'TODAS',
            label: (
              <Group gap={5} justify="center" wrap="nowrap">
                <IconBell size={14} stroke={2} />
                <span>Todas ({notificaciones.length})</span>
              </Group>
            ),
          },
          {
            value: 'NO_LEIDAS',
            label: (
              <Group gap={5} justify="center" wrap="nowrap">
                <IconChecks size={14} stroke={2} />
                <span>Sin leer ({noLeidasCount})</span>
              </Group>
            ),
          },
          {
            value: 'ACTIVIDAD_ANDROID',
            label: (
              <Group gap={5} justify="center" wrap="nowrap">
                <IconActivity size={14} stroke={2} />
                <span>Actividad ({actividadCount})</span>
              </Group>
            ),
          },
        ]}
      />

      {/* Barra de acciones rápidas y estado */}
      <Group justify="space-between" align="center" wrap="nowrap" className={classes.toolbar}>
        <Badge
          size="xs"
          variant="dot"
          color={streamEstado === 'conectado' ? 'green' : 'gray'}
        >
          {streamEstado === 'conectado' ? 'En vivo' : 'Auto 30s'}
        </Badge>

        <Group gap={4} wrap="nowrap">
          <Tooltip label="Actualizar notificaciones" withArrow>
            <ActionIcon
              variant="subtle"
              color="secondary"
              size="md"
              aria-label="Actualizar notificaciones"
              loading={actualizando}
              onClick={() => refrescarNotificaciones()}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Button
            size="xs"
            variant="subtle"
            color="apex"
            disabled={noLeidasCount === 0}
            leftSection={<IconChecks size={14} />}
            onClick={marcarTodasNotificacionesLeidas}
          >
            Leer todas
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light" py={6} px={10}>
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {/* Lista de notificaciones ocupando el espacio disponible */}
      <div className={fullHeight ? classes.listScrollFull : classes.listScrollCompact}>
        {cargando ? (
          <Group justify="center" py="xl">
            <Loader size="sm" color="apex" />
            <Text size="xs" className={classes.mutedText}>Cargando alertas...</Text>
          </Group>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className={classes.emptyState}>
            <IconBell size={32} stroke={1.5} color="var(--ag-text-muted)" />
            <Text size="sm" fw={600} className={classes.mutedText}>
              No hay notificaciones en esta vista.
            </Text>
          </div>
        ) : (
          <div className={classes.listContainer}>
            {notificacionesFiltradas.map((notif) => {
              const pendiente = notif.estado === 'PENDIENTE';
              const esActividad = notif.tipo === 'ACTIVIDAD_EMPLEADO';
              const esAlerta = notif.estado === 'IGNORADA' || /error|alerta|advertencia|fall|venc/i.test(`${notif.titulo || ''} ${notif.mensaje || ''}`);

              const variante = esActividad ? 'info' : (esAlerta ? 'warning' : 'success');

              return (
                <div
                  key={notif.id ?? `${notif.titulo}-${notif.createdAt}`}
                  className={`${classes.listItem} ${pendiente ? classes.listItemUnread : ''}`}
                >
                  <span
                    className={`${classes.statusDot} ${
                      pendiente
                        ? (variante === 'info'
                          ? classes.dotInfo
                          : variante === 'warning'
                            ? classes.dotWarning
                            : classes.dotSuccess)
                        : classes.dotRead
                    }`}
                  />

                  <div
                    className={`${classes.itemIconCircle} ${
                      variante === 'info'
                        ? classes.iconInfo
                        : variante === 'warning'
                          ? classes.iconWarning
                          : classes.iconSuccess
                    }`}
                  >
                    {variante === 'info' ? (
                      <IconInfoCircle size={18} stroke={2.2} />
                    ) : variante === 'warning' ? (
                      <IconAlertTriangle size={18} stroke={2.2} />
                    ) : (
                      <IconCheck size={18} stroke={2.5} />
                    )}
                  </div>

                  <div className={classes.itemContent}>
                    <div className={classes.itemHeaderRow}>
                      <Text className={classes.itemTitle}>
                        {notif.titulo || 'Notificación'}
                      </Text>
                      <span
                        className={`${classes.categoryPill} ${
                          esActividad
                            ? classes.pillActividad
                            : variante === 'warning'
                              ? classes.pillWarning
                              : classes.pillSistema
                        }`}
                      >
                        {esActividad ? 'Actividad' : 'Sistema'}
                      </span>
                    </div>

                    {notif.mensaje && (
                      <Text className={classes.itemMessage}>
                        {notif.mensaje}
                      </Text>
                    )}

                    <div className={classes.itemFooterRow}>
                      <span className={classes.itemDate}>
                        <IconClock size={13} stroke={1.8} />
                        <span>{formatearTiempoNotificacion(notif.createdAt)}</span>
                      </span>

                      {notif.id && (
                        <Group gap={4} wrap="nowrap">
                          {pendiente && (
                            <Tooltip label="Marcar como leída" withArrow>
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="green"
                                aria-label="Marcar notificación como leída"
                                onClick={() => marcarNotificacionLeida(notif.id)}
                              >
                                <IconCheck size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {notif.estado !== 'IGNORADA' && (
                            <Tooltip label="Ignorar notificación" withArrow>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="gray"
                                aria-label="Ignorar notificación"
                                onClick={() => marcarNotificacionIgnorada(notif.id)}
                              >
                                <IconEyeOff size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configuración Push en la parte inferior */}
      <div className={classes.pushBar}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap={8} wrap="nowrap">
            {pushHabilitado ? (
              <IconBellRinging size={17} color="var(--ag-color-primary-dark)" />
            ) : (
              <IconBellOff size={17} color="var(--ag-text-muted)" />
            )}
            <div>
              <Text size="xs" fw={600} className={classes.pushTitle}>
                Notificaciones Push
              </Text>
              <Text size="11px" className={classes.pushMeta}>
                {pushPermiso === 'unsupported'
                  ? 'No soportado en este navegador'
                  : pushPermiso === 'denied'
                    ? 'Permiso bloqueado en el navegador'
                    : pushHabilitado
                      ? 'Alertas activas en este navegador'
                      : 'Activa para recibir alertas en tiempo real'}
              </Text>
            </div>
          </Group>
          <Switch
            size="sm"
            color="apex"
            aria-label="Activar notificaciones Push del navegador"
            disabled={pushPermiso === 'unsupported' || registrandoPush}
            checked={pushHabilitado}
            onChange={(event) => alternarPushNavegador(event.currentTarget.checked)}
          />
        </Group>
      </div>
    </div>
  );
}

export function NavbarNotificaciones() {
  const [opened, setOpened] = useState(false);
  const { noLeidasCount } = useNotificaciones();

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={390}
      position="bottom-end"
      shadow="lg"
      withArrow
      zIndex={1200}
    >
      <Popover.Target>
        <Tooltip
          label={noLeidasCount > 0 ? `${noLeidasCount} notificación(es) sin leer` : 'Notificaciones'}
          withArrow
          disabled={opened}
        >
          <Indicator
            inline
            label={noLeidasCount > 99 ? '99+' : noLeidasCount}
            size={18}
            color="apex"
            disabled={noLeidasCount <= 0}
            offset={4}
          >
            <ActionIcon
              variant="subtle"
              size={38}
              radius="md"
              className={classes.bellButton}
              aria-label={`Notificaciones (${noLeidasCount} sin leer)`}
              onClick={() => setOpened((prev) => !prev)}
            >
              <IconBell size={20} stroke={1.8} />
            </ActionIcon>
          </Indicator>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown p="sm" className={classes.dropdown}>
        <PanelNotificaciones />
      </Popover.Dropdown>
    </Popover>
  );
}

export default NavbarNotificaciones;
