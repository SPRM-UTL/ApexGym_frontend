import { Modal,Text } from '@mantine/core';
import classes from './Modal.module.css';
import { useState } from 'react';

export function ModalCrud({abierto, setAbierto, contenido: Contenido, titulo}) {
    const cerrar = () => {
        setAbierto(false)
    }

    return (
        <Modal
            className={classes.modal}
            opened={abierto}
            onClose={() => cerrar()}
            title={titulo}
            zIndex={9999}
            withinPortal
            centered
        >
            <Contenido/>
        </Modal>
    )
}