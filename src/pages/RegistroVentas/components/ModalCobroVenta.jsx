import {
    Alert,
    Button,
    Group,
    Loader,
    Modal,
    NumberFormatter,
    NumberInput,
    Pagination,
    Select,
    Stack,
    Text,
} from '@mantine/core';
import { IconCash, IconCreditCard, IconUser } from '@tabler/icons-react';
import { redondear } from '../utils/venta.utils.js';

export function ModalCobroVenta({
    opened,
    onClose,
    asignacionValida,
    clientes,
    clienteSeleccionado,
    clienteId,
    busquedaCliente,
    onBusquedaClienteChange,
    onClienteChange,
    totalClientes,
    paginaClientes,
    totalPaginasClientes,
    onPaginaClientesChange,
    cargandoClientes,
    errorClientes,
    metodosPago,
    metodoPago,
    onMetodoPagoChange,
    total,
    montoRecibido,
    onMontoRecibidoChange,
    esPagoEfectivo,
    cambio,
    cobrando,
    onConfirm,
}) {
    const opcionesClientes = clienteSeleccionado
        && !clientes.some((cliente) => String(cliente.id) === String(clienteSeleccionado.id))
        ? [clienteSeleccionado, ...clientes]
        : clientes;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Cobrar venta"
            centered
            size="md"
            zIndex={1300}
            closeOnClickOutside={!cobrando}
            closeOnEscape={!cobrando}
        >
            <Stack>
                {!asignacionValida && (
                    <Alert color="red" title="Faltan datos para completar la venta">
                        Necesitas una caja abierta asignada para registrar esta venta.
                    </Alert>
                )}
                <Select
                    label={<span><IconUser size={17} /> Cliente</span>}
                    placeholder="Buscar cliente por nombre, apellidos o ID"
                    searchable
                    searchValue={busquedaCliente}
                    onSearchChange={onBusquedaClienteChange}
                    nothingFoundMessage={errorClientes || (busquedaCliente.length >= 2 ? 'No se encontraron clientes' : 'Escribe al menos 2 caracteres o un ID')}
                    rightSection={cargandoClientes ? <Loader size="xs" /> : undefined}
                    value={clienteId}
                    onChange={onClienteChange}
                    filter={({ options }) => options}
                    comboboxProps={{ zIndex: 1400 }}
                    data={opcionesClientes.map((cliente) => ({
                        value: String(cliente.id),
                        label: [cliente.nombre, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(' '),
                    }))}
                />
                {busquedaCliente.trim() && (
                    <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                            {cargandoClientes ? 'Buscando clientes…' : `${totalClientes} resultado(s)`}
                        </Text>
                        {totalPaginasClientes > 1 && (
                            <Pagination
                                size="xs"
                                value={paginaClientes}
                                total={totalPaginasClientes}
                                onChange={onPaginaClientesChange}
                                disabled={cargandoClientes}
                            />
                        )}
                    </Group>
                )}
                <Select
                    label={<span><IconCreditCard size={17} /> Método de pago</span>}
                    placeholder="Selecciona método de pago"
                    disabled={metodosPago.length === 0}
                    value={metodoPago}
                    onChange={onMetodoPagoChange}
                    comboboxProps={{ zIndex: 1400 }}
                    data={metodosPago.map((metodo) => ({
                        value: String(metodo.id),
                        label: metodo.nombre,
                    }))}
                />
                <Group justify="space-between">
                    <Text fw={700}>Total a pagar</Text>
                    <Text fw={800} size="xl" c="green">
                        <NumberFormatter prefix="$" value={total} thousandSeparator decimalScale={2} fixedDecimalScale />
                    </Text>
                </Group>
                {esPagoEfectivo && (
                    <>
                        <NumberInput
                            label="Monto recibido"
                            prefix="$"
                            min={0}
                            decimalScale={2}
                            fixedDecimalScale
                            value={montoRecibido}
                            onChange={onMontoRecibidoChange}
                            thousandSeparator="," 
                        />
                    <Group gap="xs">
                        <Button variant="light" onClick={() => onMontoRecibidoChange(total)}>
                            Exacto
                        </Button>
                        {[50, 100, 200].map((extra) => (
                            <Button
                                key={extra}
                                variant="light"
                                onClick={() => onMontoRecibidoChange(redondear(total + extra))}
                            >
                                +${extra}
                            </Button>
                        ))}
                    </Group>
                        <Group justify="space-between">
                            <Text fw={700}>Cambio</Text>
                            <Text fw={800} size="lg">
                                <NumberFormatter prefix="$" value={cambio} thousandSeparator decimalScale={2} fixedDecimalScale />
                            </Text>
                        </Group>
                    </>
                )}
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} disabled={cobrando}>
                        Volver
                    </Button>
                    <Button
                        leftSection={<IconCash size={18} />}
                        onClick={onConfirm}
                        loading={cobrando}
                        disabled={!asignacionValida || !metodoPago || !clienteId || (esPagoEfectivo && Number(montoRecibido || 0) < total)}
                    >
                        Confirmar venta
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
