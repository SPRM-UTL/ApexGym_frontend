import { useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Badge,
    Button,
    Center,
    Checkbox,
    CloseButton,
    Divider,
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
    IconSelector,
    IconTrash
} from '@tabler/icons-react';
import { obtenerDiaCalendario } from './dateFilterUtils.js';
import classes from './TableSort.module.css';

function Th({ children, reversed, sorted, onSort, sortable, isNeutral }) {
    if (!sortable) {
        return (
            <Table.Th className={isNeutral ? classes.thNeutral : classes.th}>
                <div className={isNeutral ? classes.controlNeutral : classes.control}>
                    <Text className={isNeutral ? classes.thLabelNeutral : classes.thLabel}>{children}</Text>
                </div>
            </Table.Th>
        );
    }

    const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;

    return (
        <Table.Th className={isNeutral ? classes.thNeutral : classes.th}>
            <UnstyledButton onClick={onSort} className={isNeutral ? classes.controlNeutral : classes.control}>
                <Group justify="space-between" wrap="nowrap">
                    <Text className={isNeutral ? classes.thLabelNeutral : classes.thLabel}>{children}</Text>
                    <Center className={isNeutral ? classes.iconNeutral : classes.icon}>
                        <Icon size={14} stroke={1.5} />
                    </Center>
                </Group>
            </UnstyledButton>
        </Table.Th>
    );
}

function getCellString(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        return String(val);
    }
    if (Array.isArray(val)) {
        return val.map(getCellString).join(' ');
    }
    if (typeof val === 'object') {
        if (val.props && val.props.children !== undefined) {
            return getCellString(val.props.children);
        }
        if (typeof val.toString === 'function') {
            const s = val.toString();
            if (s && s !== '[object Object]') return s;
        }
    }
    return '';
}

function renderCellValue(value, column) {
    if (value === null || value === undefined || value === '') return '—';

    switch (column.format) {
        case 'folio':
            return (
                <Badge variant="light" color="gray" size="sm" radius="sm">
                    #{value}
                </Badge>
            );
        case 'number': {
            const number = Number(value);
            return Number.isFinite(number)
                ? new Intl.NumberFormat('es-MX').format(number)
                : String(value);
        }
        case 'currency': {
            const amount = Number(value);
            return Number.isFinite(amount)
                ? new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: column.currency ?? 'MXN',
                }).format(amount)
                : String(value);
        }
        case 'date': {
            const date = value instanceof Date ? value : new Date(value);
            return Number.isNaN(date.getTime())
                ? String(value)
                : new Intl.DateTimeFormat('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }).format(date);
        }
        case 'status': {
            const label = String(value);
            const color = column.colorByValue?.[label]
                ?? (['ABIERTA', 'ACTIVO', 'ACTIVA', 'VALIDADO', 'PAGADO', 'COMPLETADO'].includes(label.toUpperCase())
                    ? 'green'
                    : ['CERRADA', 'INACTIVO', 'INACTIVA', 'CANCELADO', 'CANCELADA', 'RECHAZADO'].includes(label.toUpperCase())
                        ? 'red'
                        : 'gray');
            return (
                <Badge color={color} variant="light" size="sm">
                    {label}
                </Badge>
            );
        }
        default:
            return typeof value === 'object' && value !== null
                ? value
                : String(value);
    }
}

const COLUMN_FILTER_PREFIX = 'column:';
const CONFIGURED_FILTER_PREFIX = 'configured:';
const EMPTY_CONFIGURED_FILTERS = [];

const obtenerValorFiltro = (filter, row) => {
    const record = row._recordOriginal ?? row;
    return filter.getValue ? filter.getValue(record) : record[filter.key] ?? row[filter.key];
};

const filtroConfiguradoActivo = (filter, value) => {
    if (filter.type === 'dateRange') {
        return Boolean(value?.[filter.from ?? 'from'] || value?.[filter.to ?? 'to']);
    }
    return value !== undefined && value !== null && String(value).trim() !== '';
};

function coincideFiltroConfigurado(filter, value, row) {
    if (!filtroConfiguradoActivo(filter, value)) return true;

    const rawValue = obtenerValorFiltro(filter, row);
    if (filter.type === 'text') {
        return String(rawValue ?? '')
            .toLocaleLowerCase()
            .includes(String(value).trim().toLocaleLowerCase());
    }
    if (filter.type === 'select') {
        const normalizar = filter.normalizeValue ?? ((item) => String(item ?? '').toLocaleLowerCase());
        return normalizar(rawValue) === normalizar(value);
    }

    const dia = obtenerDiaCalendario(rawValue);
    if (!dia) return false;
    if (filter.type === 'date') {
        return dia === value;
    }
    if (filter.type === 'dateRange') {
        const desde = value?.[filter.from ?? 'from'];
        const hasta = value?.[filter.to ?? 'to'];
        return (!desde || dia >= desde) && (!hasta || dia <= hasta);
    }
    return true;
}

function filterRows(data, columns, globalSearch, filters, configuredFilters) {
    const query = globalSearch.toLowerCase().trim();

    return data.filter((row) => {
        const matchGlobal =
            !query ||
            columns.some((col) =>
                getCellString(row[col.key])
                    .toLowerCase()
                    .includes(query)
            );

        if (!matchGlobal) return false;

        return columns.every((col) => {
            const filterValue = (filters[`${COLUMN_FILTER_PREFIX}${col.key}`] ?? '').toLowerCase().trim();
            if (!filterValue) return true;
            return getCellString(row[col.key])
                .toLowerCase()
                .includes(filterValue);
        }) && configuredFilters.every((filter) =>
            coincideFiltroConfigurado(
                filter,
                filters[`${CONFIGURED_FILTER_PREFIX}${filter.key}`],
                row
            )
        );
    });
}

function sortRows(data, sortBy, reversed, columns) {
    if (!sortBy) return data;

    if (sortBy === 'id') {
        return [...data].sort((a, b) => {
            const idA = Number(a._recordOriginal?.id ?? a.id ?? 0);
            const idB = Number(b._recordOriginal?.id ?? b.id ?? 0);
            return reversed ? idB - idA : idA - idB;
        });
    }

    const col = columns.find((c) => c.key === sortBy);
    if (!col?.sortable) return data;

    return [...data].sort((a, b) => {
        if (sortBy === 'numero') {
            const idA = Number(a._recordOriginal?.id ?? a.id ?? 0);
            const idB = Number(b._recordOriginal?.id ?? b.id ?? 0);
            return reversed ? idB - idA : idA - idB;
        }
        const rawA = a._recordOriginal?.[sortBy] ?? a[sortBy];
        const rawB = b._recordOriginal?.[sortBy] ?? b[sortBy];

        const dateA = rawA instanceof Date ? rawA.getTime() : (typeof rawA === 'string' && (rawA.includes('T') || (rawA.length === 10 && rawA.includes('-'))) ? Date.parse(rawA) : NaN);
        const dateB = rawB instanceof Date ? rawB.getTime() : (typeof rawB === 'string' && (rawB.length === 10 && rawB.includes('-') || rawB.includes('T')) ? Date.parse(rawB) : NaN);

        if (!isNaN(dateA) && !isNaN(dateB)) {
            const diff = dateA - dateB;
            return reversed ? -diff : diff;
        }

        const valorA = getCellString(a[sortBy]);
        const valorB = getCellString(b[sortBy]);
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
    renderAcciones,
    enableSelection = true,
    pageSizeOptions = [10, 25, 50, 100],
    onSelectionChange,
    entityLabel = 'registro',
    onReload,
    initialSortBy,
    initialSortDirection = 'asc',
    headerVariant = 'classic',
    filters: configuredFilters = EMPTY_CONFIGURED_FILTERS,
}) {
    const isNeutral = headerVariant === 'neutral';
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
    const [filterValues, setFilterValues] = useState({});
    const [draftConfiguredValues, setDraftConfiguredValues] = useState({});
    const [sortBy, setSortBy] = useState(() => initialSortBy ?? columns[0]?.key ?? null);
    const [reverseSortDirection, setReverseSortDirection] = useState(() => initialSortDirection === 'desc');
    const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState(() => new Set());


    /**Muestra o cierra el filtro */
    const [filterOpen, setFilterOpen] = useState(false);
    /**Guarda temporalmente los fultros usados */
    const [draftField, setDraftField] = useState(null);
    /**Guarda temporalmente el texto ingresado*/
    const [draftValue, setDraftValue] = useState('');

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
        if (draftColumn?.filterType !== 'select') return null;
        //recorre los datos de la tabla y extrae el valor correspondiente de la columna actual al mismo tiempo elimiina duplicados
        return [
            ...new Set(
                data
                    .map((r) => getCellString(r[draftColumn.key]))
                    .filter((v) => v.trim())
            ),
        ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data, draftColumn]);

    /**con la funcion permite asegurar que los filtros esten en textos y que se almacenen los filtros en un 
     en un arreglo en par clave - valor de cada filtro*/
    const activeFilters = Object.entries(filterValues).filter(([key, value]) => {
        if (key.startsWith(CONFIGURED_FILTER_PREFIX)) {
            const filter = configuredFilters.find(
                (item) => `${CONFIGURED_FILTER_PREFIX}${item.key}` === key
            );
            return filter ? filtroConfiguradoActivo(filter, value) : false;
        }
        return value !== undefined && value !== null && String(value).trim() !== '';
    });

    /**De esta manera recorremos para borrar todos los filtros de manera individual */
    const removeFilter = (key) => {
        setFilterValues((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setPage(1);
    };
    /**Limpia de manera completa los filtros en todos */
    const clearFilters = () => {
        setFilterValues({});
        setDraftConfiguredValues({});
        setDraftField(null);
        setDraftValue('');
        setPage(1);
    };

    const aplicarFiltros = () => {
        setFilterValues((previous) => {
            const next = { ...previous };
            configuredFilters.forEach((filter) => {
                const key = `${CONFIGURED_FILTER_PREFIX}${filter.key}`;
                const value = draftConfiguredValues[filter.key];
                if (filtroConfiguradoActivo(filter, value)) {
                    next[key] = value;
                } else {
                    delete next[key];
                }
            });
            if (draftField && String(draftValue).trim()) {
                next[`${COLUMN_FILTER_PREFIX}${draftField}`] = String(draftValue).trim();
            }
            return next;
        });
        setDraftField(null);
        setDraftValue('');
        setPage(1);
        setFilterOpen(false);
    };

    const abrirFiltros = (abierto) => {
        if (abierto) {
            setDraftConfiguredValues(Object.fromEntries(
                configuredFilters.map((filter) => [
                    filter.key,
                    filterValues[`${CONFIGURED_FILTER_PREFIX}${filter.key}`],
                ]).filter(([, value]) => value !== undefined)
            ));
        }
        setFilterOpen(abierto);
    };

    const obtenerResumenFiltro = (key, value) => {
        if (key.startsWith(CONFIGURED_FILTER_PREFIX)) {
            const filterKey = key.slice(CONFIGURED_FILTER_PREFIX.length);
            const filter = configuredFilters.find((item) => item.key === filterKey);
            if (!filter) return `${filterKey}: ${String(value)}`;
            if (filter.type === 'dateRange') {
                const desde = value?.[filter.from ?? 'from'];
                const hasta = value?.[filter.to ?? 'to'];
                return `${filter.label}: ${desde || '...'} — ${hasta || '...'}`;
            }
            if (filter.type === 'select') {
                const option = filter.options?.find(
                    (item) => String(item.value) === String(value)
                );
                return `${filter.label}: ${option?.label ?? value}`;
            }
            return `${filter.label}: ${String(value)}`;
        }

        const columnKey = key.slice(COLUMN_FILTER_PREFIX.length);
        const column = columns.find((item) => item.key === columnKey);
        return `${column?.label ?? columnKey}: ${String(value)}`;
    };

    const actualizarFiltroConfigurado = (filter, parte, value) => {
        setDraftConfiguredValues((previous) => {
            const actual = previous[filter.key];
            if (filter.type === 'dateRange') {
                return {
                    ...previous,
                    [filter.key]: { ...(actual ?? {}), [parte]: value },
                };
            }
            return { ...previous, [filter.key]: value };
        });
    };

    const processed = useMemo(() => {
        const filtered = filterRows(data, columns, globalSearch, filterValues, configuredFilters);
        return sortRows(filtered, sortBy, reverseSortDirection, columns);
    }, [data, columns, globalSearch, filterValues, configuredFilters, sortBy, reverseSortDirection]);

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
                    opened={filterOpen}
                    onChange={abrirFiltros}
                    position="bottom-start"
                    offset={8}
                    width={380}
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
                            aria-label="Filtrar registros"
                            onClick={() => abrirFiltros(!filterOpen)}
                        >
                            <Center style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <IconFilter size={16} stroke={1.8} />
                                {activeFilters.length > 0 && (
                                    <Badge size="xs" circle>
                                        {activeFilters.length}
                                    </Badge>
                                )}
                            </Center>
                        </Button>
                    </Popover.Target>
                    <Popover.Dropdown className={classes.popoverDropdown}>
                        <ScrollArea.Autosize mah="65vh" type="auto">
                            <Stack gap="sm" pr="xs">
                                {configuredFilters.length > 0 && (
                                    <Text className={classes.popoverTitle}>Filtros del módulo</Text>
                                )}
                                {configuredFilters.map((filter) => {
                                    const value = draftConfiguredValues[filter.key];
                                    const options = (filter.options ?? []).map((option) => ({
                                        value: String(option.value),
                                        label: option.label ?? String(option.value),
                                    }));

                                    if (filter.type === 'select') {
                                        return (
                                            <Select
                                                key={filter.key}
                                                label={filter.label}
                                                placeholder={filter.placeholder ?? `Todos: ${filter.label.toLowerCase()}`}
                                                size="xs"
                                                searchable
                                                clearable
                                                data={options}
                                                value={value == null || value === '' ? null : String(value)}
                                                onChange={(nextValue) => actualizarFiltroConfigurado(filter, null, nextValue ?? '')}
                                                comboboxProps={{ withinPortal: false }}
                                            />
                                        );
                                    }

                                    if (filter.type === 'dateRange') {
                                        const fromKey = filter.from ?? 'from';
                                        const toKey = filter.to ?? 'to';
                                        return (
                                            <Stack key={filter.key} gap={4}>
                                                <Text size="xs" fw={500}>{filter.label}</Text>
                                                <Group grow gap="xs">
                                                    <TextInput
                                                        label="Desde"
                                                        type="date"
                                                        size="xs"
                                                        value={value?.[fromKey] ?? ''}
                                                        onChange={(event) => actualizarFiltroConfigurado(filter, fromKey, event.currentTarget.value)}
                                                    />
                                                    <TextInput
                                                        label="Hasta"
                                                        type="date"
                                                        size="xs"
                                                        value={value?.[toKey] ?? ''}
                                                        onChange={(event) => actualizarFiltroConfigurado(filter, toKey, event.currentTarget.value)}
                                                    />
                                                </Group>
                                            </Stack>
                                        );
                                    }

                                    return (
                                        <TextInput
                                            key={filter.key}
                                            label={filter.label}
                                            type={filter.type === 'date' ? 'date' : 'text'}
                                            placeholder={filter.placeholder}
                                            size="xs"
                                            value={value ?? ''}
                                            onChange={(event) => actualizarFiltroConfigurado(filter, null, event.currentTarget.value)}
                                        />
                                    );
                                })}
                                {configuredFilters.length > 0 && <Divider />}
                                {configuredFilters.length > 0 && (
                                    <Text className={classes.popoverTitle}>Filtros por columna</Text>
                                )}
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
                                comboboxProps={{ withinPortal: false }}
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
                                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                />
                            )}

                            <Group justify="space-between">
                                <Button variant="subtle" size="xs" color="gray" onClick={clearFilters}>
                                    Borrar todos
                                </Button>
                                <Button size="xs" onClick={aplicarFiltros}>
                                    Aplicar filtros
                                </Button>
                            </Group>
                            </Stack>
                        </ScrollArea.Autosize>
                    </Popover.Dropdown>
                </Popover>

                <Button
                    variant="default"
                    size="sm"
                    radius="md"
                    className={classes.filterButton}
                    onClick={onReload}
                    aria-label="Recargar registros"
                >
                    <Center>
                        <IconReload size={18} stroke={1.8} />
                    </Center>
                </Button>
            </div>
            {activeFilters.length > 0 && (
                <div className={classes.activeFilters}>
                    {activeFilters.map(([key, value]) => {
                        const custom = key.startsWith(CONFIGURED_FILTER_PREFIX);
                        return (
                            <Badge
                                key={key}
                                variant="light"
                                size="lg"
                                radius="sm"
                                className={classes.filterChip}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    if (custom) {
                                        const filterKey = key.slice(CONFIGURED_FILTER_PREFIX.length);
                                        setDraftConfiguredValues((previous) => ({
                                            ...previous,
                                            [filterKey]: value,
                                        }));
                                    } else {
                                        setDraftField(key.slice(COLUMN_FILTER_PREFIX.length));
                                        setDraftValue(value);
                                    }
                                    abrirFiltros(true);
                                }}
                                rightSection={
                                    <CloseButton
                                        size="xs"
                                        aria-label="Quitar filtro"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFilter(key);
                                        }}
                                    />
                                }
                            >
                                {obtenerResumenFiltro(key, value)}
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
                                <Table.Th className={isNeutral ? classes.thNeutral : classes.th} style={{ width: 44 }}>
                                    <div className={isNeutral ? classes.controlNeutral : classes.control}>
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
                                    isNeutral={isNeutral}
                                >
                                    {col.label}
                                </Th>
                            ))}
                            {(onEditar || onEliminar || renderAcciones) && (
                                <Table.Th className={isNeutral ? classes.thNeutral : classes.th}>
                                    <div className={isNeutral ? classes.controlNeutral : classes.control}>
                                        <Text className={isNeutral ? classes.thLabelNeutral : classes.thLabel}>Acciones</Text>
                                    </div>
                                </Table.Th>
                            )}
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
                                                {renderCellValue(fila[col.key], col)}
                                            </Table.Td>
                                        ))}
                                        {(onEditar || onEliminar || renderAcciones) && (
                                            <Table.Td className={`${classes.bodyCell} ${classes.actionsCell}`}>
                                                <Group gap={6} wrap="nowrap">
                                                    {renderAcciones && renderAcciones(fila)}
                                                    {onEditar && (
                                                        <Tooltip label={`Editar ${entityLabel}`} withArrow openDelay={250}>
                                                            <ActionIcon
                                                                variant="light"
                                                                size="lg"
                                                                color="blue"
                                                                aria-label={`Editar ${entityLabel}`}
                                                                onClick={() => onEditar(fila)}
                                                            >
                                                                <IconEdit size={18} stroke={1.8} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                    {onEliminar && (
                                                        <Tooltip label={`Eliminar ${entityLabel}`} withArrow openDelay={250}>
                                                            <ActionIcon
                                                                variant="light"
                                                                size="lg"
                                                                color="red"
                                                                aria-label={`Eliminar ${entityLabel}`}
                                                                onClick={() => onEliminar(fila)}
                                                            >
                                                                <IconTrash size={18} stroke={1.8} />
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
                                        (onEditar || onEliminar || renderAcciones ? 1 : 0)
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
