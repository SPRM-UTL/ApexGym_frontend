const CONECTORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y']);

/**
 * Convierte un nombre en un slug limpio sin acentos ni conectores ("de", "y", etc.).
 * Ej: "Gestión de Clientes" -> "gestion-clientes", "Ventas y Caja" -> "ventas-caja".
 * @param {string} texto
 * @returns {string}
 */
export function normalizarSlug(texto) {
    if (!texto) return '';
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((palabra) => palabra && !CONECTORES.has(palabra))
        .join('-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Mapa explícito nombre de sección (BD) → slug de sección */
export const SLUGS_SECCION = {
    'Administración': 'administracion',
    'Gestión de Clientes': 'gestion-clientes',
    'Ventas y Caja': 'ventas-caja',
    'Empleados': 'empleados',
    'Inventario': 'inventario',
    'Rendimiento Laboral': 'rendimiento-laboral',
    'Ventas': 'ventas',
};

/** Mapa explícito nombre de módulo (BD) → { seccion: slugSeccion, modulo: slugModulo } */
export const RUTAS_POR_MODULO = {
    'Dashboard y Reportes': { seccion: 'administracion', modulo: 'dashboard-reportes' },
    'Usuarios': { seccion: 'administracion', modulo: 'usuarios' },
    'Configuración del Sistema': { seccion: 'administracion', modulo: 'configuracion-sistema' },
    'Administración de roles': { seccion: 'administracion', modulo: 'administracion-roles' },
    'Empresa': { seccion: 'administracion', modulo: 'empresa' },
    'Sucursales': { seccion: 'administracion', modulo: 'sucursales' },
    'Sucursal': { seccion: 'administracion', modulo: 'sucursales' },

    'Clientes': { seccion: 'gestion-clientes', modulo: 'clientes' },
    'Estados de Cliente': { seccion: 'gestion-clientes', modulo: 'estados-cliente' },
    'Tipos de Membresía': { seccion: 'gestion-clientes', modulo: 'tipos-membresia' },
    'Estados de Membresía': { seccion: 'gestion-clientes', modulo: 'estados-membresia' },
    'Tipos de Visita': { seccion: 'gestion-clientes', modulo: 'tipos-visita' },
    'Accesos y Visitas': { seccion: 'gestion-clientes', modulo: 'accesos-visitas' },

    'Cajas': { seccion: 'ventas-caja', modulo: 'cajas' },
    'Apertura de Caja': { seccion: 'ventas-caja', modulo: 'apertura-caja' },
    'Movimientos de Caja': { seccion: 'ventas-caja', modulo: 'movimientos-caja' },
    'Corte de Caja': { seccion: 'ventas-caja', modulo: 'corte-caja' },
    'Métodos de Pago': { seccion: 'ventas-caja', modulo: 'metodos-pago' },
    'Servicios': { seccion: 'ventas-caja', modulo: 'servicios' },
    'Ventas': { seccion: 'ventas-caja', modulo: 'ventas' },
    'Áreas de Trabajo': { seccion: 'empleados', modulo: 'areas-trabajo' },
    'Puestos': { seccion: 'empleados', modulo: 'puestos' },
    'Estados de Empleado': { seccion: 'empleados', modulo: 'estados-empleado' },
    'Empleados': { seccion: 'empleados', modulo: 'empleados' },

    'Categorías de Productos': { seccion: 'inventario', modulo: 'categorias-productos' },
    'Productos': { seccion: 'inventario', modulo: 'productos' },
    'Almacenes': { seccion: 'inventario', modulo: 'almacenes' },

    'Tipos de Actividad': { seccion: 'rendimiento-laboral', modulo: 'tipos-actividad' },

    'Registro de ventas': { seccion: 'ventas', modulo: 'registro-ventas' },
};

const SECCIONES_CONOCIDAS = new Set([
    ...Object.values(SLUGS_SECCION),
    ...Object.values(RUTAS_POR_MODULO).map((r) => r.seccion),
]);

/**
 * Normaliza un pathname quitando barras finales redundantes.
 * @param {string} pathname
 * @returns {string}
 */
export function limpiarPathname(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Devuelve el slug de una sección.
 * @param {string} nombreSeccion
 * @returns {string}
 */
export function slugSeccion(nombreSeccion) {
    if (!nombreSeccion) return '';
    return SLUGS_SECCION[nombreSeccion] || normalizarSlug(nombreSeccion);
}

/**
 * Devuelve la ruta de una sección (ej. "/administracion").
 * @param {string} nombreSeccion
 * @returns {string | null}
 */
export function rutaSeccion(nombreSeccion) {
    const slug = slugSeccion(nombreSeccion);
    return slug ? `/${slug}` : null;
}

/**
 * Devuelve el slug de un módulo.
 * @param {string} nombreModulo
 * @returns {string}
 */
export function slugModulo(nombreModulo) {
    if (!nombreModulo) return '';
    return RUTAS_POR_MODULO[nombreModulo]?.modulo || normalizarSlug(nombreModulo);
}

/**
 * Resuelve la ruta jerárquica completa de un módulo ("/seccion/modulo").
 * @param {string} nombreModulo
 * @param {string | null} [nombreSeccion]
 * @returns {string | null}
 */
export function rutaModulo(nombreModulo, nombreSeccion = null) {
    if (!nombreModulo) return null;
    const modSlug = slugModulo(nombreModulo);
    const secSlug = nombreSeccion
        ? slugSeccion(nombreSeccion)
        : RUTAS_POR_MODULO[nombreModulo]?.seccion;

    if (!modSlug) return null;
    return secSlug ? `/${secSlug}/${modSlug}` : `/${modSlug}`;
}

/**
 * Indica si un slug de sección corresponde a una sección registrada en el sistema.
 * @param {string} seccionSlug
 * @returns {boolean}
 */
export function esSeccionConocida(seccionSlug) {
    return SECCIONES_CONOCIDAS.has(String(seccionSlug || '').toLowerCase());
}

/**
 * Busca la sección permitida que corresponde a una ruta "/:seccion".
 * @param {Array} secciones
 * @param {string} pathname
 */
export function resolverSeccionPorRuta(secciones, pathname) {
    const limpio = limpiarPathname(pathname);
    const segmentos = limpio.split('/').filter(Boolean);
    if (segmentos.length !== 1) return null;

    const seccionSlug = segmentos[0].toLowerCase();
    return (secciones ?? []).find((s) => slugSeccion(s.nombre) === seccionSlug) ?? null;
}

/**
 * Busca sección y módulo permitidos que corresponden a una ruta "/:seccion/:modulo".
 * @param {Array} secciones
 * @param {string} pathname
 */
export function resolverModuloPorRuta(secciones, pathname) {
    const limpio = limpiarPathname(pathname);
    for (const seccion of secciones ?? []) {
        for (const modulo of seccion.modulos ?? []) {
            if (rutaModulo(modulo.nombre, seccion.nombre) === limpio) {
                return { seccion, modulo };
            }
        }
    }
    return null;
}

/**
 * Verifica si el usuario tiene acceso a una sección por su slug.
 * @param {Array} secciones
 * @param {string} seccionSlug
 * @returns {boolean}
 */
export function tieneAccesoSeccion(secciones, seccionSlug) {
    const slug = String(seccionSlug || '').toLowerCase();
    return (secciones ?? []).some((s) => slugSeccion(s.nombre) === slug);
}

/**
 * Verifica si el usuario tiene acceso a un módulo específico dentro de una sección.
 * @param {Array} secciones
 * @param {string} seccionSlug
 * @param {string} moduloSlug
 * @returns {boolean}
 */
export function tieneAccesoModulo(secciones, seccionSlug, moduloSlug) {
    const objetivo = `/${String(seccionSlug || '').toLowerCase()}/${String(moduloSlug || '').toLowerCase()}`;
    return Boolean(resolverModuloPorRuta(secciones, objetivo));
}
