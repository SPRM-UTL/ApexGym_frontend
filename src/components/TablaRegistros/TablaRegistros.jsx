import { ActionIcon, Divider, Group, Skeleton, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TableSort } from '../TableSort/TableSort.jsx';
import classes from './TablaRegistros.module.css';

export function EncabezadoTabla({ title, icon: Icono, onAdd, addLabel = 'registro' }) {
    return (
        <div className={classes.unifiedHeader}>
            <Group gap="sm" align="center">
                {Icono && (
                    <>
                        <Icono
                            size={38}
                            stroke={1.8}
                            color="var(--mantine-color-secondary-6)"
                        />
                        <Divider orientation="vertical" color="secondary.9" size="2" />
                    </>
                )}
                <Title order={2} className={classes.unifiedTitle}>
                    {title}
                </Title>
            </Group>
            {onAdd && (
                <ActionIcon
                    className={classes.addButtonUnified}
                    onClick={onAdd}
                    aria-label={`Agregar ${addLabel}`}
                    size={42}
                    radius="xl"
                    color="apex"
                    variant="filled"
                >
                    <IconPlus size={20} stroke={2.5} />
                </ActionIcon>
            )}
        </div>
    );
}

function TablaSkeleton({ columnCount }) {
    return (
        <div className={classes.skeleton} aria-label="Cargando registros">
            <div className={classes.skeletonToolbar}>
                <Skeleton height={14} width={120} />
                <Skeleton height={30} width={190} />
            </div>
            <div className={classes.skeletonHeader}>
                {Array.from({ length: columnCount }).map((_, index) => (
                    <Skeleton key={`header-${index}`} height={12} />
                ))}
            </div>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div className={classes.skeletonRow} key={`row-${rowIndex}`}>
                    {Array.from({ length: columnCount }).map((__, cellIndex) => (
                        <Skeleton key={`cell-${rowIndex}-${cellIndex}`} height={14} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function TablaRegistros({
    data,
    columns,
    onEditar,
    onEliminar,
    renderAcciones,
    onReload,
    pageSizeOptions,
    loading = false,
    entityLabel = 'registro',
    initialSortBy,
    initialSortDirection,
    headerVariant = 'classic',
    title,
    icon,
    onAdd,
    addLabel,
}) {
    return (
        <div className={classes.frame} aria-busy={loading}>
            {title && <EncabezadoTabla title={title} icon={icon} onAdd={onAdd} addLabel={addLabel} />}
            {loading ? (
                <TablaSkeleton columnCount={columns.length + (onEditar || onEliminar || renderAcciones ? 1 : 0)} />
            ) : (
                <TableSort
                    data={data}
                    columns={columns}
                    onEditar={onEditar}
                    onEliminar={onEliminar}
                    renderAcciones={renderAcciones}
                    enableSelection={false}
                    pageSizeOptions={pageSizeOptions}
                    entityLabel={entityLabel}
                    onReload={onReload}
                    initialSortBy={initialSortBy}
                    initialSortDirection={initialSortDirection}
                    headerVariant={headerVariant}
                />
            )}
        </div>
    );
}
