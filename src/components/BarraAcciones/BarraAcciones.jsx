import { Button } from '@mantine/core';
import { IconPlus, IconReload } from '@tabler/icons-react';
import classes from './BarraAcciones.module.css';

export function BarraAcciones({ onAdd, onReload, entityLabel = 'registros' }) {
    return (
        <div className={classes.toolbar}>
            <Button className={classes.addButton} onClick={onAdd} aria-label={`Agregar ${entityLabel}`}>
                <IconPlus size={16} stroke={2} />
            </Button>
            <Button
                className={classes.reloadButton}
                px="sm"
                aria-label={`Recargar ${entityLabel}`}
                onClick={onReload}
            >
                <IconReload size={18} stroke={1.8} />
            </Button>
        </div>
    );
}
