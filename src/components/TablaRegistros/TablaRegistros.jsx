import { Skeleton } from '@mantine/core';
import { TableSort } from '../TableSort/TableSort.jsx';
import classes from './TablaRegistros.module.css';

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
    onReload,
    pageSizeOptions,
    loading = false,
    entityLabel = 'registro',
}) {
    return (
        <div className={classes.frame} aria-busy={loading}>
            <TableSort
                data={data}
                columns={columns}
                onEditar={onEditar}
                onEliminar={onEliminar}
                renderAcciones={renderAcciones}
                enableSelection={false}
                pageSizeOptions={pageSizeOptions}
                entityLabel={entityLabel}
                onReload={ onReload}
            />
            {loading && <TablaSkeleton columnCount={columns.length + (onEditar || onEliminar || renderAcciones ? 1 : 0)} />}
        </div>
    );
}
