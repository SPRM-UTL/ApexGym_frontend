import { useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconClock,
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

export function OfflineStatusBar() {
  const {
    isOnline,
    apiAlcanzable,
    sincronizando,
    almacenamiento,
    diagnosticoOffline,
    ejecutarDiagnostico,
    datosLocales,
    ventasPendientesTotales,
    ultimoErrorSync,
    sincronizarAhora,
    exportarVentasOffline,
    importarVentasOffline,
  } = useOffline();

  const [panelAbierto, setPanelAbierto] = useState(false);
  const fileInputRef = useRef(null);
  const [diagnosticoAbierto, setDiagnosticoAbierto] = useState(false);
  const [revisando, setRevisando] = useState(false);

  const pruebaAlmacenamiento = diagnosticoOffline?.almacenamiento;
  const almacenamientoEsMemoria = pruebaAlmacenamiento
    ? Boolean(pruebaAlmacenamiento.memoria)
    : Boolean(almacenamiento?.memoria);

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
  const antiguedadSync = datosLocales?.ultimaActualizacion
    ? formatearAntiguedad(datosLocales.ultimaActualizacion)
    : null;

  const sinRedFisica = typeof navigator !== 'undefined' && navigator.onLine === false;
  const etiquetaConexion = isOnline
    ? 'En línea'
    : (!apiAlcanzable && !sinRedFisica
      ? 'API no responde'
      : 'Sin conexión');

  const descripcionConexion = isOnline
    ? 'Conexión estable con el servidor de ApexGym'
    : 'Modo offline activo · Solo cobros en efectivo';

  const manejarArchivo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      await importarVentasOffline(file);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <Tooltip
        label="Estado de conexión y modo offline"
        position="left"
        withArrow
      >
        <ActionIcon
          className={`${classes.fab} ${isOnline ? classes.fabOnline : classes.fabOffline}`}
          size={52}
          radius="xl"
          variant="filled"
          onClick={() => setPanelAbierto(true)}
          aria-label="Abrir información del modo offline"
        >
          {isOnline ? <IconWifi size={23} /> : <IconWifiOff size={23} />}
        </ActionIcon>
      </Tooltip>

      {/* Sidebar lateral derecha homologada con SidebarUsuario */}
      <Drawer
        opened={panelAbierto}
        onClose={() => setPanelAbierto(false)}
        position="right"
        size="420px"
        overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
        zIndex={999999}
        title={
          <Group gap="sm">
            {isOnline ? (
              <IconWifi size={22} stroke={1.8} color="var(--ag-color-primary-dark)" />
            ) : (
              <IconWifiOff size={22} stroke={1.8} color="var(--ag-color-danger)" />
            )}
            <div>
              <Title order={4} fw={700} c="var(--ag-text-primary)">
                Estado de conexión
              </Title>
              <Text size="xs" c="var(--ag-text-muted)">
                Sincronización y operación sin conexión
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
        {/* Tarjeta Hero del estado actual */}
        <div className={`${classes.statusHero} ${isOnline ? classes.statusHeroOnline : classes.statusHeroOffline}`}>
          <div className={`${classes.heroIconCircle} ${isOnline ? classes.heroIconOnline : classes.heroIconOffline}`}>
            {isOnline ? <IconWifi size={30} stroke={1.9} /> : <IconWifiOff size={30} stroke={1.9} />}
          </div>

          <Title order={3} className={classes.heroTitle}>
            {etiquetaConexion}
          </Title>

          <Text className={classes.heroSubtitle}>
            {descripcionConexion}
          </Text>

          <div className={classes.heroBadgeRow}>
            <Badge
              size="sm"
              radius="sm"
              className={isOnline ? classes.badgeOnline : classes.badgeOffline}
            >
              {isOnline ? 'SERVICIO OPERATIVO' : 'MODO OFFLINE'}
            </Badge>
          </div>
        </div>

        {/* Tarjeta de resumen de sincronización */}
        <div className={classes.infoCard}>
          <div className={classes.cardSectionTitle}>Resumen de datos</div>

          <div className={classes.infoRow}>
            <div className={classes.infoIconWrapper}>
              {ventasPendientesTotales > 0 ? (
                <IconCloudOff size={18} stroke={1.8} />
              ) : (
                <IconCloudCheck size={18} stroke={1.8} />
              )}
            </div>
            <div className={classes.infoMeta}>
              <div className={classes.infoLabel}>Ventas pendientes por sincronizar</div>
              <div className={classes.infoValue}>
                {ventasPendientesTotales === 0
                  ? 'Sin pendientes'
                  : `${ventasPendientesTotales} pendiente(s)`}
              </div>
            </div>
            <Badge
              size="sm"
              radius="sm"
              variant="light"
              color={ventasPendientesTotales > 0 ? 'orange' : 'green'}
            >
              {ventasPendientesTotales}
            </Badge>
          </div>

          <div className={classes.infoRow}>
            <div className={classes.infoIconWrapper}>
              <IconDatabase size={18} stroke={1.8} />
            </div>
            <div className={classes.infoMeta}>
              <div className={classes.infoLabel}>Catálogos disponibles offline</div>
              <div className={classes.infoValue}>
                {datosLocales?.hayDatosLocales
                  ? `${datosLocales.colecciones} colecciones guardadas`
                  : 'Sin datos locales'}
              </div>
            </div>
          </div>

          {ultimaSyncTexto && (
            <div className={classes.infoRow}>
              <div className={classes.infoIconWrapper}>
                <IconClock size={18} stroke={1.8} />
              </div>
              <div className={classes.infoMeta}>
                <div className={classes.infoLabel}>Última sincronización</div>
                <div className={classes.infoValue}>
                  {ultimaSyncTexto}
                  {antiguedadSync ? ` (${antiguedadSync})` : ''}
                </div>
              </div>
            </div>
          )}

          {almacenamientoEsMemoria && (
            <div className={classes.warningBox}>
              <IconAlertTriangle size={16} stroke={2} style={{ flexShrink: 0 }} />
              <span>
                {almacenamiento?.motivo || 'El almacenamiento está en memoria; los datos se perderán al recargar.'}
              </span>
            </div>
          )}

          {ultimoErrorSync && (
            <div className={classes.errorText}>
              {ultimoErrorSync}
            </div>
          )}
        </div>

        {/* Tarjeta de acciones */}
        <div className={classes.infoCard}>
          <div className={classes.cardSectionTitle}>Acciones</div>

          <Stack gap="sm">
            <Button
              fullWidth
              size="sm"
              radius="md"
              className={classes.btnPrimary}
              loading={sincronizando}
              disabled={!isOnline}
              leftSection={<IconRefresh size={16} />}
              onClick={() => sincronizarAhora({ silencioso: false })}
            >
              Sincronizar ahora
            </Button>

            <div className={classes.actionsGrid}>
              <Button
                size="sm"
                radius="md"
                variant="light"
                className={classes.btnSecondary}
                disabled={ventasPendientesTotales === 0}
                leftSection={<IconDownload size={16} />}
                onClick={exportarVentasOffline}
              >
                Exportar
              </Button>

              <Button
                size="sm"
                radius="md"
                variant="light"
                className={classes.btnSecondary}
                leftSection={<IconUpload size={16} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Importar
              </Button>
            </div>

            <Button
              fullWidth
              size="xs"
              radius="md"
              variant="subtle"
              className={classes.btnDiagnostic}
              loading={revisando}
              leftSection={<IconInfoCircle size={15} />}
              onClick={abrirDiagnostico}
            >
              Ver diagnóstico técnico
            </Button>
          </Stack>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className={classes.hiddenInput}
          aria-label="Importar paquete JSON de ventas offline"
          onChange={manejarArchivo}
        />
      </Drawer>

      {/* Modal de diagnóstico técnico en pantalla completa */}
      <Modal
        opened={diagnosticoAbierto}
        onClose={() => setDiagnosticoAbierto(false)}
        fullScreen
        radius={0}
        zIndex={1000001}
        transitionProps={{ transition: 'slide-up', duration: 200 }}
        title={
          <Group gap="sm">
            <IconInfoCircle size={22} stroke={1.9} color="#ffffff" />
            <div>
              <Title order={4} fw={700} c="#ffffff">
                Diagnóstico del modo sin conexión
              </Title>
              <Text size="xs" c="rgba(255, 255, 255, 0.8)">
                Verificación de almacenamiento local y catálogos disponibles
              </Text>
            </div>
          </Group>
        }
        classNames={{
          body: classes.diagModalBody,
        }}
      >
        <div className={classes.diagContainer}>
          {/* Catálogos guardados */}
          <div className={classes.infoCard}>
            <Group justify="space-between" mb="sm">
              <div className={classes.cardSectionTitle} style={{ marginBottom: 0 }}>
                Catálogos para cobrar sin conexión
              </div>
              {(diagnosticoOffline?.catalogos || []).length > 0 && (
                <Badge
                  size="sm"
                  radius="sm"
                  variant="light"
                  color={(diagnosticoOffline?.faltantes ?? 0) > 0 ? 'orange' : 'green'}
                >
                  {(diagnosticoOffline?.catalogos || []).length - (diagnosticoOffline?.faltantes ?? 0)} / {(diagnosticoOffline?.catalogos || []).length} listos
                </Badge>
              )}
            </Group>

            {(diagnosticoOffline?.catalogos || []).length === 0 ? (
              <Text size="sm" c="var(--ag-text-muted)">
                Aún no se ha ejecutado el diagnóstico.
              </Text>
            ) : (
              <div className={classes.catalogList}>
                {(diagnosticoOffline?.catalogos || []).map((catalogo) => (
                  <div key={catalogo.url} className={classes.infoRow}>
                    <div className={classes.infoIconWrapper}>
                      <IconDatabase size={18} stroke={1.8} />
                    </div>
                    <div className={classes.infoMeta}>
                      <div className={classes.infoValue}>{catalogo.etiqueta}</div>
                    </div>
                    <Badge size="sm" radius="sm" variant="light" color={catalogo.disponible ? 'green' : 'red'}>
                      {catalogo.disponible ? 'Guardado' : 'Falta'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {(diagnosticoOffline?.faltantes ?? 0) > 0 && (
              <div className={classes.warningBox}>
                <IconAlertTriangle size={16} stroke={2} style={{ flexShrink: 0 }} />
                <span>
                  Faltan {diagnosticoOffline.faltantes} catálogo(s): conéctate a la API y pulsa «Sincronizar ahora» para poder cobrar sin conexión.
                </span>
              </div>
            )}
          </div>

          {/* Barra de acciones */}
          <Group justify="flex-end" gap="sm">
            <Button
              size="sm"
              radius="md"
              variant="light"
              className={classes.btnSecondary}
              onClick={() => setDiagnosticoAbierto(false)}
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              radius="md"
              className={classes.btnPrimary}
              loading={revisando}
              leftSection={<IconRefresh size={16} />}
              onClick={abrirDiagnostico}
            >
              Volver a comprobar
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}

export default OfflineStatusBar;
