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
  IconBell,
  IconBellOff,
  IconBellRinging,
  IconCheck,
  IconChecks,
  IconDeviceMobile,
  IconEyeOff,
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
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PanelNotificaciones({ compact = false }) {
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
    <Stack gap="xs" className={compact ? classes.panelCompact : classes.panel}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Text fw={700} size="sm" className={classes.panelTitle}>
            Notificaciones
          </Text>
          {noLeidasCount > 0 && (
            <Badge size="xs" color="apex" variant="filled">
              {noLeidasCount}
            </Badge>
          )}
          <Badge
            size="xs"
            variant="dot"
            color={streamEstado === 'conectado' ? 'green' : 'gray'}
          >
            {streamEstado === 'conectado' ? 'En vivo' : 'Auto 30s'}
          </Badge>
        </Group>

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

      <div className={classes.pushBar}>
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap={6} wrap="nowrap">
            {pushHabilitado ? (
              <IconBellRinging size={16} color="var(--ag-color-primary-dark)" />
            ) : (
              <IconBellOff size={16} color="var(--ag-text-muted)" />
            )}
            <div>
              <Text size="xs" fw={600} className={classes.pushTitle}>
                Notificaciones Push del navegador
              </Text>
              <Text size="11px" className={classes.pushMeta}>
                {pushPermiso === 'unsupported'
                  ? 'No soportado en este navegador'
                  : pushPermiso === 'denied'
                    ? 'Permiso bloqueado en el navegador'
                    : pushHabilitado
                      ? 'Dispositivo WEB activo'
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

      <SegmentedControl
        size="xs"
        fullWidth
        value={filtro}
        onChange={cambiarFiltroNotificaciones}
        data={[
          { label: 'Todas', value: 'TODAS' },
          { label: `No leídas (${noLeidasCount})`, value: 'NO_LEIDAS' },
          { label: 'Actividad Android', value: 'ACTIVIDAD_ANDROID' },
        ]}
      />

      <Divider />

      {error && (
        <Alert color="red" variant="light" py={6} px={10}>
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {cargando ? (
        <Group justify="center" py="md">
          <Loader size="sm" color="apex" />
          <Text size="xs" className={classes.mutedText}>Cargando alertas...</Text>
        </Group>
      ) : notificacionesFiltradas.length === 0 ? (
        <div className={classes.emptyState}>
          <IconBell size={26} stroke={1.5} color="var(--ag-text-muted)" />
          <Text size="xs" fw={600} className={classes.mutedText}>
            No hay notificaciones en esta vista.
          </Text>
        </div>
      ) : (
        <ScrollArea.Autosize mah={compact ? 260 : 340} type="auto" offsetScrollbars>
          <Stack gap="xs">
            {notificacionesFiltradas.map((notif) => {
              const pendiente = notif.estado === 'PENDIENTE';
              const esAndroid = notif.tipo === 'ACTIVIDAD_EMPLEADO';

              return (
                <div
                  key={notif.id ?? `${notif.titulo}-${notif.createdAt}`}
                  className={`${classes.item} ${pendiente ? classes.itemPendiente : ''}`}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <div className={classes.itemContent}>
                      <Group gap={6} wrap="wrap" mb={2}>
                        {pendiente && (
                          <Badge size="xs" color="apex" variant="filled">
                            Nueva
                          </Badge>
                        )}
                        {esAndroid && (
                          <Badge
                            size="xs"
                            color="blue"
                            variant="light"
                            leftSection={<IconDeviceMobile size={11} />}
                          >
                            Android
                          </Badge>
                        )}
                        {notif.estado === 'IGNORADA' && (
                          <Badge size="xs" color="gray" variant="light">
                            Ignorada
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" fw={700} className={classes.itemTitle}>
                        {notif.titulo || 'Notificación'}
                      </Text>
                      <Text size="xs" className={classes.itemMessage}>
                        {notif.mensaje}
                      </Text>
                      <Text size="11px" className={classes.itemDate}>
                        {formatearTiempoNotificacion(notif.createdAt)}
                      </Text>
                    </div>

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
                  </Group>
                </div>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      )}
    </Stack>
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
