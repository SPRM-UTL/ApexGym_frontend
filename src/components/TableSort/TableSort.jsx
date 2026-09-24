import { useState } from 'react';

import {
    IconChevronDown,
    IconChevronUp,
    IconSearch,
    IconSelector,
    IconEdit,
    IconTrash
} from '@tabler/icons-react';

import {
    ActionIcon,
    Center,
    Group,
    ScrollArea,
    Table,
    Text,
    TextInput,
    UnstyledButton,
    Tooltip
} from '@mantine/core';

import classes from './TableSort.module.css';


function Th({ children, reversed, sorted, onSort }) {

    const Icon = sorted
        ? (reversed ? IconChevronUp : IconChevronDown)
        : IconSelector;

    return (
        <Table.Th className={classes.th}>
            <UnstyledButton
                onClick={onSort}
                className={classes.control}
            >
                <Group justify="space-between">

                    <Text fw={500} fz="sm">
                        {children}
                    </Text>

                    <Center className={classes.icon}>
                        <Icon size={16} stroke={1.5} />
                    </Center>

                </Group>
            </UnstyledButton>
        </Table.Th>
    );
}


function filterData(data, search) {

    const query = search.toLowerCase().trim();

    if (!query) {
        return data;
    }

    return data.filter((item) =>
        Object.values(item).some((value) =>
            String(value).toLowerCase().includes(query)
        )
    );
}


function sortData(data, payload) {

    const { sortBy } = payload;

    let resultado = [...data];

    if (sortBy) {

        resultado.sort((a, b) => {

            const valorA = String(a[sortBy]);
            const valorB = String(b[sortBy]);

            const comparacion = valorA.localeCompare(
                valorB,
                undefined,
                { numeric: true }
            );

            return payload.reversed
                ? -comparacion
                : comparacion;
        });
    }

    return filterData(resultado, payload.search);
}


export function TableSort({
    data = [],
    onEditar,
    onEliminar
}) {

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState(null);
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const columnas = data.length > 0
        ? Object.keys(data[0])
        : [];


    const datosOrdenados = sortData(data, {
        sortBy,
        reversed: reverseSortDirection,
        search
    });


    const setSorting = (field) => {

        const reversed =
            field === sortBy
                ? !reverseSortDirection
                : false;

        setReverseSortDirection(reversed);
        setSortBy(field);
    };


    const handleSearchChange = (event) => {

        setSearch(event.currentTarget.value);
    };


    return (
        <div>

            <TextInput
                placeholder="Buscar..."
                mb="md"
                leftSection={
                    <IconSearch
                        size={16}
                        stroke={1.5}
                    />
                }
                value={search}
                onChange={handleSearchChange}
            />


            <Table
                horizontalSpacing="md"
                verticalSpacing="xs"
                miw={700}
                layout="fixed"
            >

                <Table.Thead>

                    <Table.Tr>

                        {columnas.map((columna) => (

                            <Th
                                key={columna}
                                sorted={sortBy === columna}
                                reversed={reverseSortDirection}
                                onSort={() => setSorting(columna)}
                            >
                                {columna}
                            </Th>

                        ))}


                        <Table.Th>
                            Acciones
                        </Table.Th>

                    </Table.Tr>

                </Table.Thead>


                <Table.Tbody>

                    {datosOrdenados.length > 0 ? (

                        datosOrdenados.map((fila, index) => (

                            <Table.Tr key={index}>

                                {columnas.map((columna) => (

                                    <Table.Td key={columna}>
                                        {String(fila[columna])}
                                    </Table.Td>

                                ))}


                                <Table.Td>

                                    <Group gap="xs">

                                        {onEditar && (
                                            <Tooltip label="Editar">

                                                <ActionIcon
                                                    variant="subtle"
                                                    color="blue"
                                                    onClick={() => onEditar(fila)}
                                                >
                                                    <IconEdit
                                                        size={18}
                                                    />
                                                </ActionIcon>

                                            </Tooltip>
                                        )}


                                        {onEliminar && (
                                            <Tooltip label="Eliminar">

                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => onEliminar(fila)}
                                                >
                                                    <IconTrash
                                                        size={18}
                                                    />
                                                </ActionIcon>

                                            </Tooltip>
                                        )}

                                    </Group>

                                </Table.Td>

                            </Table.Tr>

                        ))

                    ) : (

                        <Table.Tr>

                            <Table.Td
                                colSpan={columnas.length + 1}
                            >

                                <Text
                                    fw={500}
                                    ta="center"
                                >
                                    No se encontraron resultados
                                </Text>

                            </Table.Td>

                        </Table.Tr>

                    )}

                </Table.Tbody>

            </Table>

        </div>
    );
}