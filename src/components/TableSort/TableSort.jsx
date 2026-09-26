import { useEffect, useMemo, useState } from 'react';
import {
    IconChevronDown,
    IconChevronUp,
    IconEdit,
    IconSelector,
    IconTrash,
} from '@tabler/icons-react';
import {
    ActionIcon,
    Center,
    Checkbox,
    Group,
    NativeSelect,
    ScrollArea,
    Table,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import classes from './TableSort.module.css';

function Th({ children, reversed, sorted, onSort, sortable }) {
    if (!sortable) {
        return (
            <Table.Th className={classes.th}>
                <div className={classes.control}>
                    <Text className={classes.thLabel}>{children}</Text>
                </div>
            </Table.Th>
        );
    }

    const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;

    return (
        <Table.Th className={classes.th}>
            <UnstyledButton onClick={onSort} className={classes.control}>
                <Group justify="space-between" wrap="nowrap">
                    <Text className={classes.thLabel}>{children}</Text>
                    <Center className={classes.icon}>
                        <Icon size={14} stroke={1.5} />
                    </Center>
                </Group>
            </UnstyledButton>
        </Table.Th>
    );
}

function filterRows(data, columns, globalSearch, columnFilters) {
    const query = globalSearch.toLowerCase().trim();

    return data.filter((row) => {
        const matchGlobal =
            !query ||
            columns.some((col) =>
                String(row[col.key] ?? '')
                    .toLowerCase()
                    .includes(query)
            );

        if (!matchGlobal) return false;

        return columns.every((col) => {
            const filterValue = (columnFilters[col.key] ?? '').toLowerCase().trim();
            if (!filterValue) return true;
            return String(row[col.key] ?? '')
                .toLowerCase()
                .includes(filterValue);
        });
    });
}

function sortRows(data, sortBy, reversed, columns) {
    if (!sortBy) return data;

    const col = columns.find((c) => c.key === sortBy);
    if (!col?.sortable) return data;

    return [...data].sort((a, b) => {
        const valorA = String(a[sortBy] ?? '');
        const valorB = String(b[sortBy] ?? '');
        const comparacion = valorA.localeCompare(valorB, undefined, { numeric: true });
        return reversed ? -comparacion : comparacion;
    });
}

/**
 * Tabla CRUD estilo panel administrativo (orden, filtros, paginación, selección).
 *
 * @param {object} props
 * @param {Array} props.data
 * @param {Array<{ key: string, label: string, sortable?: boolean, filterable?: boolean }>} props.columns
 * @param {(row: object) => void} [props.onEditar]
 * @param {(row: object) => void} [props.onEliminar]
 * @param {boolean} [props.enableSelection]
 * @param {number[]} [props.pageSizeOptions]
 * @param {(rows: object[]) => void} [props.onSelectionChange]
 */
export function TableSort({
    data = [],
    columns: columnsProp,
    onEditar,
    onEliminar,
    enableSelection = true,
    pageSizeOptions = [10, 25, 50, 100],
    onSelectionChange,
}) {
    const columns = useMemo(() => {
        if (columnsProp?.length) return columnsProp;
        if (data.length === 0) return [];
        return Object.keys(data[0]).map((key) => ({
            key,
            label: key.toUpperCase(),
            sortable: true,
            filterable: true,
        }));
    }, [columnsProp, data]);

    const [globalSearch, setGlobalSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [sortBy, setSortBy] = useState(columns[0]?.key ?? null);
    const [reverseSortDirection, setReverseSortDirection] = useState(false);
    const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const processed = useMemo(() => {
        const filtered = filterRows(data, columns, globalSearch, columnFilters);
        return sortRows(filtered, sortBy, reverseSortDirection, columns);
    }, [data, columns, globalSearch, columnFilters, sortBy, reverseSortDirection]);

    const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const pageRows = processed.slice(pageStart, pageStart + pageSize);

    const rowId = (row, index) => row.id ?? index;

    useEffect(() => {
        if (!onSelectionChange) return;
        const seleccionados = data.filter((row, index) =>
            selectedIds.has(rowId(row, index))
        );
        onSelectionChange(seleccionados);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- rowId estable por fila
    }, [selectedIds, data, onSelectionChange]);

    const toggleRow = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllOnPage = () => {
        const idsOnPage = pageRows.map((row, i) => rowId(row, pageStart + i));
        const allSelected = idsOnPage.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                idsOnPage.forEach((id) => next.delete(id));
            } else {
                idsOnPage.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const setSorting = (field) => {
        const reversed = field === sortBy ? !reverseSortDirection : false;
        setReverseSortDirection(reversed);
        setSortBy(field);
    };

    const updateColumnFilter = (key, value) => {
        setColumnFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const idsOnPage = pageRows.map((row, i) => rowId(row, pageStart + i));
    const allPageSelected = idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.has(id));
    const somePageSelected = idsOnPage.some((id) => selectedIds.has(id));

    return (
        <div className={classes.wrapper}>
            <div className={classes.tableControls}>
                <Group gap="xs">
                    <Text className={classes.controlLabel}>Mostrar</Text>
                    <NativeSelect
                        size="xs"
                        value={String(pageSize)}
                        onChange={(e) => {
                            setPageSize(Number(e.currentTarget.value));
                            setPage(1);
                        }}
                        data={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
                    />
                    <Text className={classes.controlLabel}>registros</Text>
                </Group>

                <Group gap="xs">
                    <Text className={classes.controlLabel}>Buscar:</Text>
                    <TextInput
                        className={classes.searchInput}
                        size="xs"
                        placeholder=""
                        value={globalSearch}
                        onChange={(e) => {
                            setGlobalSearch(e.currentTarget.value);
                            setPage(1);
                        }}
                    />
                </Group>
            </div>

            <ScrollArea className={classes.scroll}>
                <Table className={classes.table} horizontalSpacing="md" verticalSpacing={0} striped={false}>
                    <Table.Thead>
                        <Table.Tr>
                            {enableSelection && (
                                <Table.Th className={classes.th} style={{ width: 44 }}>
                                    <div className={classes.control}>
                                        <Checkbox
                                            checked={allPageSelected}
                                            indeterminate={somePageSelected && !allPageSelected}
                                            onChange={toggleAllOnPage}
                                            size="xs"
                                        />
                                    </div>
                                </Table.Th>
                            )}
                            {columns.map((col) => (
                                <Th
                                    key={col.key}
                                    sorted={sortBy === col.key}
                                    reversed={reverseSortDirection}
                                    onSort={() => setSorting(col.key)}
                                    sortable={col.sortable !== false}
                                >
                                    {col.label}
                                </Th>
                            ))}
                            {(onEditar || onEliminar) && (
                                <Table.Th className={classes.th}>
                                    <div className={classes.control}>
                                        <Text className={classes.thLabel}>Acciones</Text>
                                    </div>
                                </Table.Th>
                            )}
                        </Table.Tr>

                        <Table.Tr className={classes.filterRow}>
                            {enableSelection && <Table.Th className={classes.filterCell} />}
                            {columns.map((col) => (
                                <Table.Th key={`filter-${col.key}`} className={classes.filterCell}>
                                    {col.filterable !== false ? (
                                        <TextInput
                                            className={classes.filterInput}
                                            size="xs"
                                            placeholder=""
                                            value={columnFilters[col.key] ?? ''}
                                            onChange={(e) =>
                                                updateColumnFilter(col.key, e.currentTarget.value)
                                            }
                                        />
                                    ) : null}
                                </Table.Th>
                            ))}
                            {(onEditar || onEliminar) && <Table.Th className={classes.filterCell} />}
                        </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                        {pageRows.length > 0 ? (
                            pageRows.map((fila, index) => {
                                const absoluteIndex = pageStart + index;
                                const id = rowId(fila, absoluteIndex);
                                const selected = selectedIds.has(id);

                                return (
                                    <Table.Tr
                                        key={id}
                                        className={classes.bodyRow}
                                        data-selected={selected || undefined}
                                    >
                                        {enableSelection && (
                                            <Table.Td className={classes.bodyCell}>
                                                <Checkbox
                                                    checked={selected}
                                                    onChange={() => toggleRow(id)}
                                                    size="xs"
                                                />
                                            </Table.Td>
                                        )}
                                        {columns.map((col) => (
                                            <Table.Td key={col.key} className={classes.bodyCell}>
                                                {String(fila[col.key] ?? '')}
                                            </Table.Td>
                                        ))}
                                        {(onEditar || onEliminar) && (
                                            <Table.Td className={`${classes.bodyCell} ${classes.actionsCell}`}>
                                                <Group gap={6} wrap="nowrap">
                                                    {onEditar && (
                                                        <Tooltip label="Editar">
                                                            <ActionIcon
                                                                variant="light"
                                                                size="sm"
                                                                className={classes.editAction}
                                                                onClick={() => onEditar(fila)}
                                                            >
                                                                <IconEdit size={16} stroke={1.5} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    {onEliminar && (
                                                        <Tooltip label="Eliminar">
                                                            <ActionIcon
                                                                variant="subtle"
                                                                size="sm"
                                                                className={classes.deleteAction}
                                                                onClick={() => onEliminar(fila)}
                                                            >
                                                                <IconTrash size={16} stroke={1.5} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                );
                            })
                        ) : (
                            <Table.Tr>
                                <Table.Td
                                    colSpan={
                                        columns.length +
                                        (enableSelection ? 1 : 0) +
                                        (onEditar || onEliminar ? 1 : 0)
                                    }
                                    className={classes.emptyCell}
                                >
                                    No se encontraron resultados
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>

            <div className={classes.footer}>
                <span>
                    Mostrando {processed.length === 0 ? 0 : pageStart + 1}–
                    {Math.min(pageStart + pageSize, processed.length)} de {processed.length} registros
                </span>
                <Group gap="xs">
                    <UnstyledButton
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
                    >
                        Anterior
                    </UnstyledButton>
                    <span>
                        Página {currentPage} / {totalPages}
                    </span>
                    <UnstyledButton
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
                    >
                        Siguiente
                    </UnstyledButton>
                </Group>
            </div>
        </div>
    );
}

export { TableSort as default };
