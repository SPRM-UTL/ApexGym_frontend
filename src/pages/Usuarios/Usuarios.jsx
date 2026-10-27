import { Badge, Group } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { CrudCatalogo } from '../../components/CrudCatalogo/CrudCatalogo.jsx';
import { api } from '../../scripts/services/api.js';
import { cambioNombreWeb } from '../../scripts/globales.js';
import { resolverUrlImagen } from '../../scripts/constantes.js';

const COLUMNAS_USUARIOS = [
    { key: 'nombre', label: 'Nombre', sortable: true, filterable: true },
    { key: 'email', label: 'Correo', sortable: true, filterable: true },
    { key: 'rolesLabel', label: 'Rol(es)', sortable: false, filterable: true },
];

const CAMPOS_USUARIOS = [
    { key: 'nombre', label: 'Nombre', required: true },
    { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
    { key: 'contrasena', label: 'Contraseña', type: 'password' },
    {
        key: 'rolId',
        label: 'Rol',
        type: 'select',
        loadOptions: async () => {
            const res = await api.rol.obtenerTodos();
            const roles = res?.data ?? [];
            return roles.map((r) => ({ value: String(r.id), label: r.nombre }));
        },
    },
    { key: 'foto', label: 'Foto de perfil', type: 'image' },
];

const VALORES_INICIALES = {
    nombre: '',
    email: '',
    contrasena: '',
    rolId: '',
    foto: null,
};

const usuarioServicio = {
    obtenerTodos: async () => api.user.obtenerTodos(),
    crear: async (payload) => {
        const { nombre, email, contrasena, rolId, foto } = payload ?? {};
        return api.user.register(nombre, email, contrasena, rolId || null, foto || null);
    },
    actualizar: async (id, payload) => {
        const { nombre, email, contrasena, rolId, foto } = payload ?? {};
        return api.user.actualizarUsuario(id, nombre, email, contrasena || undefined, rolId || null, foto || null);
    },
    eliminar: async (id) => api.user.eliminarUsuario(id),
};

const verificarCorreo = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? ''));

export function Usuarios() {
    cambioNombreWeb('Usuarios');

    const mapRecordToRow = (record) => {
        const userRoles = record.roles ?? [];
        return {
            id: record.id,
            nombre: record.nombre,
            email: record.email,
            fotoUrl: record.fotoUrl,
            roles: userRoles,
            rolesLabel:
                userRoles.length > 0 ? (
                    <Group gap={6} wrap="wrap">
                        {userRoles.map((r) => (
                            <Badge
                                key={r.id ?? r.nombre}
                                size="sm"
                                variant="light"
                                color="blue"
                                radius="sm"
                                fw={700}
                            >
                                {String(r.nombre).toUpperCase()}
                            </Badge>
                        ))}
                    </Group>
                ) : (
                    <Badge size="sm" variant="light" color="gray" radius="sm" fw={700}>
                        SIN ROL
                    </Badge>
                ),
        };
    };

    const mapRecordToForm = (record) => {
        const primerRol = (record.roles ?? [])[0];
        return {
            nombre: record.nombre ?? '',
            email: record.email ?? '',
            contrasena: '',
            rolId: primerRol ? String(primerRol.id) : '',
            foto: resolverUrlImagen(record.fotoUrl) || null,
        };
    };

    const mapFormToPayload = (form) => ({
        nombre: form.nombre,
        email: form.email,
        contrasena: form.contrasena,
        rolId: form.rolId || null,
        foto: form.foto instanceof File ? form.foto : null,
    });

    const validateForm = (form, context = {}) => {
        const editingId = context.editingId ?? context?.editingId;
        const errores = {};
        if (!String(form.nombre ?? '').trim()) errores.nombre = 'El nombre es requerido';
        if (!String(form.email ?? '').trim()) {
            errores.email = 'El correo es requerido';
        } else if (!verificarCorreo(form.email)) {
            errores.email = 'El correo no es válido';
        }
        if (!editingId && !String(form.contrasena ?? '').trim()) {
            errores.contrasena = 'La contraseña es requerida';
        }
        if (!editingId && !form.rolId) {
            errores.rolId = 'Selecciona un rol';
        }
        return errores;
    };

    return (
        <CrudCatalogo
            titulo="Usuarios"
            singular="Usuario"
            icon={IconUsers}
            servicio={usuarioServicio}
            columnas={COLUMNAS_USUARIOS}
            campos={CAMPOS_USUARIOS}
            valoresIniciales={VALORES_INICIALES}
            mapRecordToForm={mapRecordToForm}
            mapFormToPayload={mapFormToPayload}
            mapRecordToRow={mapRecordToRow}
            validateForm={(form, context) => validateForm(form, context)}
            formMode="drawer"
            drawerSize={560}
            headerVariant="unified"
            tableHeaderVariant="neutral"
            permitirEditar
            permitirEliminar
        />
    );
}

export default Usuarios;
