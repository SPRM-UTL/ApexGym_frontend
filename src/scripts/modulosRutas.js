/** Mapa explícito nombre de módulo (BD) → ruta del frontend */
const RUTAS_POR_MODULO = {
    Usuarios: '/usuarios',
    'Tipos de Actividad': '/tipos-actividad',
    'Configuración del Sistema': '/configuracion-sistema',
    'Administración de roles': '/administracion-roles',
    Cajas: '/cajas',
    'Áreas de Trabajo': '/areas-trabajo',
    Puestos: '/puestos',
    'Estados de Empleado': '/estados-empleado',
    Empleados: '/empleados',
    'Apertura de Caja': '/apertura-caja',
    'Movimientos de Caja': '/movimientos-caja',
    'Corte de Caja': '/corte-caja',
    'Categorías de Productos': '/categorias-productos',
    'Productos': '/productos',
    'Estados de Cliente': '/estados-cliente',
    'Clientes': '/clientes',
    'Estados de Membresía': '/estados-membresia',
    'Tipos de Membresía': '/tipos-membresia',
    'Tipos de Visita': '/tipos-visita',
    'Metodos de Pago': '/metodos-pago'
};

/**
 * Resuelve la ruta de un módulo por su nombre.
 * @param {string} nombreModulo
 * @returns {string | null}
 */
export function rutaModulo(nombreModulo) {
    if (!nombreModulo) return null;
    if (RUTAS_POR_MODULO[nombreModulo]) {
        return RUTAS_POR_MODULO[nombreModulo];
    }
    const slug = nombreModulo
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '-');
    return slug ? `/${slug}` : null;
}

/**
 * Busca sección y módulo que corresponden a una ruta.
 * @param {Array} secciones
 * @param {string} pathname
 */
export function resolverModuloPorRuta(secciones, pathname) {
    for (const seccion of secciones ?? []) {
        for (const modulo of seccion.modulos ?? []) {
            if (rutaModulo(modulo.nombre) === pathname) {
                return { seccion, modulo };
            }
        }
    }
    return null;
}
