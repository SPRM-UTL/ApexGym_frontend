import {
    Badge,
    Button,
    Group,
    Paper,
    Text,
    ThemeIcon,
    Title,
    UnstyledButton,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconHome,
    IconRefresh,
} from '@tabler/icons-react';
import { useErrorController } from './ErrorController.js';
import { UserButton } from '../../components/UserButton/UserButton.jsx';
import { obtenerUsuarioActual } from '../../scripts/constantes.js';
import classes from './PaginaError.module.css';

/**
 * Componente de pantalla de error (404, 403, 500, etc.)
 * Sigue el estilo claro corporativo oficial de ApexGym.
 */
export function PaginaError({ codigo = 404, mensaje = null, estaLogeadoEn = false }) {
    const { config, irInicio, volverAtras, recargarPagina } = useErrorController({
        codigo,
        mensaje,
        estaLogeadoEn,
    });

    const usuarioActual = obtenerUsuarioActual();
    const IconoComponente = config.icono;
    const esErrorServidor = config.codigo === 500 || config.codigo === 'Error';

    return (
        <div className={classes.shell}>
            <header className={classes.header}>
                <UnstyledButton className={classes.logo} onClick={irInicio}>
                    Apex<span className={classes.logoAccent}>Gym</span>
                </UnstyledButton>

                <div className={classes.headerActions}>
                    {usuarioActual ? (
                        <Group gap="sm" wrap="nowrap">
                            <UserButton usuario={usuarioActual} />
                        </Group>
                    ) : (
                        <Button
                            variant="subtle"
                            size="xs"
                            className={classes.loginBtn}
                            onClick={irInicio}
                        >
                            Iniciar sesión
                        </Button>
                    )}
                </div>
            </header>

            <main className={classes.content}>
                <Paper className={classes.card}>
                    {/* Código decorativo de fondo */}
                    <div className={classes.watermark} aria-hidden="true">
                        {config.codigo}
                    </div>

                    <div className={classes.cardContent}>
                        <div className={classes.iconWrapper}>
                            <ThemeIcon
                                size={54}
                                radius="xl"
                                variant="transparent"
                                c="var(--ag-color-primary)"
                            >
                                <IconoComponente size={40} stroke={1.8} />
                            </ThemeIcon>
                        </div>

                        <div>
                            <Badge
                                size="lg"
                                radius="sm"
                                className={classes.badge}
                            >
                                {config.badge}
                            </Badge>
                        </div>

                        <Title order={1} className={classes.title}>
                            {config.titulo}
                        </Title>

                        <Text size="md" className={classes.subtitle}>
                            {config.subtitulo}
                        </Text>

                        <div className={classes.actionsGroup}>
                            <Button
                                size="md"
                                radius="md"
                                className={classes.btnSecondary}
                                leftSection={<IconArrowLeft size={18} />}
                                onClick={volverAtras}
                            >
                                Volver atrás
                            </Button>

                            <Button
                                size="md"
                                radius="md"
                                className={classes.btnPrimary}
                                leftSection={<IconHome size={18} />}
                                onClick={irInicio}
                            >
                                {estaLogeadoEn ? 'Ir al inicio' : 'Iniciar sesión'}
                            </Button>

                            {esErrorServidor && (
                                <Button
                                    size="md"
                                    radius="md"
                                    className={classes.btnRetry}
                                    leftSection={<IconRefresh size={18} />}
                                    onClick={recargarPagina}
                                >
                                    Reintentar
                                </Button>
                            )}
                        </div>

                        <div className={classes.footerHint}>
                            ApexGym &bull; Plataforma de Gestión Deportiva
                        </div>
                    </div>
                </Paper>
            </main>
        </div>
    );
}

export default PaginaError;
