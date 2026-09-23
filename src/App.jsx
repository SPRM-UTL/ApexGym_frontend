import { Button, Title, Stack } from '@mantine/core';

export default function App() {
  return (
    <Stack p="md" gap="md">
      <Title order={1}>ApexGym</Title>
      <Button variant="filled" color="blue">
        Botón Mantine de prueba
      </Button>
    </Stack>
  );
}