let solicitudesActivas = 0;
let visible = false;
let temporizadorMostrar = null;
let temporizadorOcultar = null;
const suscriptores = new Set();

const retraso = 500;

const notificar = () => {
    suscriptores.forEach((suscriptor) => suscriptor());
};

export const apiLoadingStore = {
    iniciar() {
        solicitudesActivas += 1;

        if (temporizadorOcultar) {
            clearTimeout(temporizadorOcultar);
            temporizadorOcultar = null;
        }

        if (solicitudesActivas === 1 && !visible && !temporizadorMostrar) {
            temporizadorMostrar = setTimeout(() => {
                temporizadorMostrar = null;
                if (solicitudesActivas > 0) {
                    visible = true;
                    notificar();
                }
            }, retraso);
        }
    },

    finalizar() {
        solicitudesActivas = Math.max(0, solicitudesActivas - 1);

        if (solicitudesActivas > 0 || !visible) {
            if (solicitudesActivas === 0 && temporizadorMostrar) {
                clearTimeout(temporizadorMostrar);
                temporizadorMostrar = null;
            }
            return;
        }

        temporizadorOcultar = setTimeout(() => {
            temporizadorOcultar = null;
            if (solicitudesActivas === 0) {
                visible = false;
                notificar();
            }
        }, retraso);
    },

    suscribirse(suscriptor) {
        suscriptores.add(suscriptor);
        return () => suscriptores.delete(suscriptor);
    },

    obtenerEstado() {
        return visible;
    },
};
