import { useRef } from 'react';
import {
  Badge,
  Button,
  Group,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCloudCheck,
  IconCloudOff,
  IconDatabase,
  IconDownload,
  IconRefresh,
  IconUpload,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import { useOffline } from '../../context/OfflineContext.jsx';
import classes from './OfflineStatusBar.module.css';

function formatearFechaCorta(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OfflineStatusBar() {
  const {
    isOnline,
    sincronizando,
    datosLocales,
    ventasPendientesTotales,
    ultimoErrorSync,
    sincronizarAhora,
    exportarVentasOffline,
    importarVentasOffline,
  } = useOffline();

  const fileInputRef = useRef(null);

  const ultimaSyncTexto = formatearFechaCorta(datosLocales?.ultimaActualizacion);
  const textoDatosLocales = datosLocales?.hayDatosLocales
    ? `Datos locales: Sí (${datosLocales.colecciones} colecciones)`
    : 'Sin datos locales';

  const manejarArchivo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      await importarVentasOffline(file);
    }
  };

  return (
    <section
      className={`${classes.bar} ${!isOnline ? classes.barOffline : ''}`}
      aria-label="Estado de conexión y sincronización sin conexión"
    >
      <div className={classes.statusCluster}>
        <Badge
          size="md"
          radius="sm"
          variant="filled"
          className={isOnline ? classes.badgeOnline : classes.badgeOffline}
          leftSection={isOnline ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
        >
          {isOnline ? 'En línea' : 'Sin conexión (solo efectivo)'}
        </Badge>

        <Tooltip
          label={
            datosLocales?.hayDatosLocales
              ? `Colecciones en caché local: ${datosLocales.nombresColecciones?.join(', ') || 'catálogos'}`
              : 'Sincroniza para precargar catálogos y poder operar sin internet'
          }
          withArrow
        >
          <Badge
            size="md"
            radius="sm"
            variant="light"
            className={datosLocales?.hayDatosLocales ? classes.badgeLocalYes : classes.badgeLocalNo}
            leftSection={<IconDatabase size={14} />}
          >
            {textoDatosLocales}
          </Badge>
        </Tooltip>

        {ultimaSyncTexto && (
          <Text size="xs" className={classes.syncTimestamp}>
            Última sync: {ultimaSyncTexto}
          </Text>
        )}

        <Badge
          size="md"
          radius="sm"
          variant={ventasPendientesTotales > 0 ? 'filled' : 'light'}
          className={ventasPendientesTotales > 0 ? classes.badgePending : classes.badgeClear}
          leftSection={ventasPendientesTotales > 0 ? <IconCloudOff size={14} /> : <IconCloudCheck size={14} />}
        >
          Pendientes offline: {ventasPendientesTotales}
        </Badge>

        {ultimoErrorSync && (
          <Text size="xs" className={classes.errorText}>
            {ultimoErrorSync}
          </Text>
        )}
      </div>

      <Group gap="xs" className={classes.actionsCluster}>
        <Button
          size="xs"
          radius="md"
          variant="filled"
          className={classes.btnPrimary}
          loading={sincronizando}
          disabled={!isOnline}
          leftSection={<IconRefresh size={14} />}
          onClick={() => sincronizarAhora({ silencioso: false })}
        >
          Sincronizar ahora
        </Button>

        <Button
          size="xs"
          radius="md"
          variant="light"
          color="secondary"
          className={classes.btnSecondary}
          disabled={ventasPendientesTotales === 0}
          leftSection={<IconDownload size={14} />}
          onClick={exportarVentasOffline}
        >
          Exportar
        </Button>

        <Button
          size="xs"
          radius="md"
          variant="light"
          color="secondary"
          className={classes.btnSecondary}
          leftSection={<IconUpload size={14} />}
          onClick={() => fileInputRef.current?.click()}
        >
          Importar
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className={classes.hiddenInput}
          aria-label="Importar paquete JSON de ventas offline"
          onChange={manejarArchivo}
        />
      </Group>
    </section>
  );
}

export default OfflineStatusBar;
