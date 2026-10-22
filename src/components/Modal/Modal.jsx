import { Modal, Button, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import classes from './Modal.module.css';

export function ModalCrud({ abierto, setAbierto, contenido: Contenido, titulo }) {
    const cerrar = () => {
        setAbierto(false);
    };

    return (
        <Modal
            className={classes.modal}
            opened={abierto}
            onClose={cerrar}
            title={titulo}
            fullScreen
            radius={0}
            zIndex={999999}
            withinPortal
            transitionProps={{ transition: 'slide-up', duration: 200 }}
        >
            {/* Renderizamos el contenido pasando setAbierto por si quieren cerrar el modal desde adentro */}
            <Contenido setAbierto={setAbierto} />
        </Modal>
    );
}
