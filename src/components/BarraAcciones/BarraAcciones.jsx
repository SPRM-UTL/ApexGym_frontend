import { Button, Text } from '@mantine/core';
import { IconPlus, IconUser } from '@tabler/icons-react';
import classes from './BarraAcciones.module.css';

export function BarraAcciones({ onAdd, title, entityLabel = 'registros' }) {
    return (
        <div className={classes.toolbar}>
            <div className={classes.leftGroup}>
                <div className={classes.iconBox}>
                    
                    <IconUser size={22} stroke={2} />
                </div>
                <Text size="lg" fw={700}>
                    {title}
                </Text>
            </div>

            <Button 
                className={classes.addButton} 
                onClick={onAdd} 
                aria-label={`Agregar ${entityLabel}`}
                leftSection={<IconPlus size={16} stroke={2} />}
            >
                Agregar
            </Button>
        </div>
    );
}