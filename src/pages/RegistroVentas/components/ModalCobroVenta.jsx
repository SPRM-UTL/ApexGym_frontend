import {
    Alert,
    Button,
    Checkbox,
    Group,
    Loader,
    Modal,
    NumberFormatter,
    NumberInput,
    Pagination,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { IconCash, IconCreditCard, IconInfoCircle, IconReceipt2, IconUser } from '@tabler/icons-react';
import { redondear } from '../utils/venta.utils.js';

export function ModalCobroVenta({
    opened,
    onClose,
    asignacionValida,
    clientes,
    clienteDefault,
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
    datosTarjeta = { folioVoucher: '', tipoTarjeta: 'DEBITO', marcaTarjeta: 'VISA', ultimosDigitos: '' },
    onDatosTarjetaChange,
    datosTransferencia = { referencia: '', confirmada: false },
    onDatosTransferenciaChange,
    cobrando,
    onConfirm,
}) {
    const opcionesClientes = (() => {
        const lista = [...clientes];
        if (clienteDefault && !lista.some((c) => String(c.id) === String(clienteDefault.id))) {
            lista.unshift(clienteDefault);
        }
        if (clienteSeleccionado && !lista.some((c) => String(c.id) === String(clienteSeleccionado.id))) {
            lista.unshift(clienteSeleccionado);
        }
        return lista;
    })();

    const metodoSeleccionado = metodosPago.find((item) => String(item.id) === String(metodoPago));
    const esEfectivo = esPagoEfectivo || metodoSeleccionado?.codigo === 'EFECTIVO';
    const esTarjeta = metodoSeleccionado?.codigo === 'TARJETA';
    const esTransferencia = metodoSeleccionado?.codigo === 'TRANSFERENCIA';
    const esDigital = metodoSeleccionado?.codigo === 'MERCADO_PAGO';

    const efectivoValido = !esEfectivo || Number(montoRecibido || 0) >= total;

    const puedeConfirmar = asignacionValida
        && Boolean(metodoPago)
        && Boolean(clienteId)
        && efectivoValido;

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
                {esEfectivo && (
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
                {esTarjeta && (
                    <Stack gap="xs">
                        <Alert
                            icon={<IconReceipt2 size={18} />}
                            color="blue"
                            variant="light"
                            title="Terminal física / Voucher (Opcional)"
                        >
                            Desliza o inserta la tarjeta en la terminal física. Puedes registrar el folio o últimos dígitos del voucher si deseas guardarlos para control.
                        </Alert>
                        <TextInput
                            label="Folio / Autorización del voucher (opcional)"
                            placeholder="Ej. 123456 o AUTH-098"
                            value={datosTarjeta?.folioVoucher ?? ''}
                            onChange={(e) => onDatosTarjetaChange?.({
                                ...datosTarjeta,
                                folioVoucher: e.target.value,
                            })}
                        />
                        <Group grow>
                            <Select
                                label="Tipo de tarjeta"
                                data={[
                                    { value: 'DEBITO', label: 'Débito' },
                                    { value: 'CREDITO', label: 'Crédito' },
                                ]}
                                value={datosTarjeta?.tipoTarjeta ?? 'DEBITO'}
                                onChange={(val) => onDatosTarjetaChange?.({
                                    ...datosTarjeta,
                                    tipoTarjeta: val || 'DEBITO',
                                })}
                                comboboxProps={{ zIndex: 1400 }}
                            />
                            <Select
                                label="Marca"
                                data={[
                                    { value: 'VISA', label: 'Visa' },
                                    { value: 'MASTERCARD', label: 'Mastercard' },
                                    { value: 'AMEX', label: 'American Express' },
                                    { value: 'CARNET', label: 'Carnet' },
                                    { value: 'OTRA', label: 'Otra' },
                                ]}
                                value={datosTarjeta?.marcaTarjeta ?? 'VISA'}
                                onChange={(val) => onDatosTarjetaChange?.({
                                    ...datosTarjeta,
                                    marcaTarjeta: val || 'VISA',
                                })}
                                comboboxProps={{ zIndex: 1400 }}
                            />
                        </Group>
                        <TextInput
                            label="Últimos 4 dígitos de la tarjeta (opcional)"
                            placeholder="Ej. 1234"
                            maxLength={4}
                            value={datosTarjeta?.ultimosDigitos ?? ''}
                            onChange={(e) => {
                                const soloNums = e.target.value.replace(/\D/g, '').slice(0, 4);
                                onDatosTarjetaChange?.({
                                    ...datosTarjeta,
                                    ultimosDigitos: soloNums,
                                });
                            }}
                        />
                    </Stack>
                )}
                {esTransferencia && (
                    <Stack gap="xs">
                        <Alert
                            icon={<IconInfoCircle size={18} />}
                            color="cyan"
                            variant="light"
                            title="Cobro por Transferencia (Quedará Pendiente)"
                        >
                            Esta venta se registrará inmediatamente y el movimiento de caja quedará con estado <strong>PENDIENTE</strong> para su posterior validación en el módulo de Movimientos de Caja.
                        </Alert>
                        <TextInput
                            label="Clave de rastreo o referencia bancaria (opcional)"
                            placeholder="Ej. SPEI12345678 o número de autorización"
                            value={datosTransferencia?.referencia ?? ''}
                            onChange={(e) => onDatosTransferenciaChange?.({
                                ...datosTransferencia,
                                referencia: e.target.value,
                            })}
                        />
                    </Stack>
                )}
                {esDigital && (
                    <Alert
                        icon={<IconInfoCircle size={18} />}
                        color="grape"
                        variant="light"
                        title="Checkout Digital (Mercado Pago)"
                    >
                        Al confirmar se generará el enlace de pago de Mercado Pago para procesar la transacción.
                    </Alert>
                )}
                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose} disabled={cobrando}>
                        Volver
                    </Button>
                    <Button
                        leftSection={<IconCash size={18} />}
                        onClick={onConfirm}
                        loading={cobrando}
                        disabled={!puedeConfirmar}
                    >
                        Confirmar venta
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
