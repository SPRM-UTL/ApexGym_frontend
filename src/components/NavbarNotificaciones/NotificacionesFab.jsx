import { useState } from 'react';
import {
  ActionIcon,
  Drawer,
  Group,
  Indicator,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconBell, IconBellRinging } from '@tabler/icons-react';
import { PanelNotificaciones } from './NavbarNotificaciones.jsx';
import { useNotificaciones } from './useNotificaciones.js';
import classes from './NotificacionesFab.module.css';

export function NotificacionesFab() {
  const [abierto, setAbierto] = useState(false);
  const { noLeidasCount } = useNotificaciones();

  return (
    <>
      <Tooltip
        label={noLeidasCount > 0 ? `Notificaciones (${noLeidasCount} sin leer)` : 'Centro de notificaciones'}
        position="left"
        withArrow
      >
        <div className={classes.fabWrapper}>
          <Indicator
            label={noLeidasCount > 99 ? '99+' : noLeidasCount}
            size={20}
            offset={4}
            color="red"
            disabled={noLeidasCount === 0}
            processing={noLeidasCount > 0}
          >
            <ActionIcon
              className={classes.fab}
              size={52}
              radius="xl"
              variant="filled"
              onClick={() => setAbierto(true)}
              aria-label="Abrir centro de notificaciones"
            >
              {noLeidasCount > 0 ? <IconBellRinging size={23} /> : <IconBell size={23} />}
            </ActionIcon>
          </Indicator>
        </div>
      </Tooltip>

      <Drawer
        opened={abierto}
        onClose={() => setAbierto(false)}
        position="right"
        size="480px"
        overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
        zIndex={999999}
        title={
          <Group gap="sm">
            <IconBell size={22} stroke={1.8} color="var(--ag-color-primary-dark)" />
            <div>
              <Title order={4} fw={700} c="var(--ag-text-primary)">
                Notificaciones
              </Title>
              <Text size="xs" c="var(--ag-text-muted)">
                Alertas en tiempo real y avisos Push
              </Text>
            </div>
          </Group>
        }
        classNames={{
          header: classes.drawerHeader,
          title: classes.drawerTitle,
          close: classes.drawerClose,
          body: classes.drawerBody,
        }}
      >
        <PanelNotificaciones fullHeight />
      </Drawer>
    </>
  );
}

export default NotificacionesFab;
