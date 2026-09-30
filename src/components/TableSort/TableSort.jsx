import { useEffect, useMemo, useState } from 'react';
import { BarraAcciones } from '../BarraAcciones/BarraAcciones.jsx';
import {
    ActionIcon, 
    Badge, 
    Button, 
    Center, 
    Checkbox, 
    CloseButton, 
    Group,
    NativeSelect, 
    Popover, 
    ScrollArea, 
    Select, 
    Stack, 
    Table, 
    Text,
    TextInput, 
    Tooltip, 
    UnstyledButton,
} from '@mantine/core';
import {
    IconReload,
    IconChevronDown, 
    IconChevronUp, 
    IconEdit, 
    IconFilter, 
    IconPlus,
    IconSelector, 
    IconTrash
} from '@tabler/icons-react';
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
    entityLabel = 'registro',
    onReload,
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

    /**Muestra o cierra el filtro */
    const [filterOpen, setFilterOpen] = useState(false);
    /**Guarda temporalmente los fultros usados */
    const [draftField, setDraftField] = useState(null);
    /**Guarda temporalmente el texto ingresado*/
    const[draftValue, setDraftValue] = useState('');

    /**useMemo(...) memoriza el resultado */
    const filterableColums = useMemo(
        () => columns.filter((c) => c.filterable !== false),
        [columns]
    );

    /**de esta manera obtenemos el identificador del selecionado de manera temporal */
    const draftColumn = filterableColums.find((c) => c.key === draftField);

    /**de esta manera entra a la funcion para filtrar el seleciondado */
    const draftOptions = useMemo(() => {
        //en el caso de que no sea el tipo de filtro de selecionado no hace nada
        if(draftColumn?.filterType !== 'select') return null;
        //recorre los datos de la tabla y extrae el valor correspondiente de la columna actual al mismo tiempo elimiina duplicados
        return [...new Set(data.map((r) => String(r[draftColumn.key] ?? '')).filtrer(Boolean))].sort();
    }, [data, draftColumn]);

    /**con la funcion permite asegurar que los filtros esten en textos y que se almacenen los filtros en un 
     en un arreglo en par clave - valor de cada filtro*/
    const activeFilters = Object.entries(columnFilters).filter(([,v]) => String(v ?? '').trim());

    /**De esta manera agregamos los filtros */
    const addFilter = () =>{
        /**si es que no hace nada o no hay nada para filtrar no hace nada */
        if(!draftField || !String(draftValue).trim()) return;
        //de esta manera actualizamos los filtros de manera recorrida
        setColumnFilters((prev) =>({ ...prev, [draftField]: String(draftValue).trim()}));
        //limpiamos los filtros
        setDraftField(null);
        setDraftValue('');
        setPage(1)
    }
    /**De esta manera recorremos para borrar todos los filtros de manera individual */
    const removeFilter = (key) => {
    setColumnFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
    });
    setPage(1);
};
/**Limpia de manera completa los filtros en todos */
const clearFilters = () => {
    setColumnFilters({});
    setPage(1);
};

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
                        placeholder={`Buscar ${entityLabel} ...`}
                        value={globalSearch}
                        onChange={(e) => {
                            setGlobalSearch(e.currentTarget.value);
                            setPage(1);
                        }}
                    />
                </Group>

                      <Popover
                opend={filterOpen}
                onChange={setFilterOpen}
                position="bottom-start"
                offset={8}
                width={320}
                shadow="lg"
                radius="md"
                trapFocus
                >

                        <Popover.Target>
                            <Button
                            variant="default"
                            size="sm"
                            radius="md"
                            className={classes.filterButton}
                            leftSection={<IconFilter size={16} stroke={1.6}/>}
                            rightSection={
                                activeFilters.length > 0 ? (
                                    <Badge size="xs" circle>
                                        {activeFilters.length}
                                    </Badge>
                                ):null
                            }
                            >

                            </Button>

                        </Popover.Target>
                        <Popover.Dropdown className={classes.popoverDropdown}>
                            <Stack gap="sm">
                                <Text className={classes.popoverTitle}>Filtrar por</Text>
                                <Select
                                label="Campo"
                                placeholder="Selecciona un campo"
                                size="xs"
                                searchable
                                data={filterableColums.map((c) => ({
                                    value: c.key,
                                    label: c.label,
                                }))}
                                value={draftField}
                                onChange={
                                    (v) => {
                                        setDraftField(v);
                                        setDraftValue('');
                                    }
                                }
                                comboboxProps={{withinPortal: false}}
                                />

                                


                                 {draftOptions ? (
                                    <Select
                                        label="Valor"
                                        placeholder="Selecciona un valor"
                                        size="xs"
                                        searchable
                                        data={draftOptions}
                                        value={draftValue || null}
                                        onChange={(v) => setDraftValue(v ?? '')}
                                        comboboxProps={{ withinPortal: false }}
                                    />
                                ) : (
                                    <TextInput
                                        label="Valor"
                                        placeholder={
                                            draftField ? 'Escribe el valor...' : 'Primero elige un campo'
                                        }
                                        size="xs"
                                        disabled={!draftField}
                                        value={draftValue}
                                        onChange={(e) => setDraftValue(e.currentTarget.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addFilter()}
                                    />
                                )}

                                <Group justify="space-between">
                                    <Button variant="subtle" size="xs" color="gray" onClick={clearFilters}>
                                        Borrar todos
                                    </Button>
                                    <Button
                                        size="xs"
                                        leftSection={<IconPlus size={14} />}
                                        disabled={!draftField || !String(draftValue).trim()}
                                        onClick={addFilter}
                                    >
                                        Agregar filtro
                                    </Button>
                                </Group>
                            </Stack>
                        </Popover.Dropdown>
                </Popover>
                
                            <Button
                            variant="default"
                            size="sm"
                            radius="md"
                            className={classes.filterButton}
                            onClick={onReload}
                            >
                                <IconReload size={18} stroke={1.8} />
                            </Button>
            </div>
            {activeFilters.length > 0 && (
    <div className={classes.activeFilters}>
        {activeFilters.map(([key, value]) => {
            const col = columns.find((c) => c.key === key);
            return (
                <Badge
                    key={key}
                    variant="light"
                    size="lg"
                    radius="sm"
                    className={classes.filterChip}
                    rightSection={
                        <CloseButton size="xs" aria-label="Quitar filtro" onClick={() => removeFilter(key)} />
                    }
                >
                    {col?.label ?? key}: {value}
                </Badge>
            );
        })}
        <UnstyledButton className={classes.clearAll} onClick={clearFilters}>
            Limpiar todo
        </UnstyledButton>
    </div>
)}
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
                            {/*
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
                        </Table.Tr>*/}
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
                                                        <Tooltip label={`Editar ${entityLabel}`} withArrow openDelay={250}>
                                                            <ActionIcon
                                                                variant="light"
                                                                size="lg"
                                                                aria-label={`Editar ${entityLabel}`}
                                                                className={classes.editAction}
                                                                onClick={() => onEditar(fila)}
                                                            >
                                                                <IconEdit size={20} stroke={1.8} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    {onEliminar && (
                                                        <Tooltip label={`Eliminar ${entityLabel}`} withArrow openDelay={250}>
                                                            <ActionIcon
                                                                variant="light"
                                                                size="lg"
                                                                aria-label={`Eliminar ${entityLabel}`}
                                                                className={classes.deleteAction}
                                                                onClick={() => onEliminar(fila)}
                                                            >
                                                                <IconTrash size={20} stroke={1.8} />
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
