import { useRef, useState } from 'react';
import {
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCloudCheck,
  IconCloudOff,
  IconDatabase,
  IconDownload,
  IconInfoCircle,
  IconRefresh,
  IconUpload,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import { useOffline } from '../../context/OfflineContext.jsx';
import classes from './OfflineStatusBar.module.css';

function formatearAntiguedad(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  const minutos = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 60000));
  if (minutos < 1) return 'hace instantes';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
}

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

const ETIQUETAS_SW = {
  activo: 'SW activo',
  instalando: 'SW instalando',
  'esperando-actualizacion': 'SW en espera',
  registrado: 'SW registrado',
  'no-registrado': 'SW no registrado',
  'no-soportado': 'SW no soportado',
  error: 'SW con error',
  'sin-revisar': 'SW sin revisar',
};

export function OfflineStatusBar() {
  const {
    isOnline,
    apiAlcanzable,
    sincronizando,
    almacenamiento,
    estadoServiceWorker,
    diagnosticoOffline,
    ejecutarDiagnostico,
    datosLocales,
    ventasPendientesTotales,
    ultimoErrorSync,
    sincronizarAhora,
    exportarVentasOffline,
    importarVentasOffline,
  } = useOffline();

  const fileInputRef = useRef(null);
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState(false);
  const [revisando, setRevisando] = useState(false);

  const estadoSw = diagnosticoOffline?.serviceWorker?.estado ?? estadoServiceWorker?.estado;
  const etiquetaSw = ETIQUETAS_SW[estadoSw] || ETIQUETAS_SW['sin-revisar'];
  const swActivo = estadoSw === 'activo';

  const pruebaAlmacenamiento = diagnosticoOffline?.almacenamiento;
  const almacenamientoEsMemoria = pruebaAlmacenamiento
    ? Boolean(pruebaAlmacenamiento.memoria)
    : Boolean(almacenamiento?.memoria);
  const etiquetaAlmacenamiento = almacenamientoEsMemoria
    ? 'Almacén: memoria'
    : (almacenamiento?.modo === 'indexeddb' ? 'Almacén: IndexedDB' : 'Almacén: sin revisar');

  const abrirDiagnostico = async () => {
    setDiagnosticoAbierto(true);
    setRevisando(true);
    try {
      await ejecutarDiagnostico();
    } finally {
      setRevisando(false);
    }
  };

  const ultimaSyncTexto = formatearFechaCorta(datosLocales?.ultimaActualizacion);
  const textoDatosLocales = datosLocales?.hayDatosLocales
    ? `Datos locales: Sí (${datosLocales.colecciones} colecciones)`
    : 'Sin datos locales';

  const sinRedFisica = typeof navigator !== 'undefined' && navigator.onLine === false;
  const etiquetaConexion = isOnline
    ? 'En línea'
    : (!apiAlcanzable && !sinRedFisica
      ? 'API no responde (solo efectivo)'
      : 'Sin conexión (solo efectivo)');

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
          {etiquetaConexion}
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

        <Tooltip
          label={estadoServiceWorker?.detalle || 'Estado del service worker que sirve la app sin conexión'}
          withArrow
        >
          <Badge
            size="md"
            radius="sm"
            variant="light"
            color={swActivo ? 'green' : 'yellow'}
            className={swActivo ? classes.badgeLocalYes : classes.badgeLocalNo}
          >
            {etiquetaSw}
          </Badge>
        </Tooltip>

        <Tooltip
          label={
            almacenamientoEsMemoria
              ? (almacenamiento?.motivo || 'Los datos solo viven en memoria y se pierden al recargar')
              : 'Las ventas y catálogos offline quedan guardados en IndexedDB'
          }
          withArrow
        >
          <Badge
            size="md"
            radius="sm"
            variant="light"
            color={almacenamientoEsMemoria ? 'red' : 'green'}
            className={almacenamientoEsMemoria ? classes.badgeLocalNo : classes.badgeLocalYes}
          >
            {etiquetaAlmacenamiento}
          </Badge>
        </Tooltip>

        {ultimaSyncTexto && (
          <Text size="xs" className={classes.syncTimestamp}>
            Última sync: {ultimaSyncTexto}
            {datosLocales?.ultimaActualizacion && ` (${formatearAntiguedad(datosLocales.ultimaActualizacion)})`}
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

        <Button
          size="xs"
          radius="md"
          variant="subtle"
          color="secondary"
          className={classes.btnSecondary}
          loading={revisando}
          leftSection={<IconInfoCircle size={14} />}
          onClick={abrirDiagnostico}
        >
          Diagnóstico
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

      <Modal
        opened={diagnosticoAbierto}
        onClose={() => setDiagnosticoAbierto(false)}
        title="Diagnóstico del modo sin conexión"
        centered
        size="lg"
      >
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" fw={600}>Service Worker</Text>
            <Badge color={swActivo ? 'green' : 'yellow'} variant="light">
              {etiquetaSw}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {diagnosticoOffline?.serviceWorker?.detalle
              || estadoServiceWorker?.detalle
              || 'Se consulta al abrir la app; también puedes usar «Volver a comprobar».'}
          </Text>

          <Group justify="space-between">
            <Text size="sm" fw={600}>Almacenamiento local</Text>
            <Badge color={almacenamientoEsMemoria ? 'red' : 'green'} variant="light">
              {pruebaAlmacenamiento
                ? (pruebaAlmacenamiento.modo === 'indexeddb' ? 'IndexedDB' : 'Memoria')
                : (almacenamiento?.modo || 'sin revisar')}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            {pruebaAlmacenamiento
              ? `${pruebaAlmacenamiento.correcto ? 'Escritura y lectura verificadas' : 'La prueba de escritura falló'} · Permiso: ${pruebaAlmacenamiento.permiso}`
              : 'Ejecuta el diagnóstico para probar la escritura local.'}
          </Text>
          {(pruebaAlmacenamiento?.motivo || almacenamiento?.motivo) && (
            <Text size="xs" c="red">
              {pruebaAlmacenamiento?.motivo || almacenamiento?.motivo}
            </Text>
          )}

          <Text size="sm" fw={600} mt="xs">Catálogos guardados para cobrar sin conexión</Text>
          {(diagnosticoOffline?.catalogos || []).length === 0 && (
            <Text size="xs" c="dimmed">Aún no se ha ejecutado el diagnóstico.</Text>
          )}
          {(diagnosticoOffline?.catalogos || []).map((catalogo) => (
            <Group key={catalogo.url} justify="space-between">
              <Text size="xs">
                {catalogo.etiqueta}{' '}
                <Text span size="xs" c="dimmed">{catalogo.url}</Text>
              </Text>
              <Badge size="sm" variant="light" color={catalogo.disponible ? 'green' : 'red'}>
                {catalogo.disponible ? 'Guardado' : 'Falta'}
              </Badge>
            </Group>
          ))}
          {(diagnosticoOffline?.faltantes ?? 0) > 0 && (
            <Text size="xs" c="yellow.8">
              Faltan {diagnosticoOffline.faltantes} catálogo(s): conéctate a la API y pulsa «Sincronizar ahora» para poder cobrar sin conexión.
            </Text>
          )}

          <Group justify="flex-end">
            <Button size="xs" variant="light" loading={revisando} onClick={abrirDiagnostico}>
              Volver a comprobar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  );
}

export default OfflineStatusBar;
