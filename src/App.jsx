import '@mantine/core/styles.css';
import { MantineProvider, Button } from '@mantine/core';

export default function App() {
  return (
    <MantineProvider>
      <div style={{ padding: 20 }}>
        <h1>ApexGym</h1>
        <Button variant="filled" color="blue">
          Botón Mantine de prueba
        </Button>
      </div>
    </MantineProvider>
  );
}