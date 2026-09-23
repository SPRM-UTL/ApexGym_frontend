import { Loader } from '@mantine/core';

export function PantallaCarga() {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999
        }}>
            <Loader color="blue" size="xl" type="bars" />
        </div>
    );
}

export default PantallaCarga;
