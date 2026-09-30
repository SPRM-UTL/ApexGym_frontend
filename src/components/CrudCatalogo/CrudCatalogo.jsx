import { useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
    Button,
    Group,
    Modal,
    NativeSelect,
    NumberInput,
    Stack,
    Switch,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import { ModalConfirmacion } from '../ModalConfirmacion/ModalConfirmacion.jsx';
import { TablaRegistros } from '../TablaRegistros/TablaRegistros.jsx';
import { BarraAcciones } from '../BarraAcciones/BarraAcciones.jsx';
import classes from './CrudCatalogo.module.css';

function Field({ campo, value, options, error, onChange, form }) {
    const tipo = typeof campo.type === 'function' ? campo.type(form) : campo.type;
    const common = {
        label: campo.label,
        withAsterisk: campo.required,
        error,
        size: 'md',
        radius: 'md',
    };

    if (tipo === 'textarea') {
        return <Textarea {...common} minRows={campo.minRows ?? 3} value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value)} />;
    }

    if (tipo === 'select') {
        return <NativeSelect {...common} data={[{ value: '', label: campo.placeholder ?? `Selecciona ${campo.label.toLowerCase()}` }, ...(options ?? campo.options ?? [])]} value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value)} />;
    }

    if (tipo === 'number') {
        const step = typeof campo.step === 'function' ? campo.step(form) : campo.step;
        const decimalScale = typeof campo.decimalScale === 'function' ? campo.decimalScale(form) : campo.decimalScale;
        return <NumberInput {...common} value={value ?? ''} onChange={onChange} min={campo.min} step={step} decimalScale={decimalScale} />;
    }

    if (tipo === 'boolean') {
        return <Switch label={campo.label} error={error} size="md" color="apex" checked={value === true || value === 'true'} onChange={(event) => onChange(event.currentTarget.checked)} />;
    }

    return <TextInput {...common} placeholder={campo.placeholder} value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value)} />;
}

export function CrudCatalogo({
    titulo,
    singular,
    servicio,
    columnas,
    campos,
    valoresIniciales,
    
    mapRecordToForm = (record) => record,
    mapFormToPayload = (form) => form,
    mapRecordToRow = (record) => record,
    renderFormExtra,
    validateForm,
    formLayout = 'stack',
}) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(valoresIniciales);
    const [errors, setErrors] = useState({});
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [fieldOptions, setFieldOptions] = useState({});

    const fieldsWithLoader = useMemo(() => campos.filter((campo) => campo.loadOptions), [campos]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await servicio.obtenerTodos();
            if (response.responseFlag !== 0) throw new Error(response.message);
            setRecords(response.data ?? []);
            setError(null);
        } catch (err) {
            setError(err.message || `Error al cargar ${titulo.toLowerCase()}`);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        const loaded = await Promise.all(fieldsWithLoader.map(async (campo) => {
            try {
                return [campo.key, await campo.loadOptions()];
            } catch {
                return [campo.key, []];
            }
        }));
        setFieldOptions(Object.fromEntries(loaded));
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
        // La configuración de campos es estable por cada pantalla.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetForm = () => {
        setForm(valoresIniciales);
        setErrors({});
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEdit = (record) => {
        setEditingId(record.id);
        setForm(mapRecordToForm(records.find((item) => item.id === record.id) ?? record));
        setErrors({});
        setModalOpen(true);
    };

    const updateField = (key, value) => {
        setForm((previous) => ({ ...previous, [key]: value }));
        setErrors((previous) => ({ ...previous, [key]: null }));
    };

    const save = async () => {
        const nextErrors = {};
        for (const campo of campos) {
            if (!campo.required) continue;
            const value = form[campo.key];
            if (value === undefined || value === null || String(value).trim() === '') {
                nextErrors[campo.key] = `${campo.label} es requerido`;
            }
        }
        Object.assign(nextErrors, validateForm?.(form) ?? {});
        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            notifications.show({ title: 'Formulario incompleto', message: 'Revisa los campos marcados.', color: 'red' });
            return;
        }

        try {
            setLoading(true);
            const payload = mapFormToPayload(form);
            const response = editingId ? await servicio.actualizar(editingId, payload) : await servicio.crear(payload);
            if (response.responseFlag !== 0) throw new Error(response.message);
            notifications.show({ title: editingId ? 'Actualizado' : 'Agregado', message: `${singular} guardado correctamente.`, color: 'green' });
            await fetchData();
            setModalOpen(false);
            resetForm();
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message || `No se pudo guardar ${singular.toLowerCase()}.`, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            setDeleting(true);
            const response = await servicio.eliminar(pendingDelete.id);
            if (response.responseFlag !== 0) throw new Error(response.message);
            await fetchData();
            notifications.show({ title: 'Eliminado', message: `${singular} eliminado correctamente.`, color: 'green' });
            setPendingDelete(null);
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message || `No se pudo eliminar ${singular.toLowerCase()}.`, color: 'red' });
        } finally {
            setDeleting(false);
        }
    };

    const tableData = useMemo(() => records.map(mapRecordToRow), [records, mapRecordToRow]);

    return (
        <>
            <ModalConfirmacion
                opened={Boolean(pendingDelete)}
                onClose={() => !deleting && setPendingDelete(null)}
                onConfirm={confirmDelete}
                loading={deleting}
                title="Confirmar eliminación"
                message={`¿Deseas eliminar el registro de ${pendingDelete?.nombre ?? pendingDelete?.clave ?? singular.toLowerCase()}? Esta acción no se puede deshacer.`}
            />

            <Modal
                opened={modalOpen}
                onClose={() => !loading && setModalOpen(false)}
                title={<Title order={4} className={classes.modalTitle}>{editingId ? `Editar ${singular.toLowerCase()}` : `Agregar ${singular.toLowerCase()}`}</Title>}
                fullScreen
                radius={0}
                zIndex={999999}
                transitionProps={{ transition: 'slide-up', duration: 200 }}
            >
                <Stack maw={780} mx="auto" mt="xl" gap="xl" className={classes.form}>
                    <div className={formLayout === 'columns' ? classes.formColumns : undefined}>
                        <Stack gap="md">
                            {campos.map((campo) => (
                                <Field key={campo.key} campo={campo} form={form} value={form[campo.key]} options={fieldOptions[campo.key]} error={errors[campo.key]} onChange={(value) => updateField(campo.key, value)} />
                            ))}
                        </Stack>
                        {renderFormExtra && (
                            <div className={formLayout === 'columns' ? classes.permissionsPanel : undefined}>
                                {renderFormExtra({ form, errors, onChange: updateField })}
                            </div>
                        )}
                    </div>
                    <Group grow mt="sm">
                        <Button variant="default" onClick={() => setModalOpen(false)} disabled={loading}>Cancelar</Button>
                        <Button onClick={save} loading={loading}>Guardar</Button>
                    </Group>
                </Stack>
            </Modal>

            <div className={classes.layout}>
                <BarraAcciones onAdd={openCreate} title={titulo} entityLabel={titulo.toLowerCase()} />
                {error && <div className={classes.error}>{error}</div>}
                {loading && records.length === 0 ? <div className={classes.loading}>Cargando {titulo.toLowerCase()}…</div> : <TablaRegistros data={tableData} columns={columnas} onEditar={openEdit} onEliminar={setPendingDelete} entityLabel={singular.toLowerCase()} loading={loading} onReload={() => {
        fetchData();
        fetchOptions();
    }} />}
            </div>
        </>
    );
}
