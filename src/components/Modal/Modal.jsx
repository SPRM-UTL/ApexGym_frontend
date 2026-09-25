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
            zIndex={9999}
            withinPortal
            centered
        >
            {/* Renderizamos el contenido pasando setAbierto por si quieren cerrar el modal desde adentro */}
            <Contenido setAbierto={setAbierto} />
        </Modal>
    );
}
