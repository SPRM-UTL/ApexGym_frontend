import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import { Usuarios } from './pages/Usuarios/Usuarios.jsx';
import { TiposActividad } from './pages/TiposActividad/TiposActividad.jsx';
import { ConfiguracionSistema } from './pages/ConfiguracionSistema/ConfiguracionSistema.jsx';
import { AdministracionRoles } from './pages/AdministracionRoles/AdministracionRoles.jsx';
import { Cajas } from './pages/Cajas/Cajas.jsx';
import { AreasTrabajo } from './pages/AreasTrabajo/AreasTrabajo.jsx';
import { Puestos } from './pages/Puestos/Puestos.jsx';
import { EstadosEmpleado } from './pages/EstadosEmpleado/EstadosEmpleado.jsx';
import { Empleados } from './pages/Empleados/Empleados.jsx';
import { AperturaCaja } from './pages/AperturaCaja/AperturaCaja.jsx';
import { MovimientosCaja } from './pages/MovimientosCaja/MovimientosCaja.jsx';
import { CorteCaja } from './pages/CorteCaja/CorteCaja.jsx';
import { ApiLoading } from './components/ApiLoading/ApiLoading.jsx';
import { Ventas } from './pages/RegistroVentas/Ventas/Ventas.jsx';
import { Nueva } from './pages/RegistroVentas/Nueva/Nueva.jsx';
import { ClienteVenta } from './pages/RegistroVentas/Cliente/Cliente.jsx';
import { ProteccionCajaAbierta } from './pages/RegistroVentas/components/ProteccionCajaAbierta.jsx';
import { /** estaAutenticado, guardarToken, **/guardarUsuarioActual,/** eliminarToken,*/  eliminarUsuarioActual, obtenerUsuarioActual, obtenerEsPersistente } from './scripts/constantes.js'; //solo traemos para que guarde el usuario actual
/**usamos useEffect para mandar una peticion a la api de los permisos de esta manera
 * matamos dos pajaros de un tiro al revisar el token y los permisos el backen se encarg de 
 * revisar las cookies  si la peticion exitosa recarga a la pantalla de la aplicacion
 * **/
import { useState, useEffect, useCallback } from 'react';
import { CategoriaProducto } from './pages/CategoriaProducto/CategoriaProducto.jsx';
import { EstadosCliente } from './pages/EstadosCliente/EstadosCliente.jsx';
import { Clientes } from './pages/Clientes/Clientes.jsx';
import { EstadosMembresia } from './pages/EstadosMembresia/EstadosMembresia.jsx';
import { TiposMembresia } from './pages/TiposMembresia/TiposMembresia.jsx';
import { TiposVisita } from './pages/TiposVisita/TiposVisita.jsx';
import { api } from './scripts/services/api.js';
import PantallaCarga from './components/PantallaCarga.jsx';
import { Productos } from './pages/Productos/Productos.jsx';
import { MetodosPago } from './pages/MetodosPago/MetodosPago.jsx';
import { Servicios } from './pages/Servicios/Servicios.jsx';
import { Empresa } from './pages/Empresa/Empresa.jsx';
import { Sucursales } from './pages/Sucursales/Sucursales.jsx';
import { SimuladorPagos } from './pages/Pagos/SimuladorPagos.jsx';
import { EmpresaProvider } from './context/EmpresaContext.jsx';
import { SucursalProvider } from './context/SucursalContext.jsx';
import { SeccionesProvider, useSecciones } from './context/SeccionesContext.jsx';
import { ControlAcceso } from './pages/Asistencias/ControlAcceso.jsx';
import { PaginaError } from './pages/Error/PaginaError.jsx';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.jsx';
import {
  esSeccionConocida,
  tieneAccesoModulo,
  tieneAccesoSeccion,
} from './scripts/modulosRutas.js';

function RutaSeccionProtegida({ estaLogeadoEn, onLoginAceptado, onLogout }) {
  const { seccionSlug } = useParams();
  const { secciones, cargandoSecciones } = useSecciones();

  if (!estaLogeadoEn) {
    return <Login onLoginAceptado={onLoginAceptado} />;
  }

  if (!esSeccionConocida(seccionSlug)) {
    return <PaginaError codigo={404} estaLogeadoEn={estaLogeadoEn} />;
  }

  if (cargandoSecciones) {
    return <PantallaCarga />;
  }

  if (!tieneAccesoSeccion(secciones, seccionSlug)) {
    return <PaginaError codigo={403} estaLogeadoEn={estaLogeadoEn} />;
  }

  return <Dashboard onLogout={onLogout} />;
}

function RutaModuloProtegida({
  estaLogeadoEn,
  onLoginAceptado,
  onLogout,
  seccionSlug,
  moduloSlug,
  children,
}) {
  const { secciones, cargandoSecciones } = useSecciones();

  if (!estaLogeadoEn) {
    return <Login onLoginAceptado={onLoginAceptado} />;
  }

  if (cargandoSecciones) {
    return <PantallaCarga />;
  }

  if (!tieneAccesoModulo(secciones, seccionSlug, moduloSlug)) {
    return <PaginaError codigo={403} estaLogeadoEn={estaLogeadoEn} />;
  }

  return <Dashboard onLogout={onLogout}>{children}</Dashboard>;
}

const RUTAS_MODULOS = [
  // Administración
  { seccion: 'administracion', modulo: 'usuarios', element: <Usuarios /> },
  { seccion: 'administracion', modulo: 'configuracion-sistema', element: <ConfiguracionSistema /> },
  { seccion: 'administracion', modulo: 'administracion-roles', element: <AdministracionRoles /> },
  { seccion: 'administracion', modulo: 'empresa', element: <Empresa /> },
  { seccion: 'administracion', modulo: 'sucursales', element: <Sucursales /> },

  // Gestión de Clientes
  { seccion: 'gestion-clientes', modulo: 'clientes', element: <Clientes /> },
  { seccion: 'gestion-clientes', modulo: 'estados-cliente', element: <EstadosCliente /> },
  { seccion: 'gestion-clientes', modulo: 'tipos-membresia', element: <TiposMembresia /> },
  { seccion: 'gestion-clientes', modulo: 'estados-membresia', element: <EstadosMembresia /> },
  { seccion: 'gestion-clientes', modulo: 'tipos-visita', element: <TiposVisita /> },
  { seccion: 'gestion-clientes', modulo: 'accesos-visitas', element: <ControlAcceso /> },

  // Ventas y Caja
  { seccion: 'ventas-caja', modulo: 'cajas', element: <Cajas /> },
  { seccion: 'ventas-caja', modulo: 'apertura-caja', element: <AperturaCaja /> },
  { seccion: 'ventas-caja', modulo: 'movimientos-caja', element: <MovimientosCaja /> },
  { seccion: 'ventas-caja', modulo: 'corte-caja', element: <CorteCaja /> },
  { seccion: 'ventas-caja', modulo: 'metodos-pago', element: <MetodosPago /> },
  { seccion: 'ventas-caja', modulo: 'servicios', element: <Servicios /> },
  { seccion: 'ventas-caja', modulo: 'ventas', element: <Ventas /> },
  { seccion: 'ventas-caja', modulo: 'registro-ventas', element: <Ventas /> },
  { seccion: 'ventas-caja', modulo: 'pagos-experimentacion', element: <SimuladorPagos /> },

  // Empleados
  { seccion: 'empleados', modulo: 'areas-trabajo', element: <AreasTrabajo /> },
  { seccion: 'empleados', modulo: 'puestos', element: <Puestos /> },
  { seccion: 'empleados', modulo: 'estados-empleado', element: <EstadosEmpleado /> },
  { seccion: 'empleados', modulo: 'empleados', element: <Empleados /> },

  // Inventario
  { seccion: 'inventario', modulo: 'categorias-productos', element: <CategoriaProducto /> },
  { seccion: 'inventario', modulo: 'productos', element: <Productos /> },

  // Rendimiento Laboral
  { seccion: 'rendimiento-laboral', modulo: 'tipos-actividad', element: <TiposActividad /> },

  // Ventas
  { seccion: 'ventas', modulo: 'ventas', element: <Ventas /> },
  { seccion: 'ventas', modulo: 'registro-ventas', element: <Ventas /> },
];

function RutasApp({ estaLogeadoEn, accionLogin, accionLogout, onSessionExpired }) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          estaLogeadoEn ? <Navigate to="/" replace /> : <Login onLoginAceptado={accionLogin} />
        }
      />

      <Route
        path="/seleccionar-sucursal"
        element={
          estaLogeadoEn ? <Dashboard onLogout={accionLogout} /> : <Navigate to="/login" replace />
        }
      />

      {/* Ruta raíz: muestra el grid de secciones */}
      <Route
        path="/"
        element={
          estaLogeadoEn ? (
            <Dashboard onLogout={accionLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Rutas jerárquicas de módulos: /:seccion/:modulo */}
      {RUTAS_MODULOS.map(({ seccion, modulo, element }) => (
        <Route
          key={`${seccion}/${modulo}`}
          path={`/${seccion}/${modulo}`}
          element={
            <RutaModuloProtegida
              estaLogeadoEn={estaLogeadoEn}
              onLoginAceptado={accionLogin}
              onLogout={accionLogout}
              seccionSlug={seccion}
              moduloSlug={modulo}
            >
              {element}
            </RutaModuloProtegida>
          }
        />
      ))}

      {/* Rutas directas para el flujo de ventas */}
      <Route
        path="/registro-de-ventas"
        element={
          estaLogeadoEn ? (
            <Dashboard onLogout={accionLogout}>
              <Ventas />
            </Dashboard>
          ) : (
            <Login onLoginAceptado={accionLogin} />
          )
        }
      />
      <Route
        path="/registro-de-ventas/nueva"
        element={
          estaLogeadoEn ? (
            <Dashboard onLogout={accionLogout}>
              <ProteccionCajaAbierta onSessionExpired={onSessionExpired}>
                <Nueva />
              </ProteccionCajaAbierta>
            </Dashboard>
          ) : (
            <Login onLoginAceptado={accionLogin} />
          )
        }
      />
      <Route
        path="/registro-de-ventas/cliente"
        element={
          estaLogeadoEn ? (
            <Dashboard onLogout={accionLogout}>
              <ClienteVenta />
            </Dashboard>
          ) : (
            <Login onLoginAceptado={accionLogin} />
          )
        }
      />

      {/* Rutas de error */}
      <Route
        path="/error"
        element={<PaginaError estaLogeadoEn={estaLogeadoEn} />}
      />
      <Route
        path="/403"
        element={<PaginaError codigo={403} estaLogeadoEn={estaLogeadoEn} />}
      />
      <Route
        path="/404"
        element={<PaginaError codigo={404} estaLogeadoEn={estaLogeadoEn} />}
      />

      {/* Ruta dinámica de sección: /:seccionSlug */}
      <Route
        path="/:seccionSlug"
        element={
          <RutaSeccionProtegida
            estaLogeadoEn={estaLogeadoEn}
            onLoginAceptado={accionLogin}
            onLogout={accionLogout}
          />
        }
      />

      {/* Cualquier otra ruta no reconocida muestra 404 */}
      <Route
        path="*"
        element={<PaginaError codigo={404} estaLogeadoEn={estaLogeadoEn} />}
      />
    </Routes>
  );
}

function App() {
  const [estaLogeadoEn, setEstaLogeadoEn] = useState(null);
  const manejarSesionExpirada = useCallback(() => {
    eliminarUsuarioActual();
    setEstaLogeadoEn(false);
  }, []);

  useEffect(() => {
    let activo = true;
    const validarSesion = async () => {
      const espera = new Promise((resolver) => setTimeout(resolver, 500));
      const usuarioActual = obtenerUsuarioActual();
      if (!usuarioActual) {
        setEstaLogeadoEn(false);
        await espera;
        return;
      }
      try {
        const respuesta = await api.seccion.obtenerMisSecciones();
        await espera;
        if (activo) {
          setEstaLogeadoEn(respuesta?.responseFlag === 0);
        }
      } catch {
        if (activo) setEstaLogeadoEn(false);
        await espera;
      }
    };
    validarSesion();

    return () => {
      activo = false;
    };
  }, []);

  if (estaLogeadoEn === null) {
    return <PantallaCarga />;
  }

  const accionLogin = (esPersistente = false, usuario = null) => {
    guardarUsuarioActual(usuario, esPersistente);
    try {
      sessionStorage.removeItem('apexgym_sucursal_sesion_confirmada');
    } catch {
      // Ignorar errores de almacenamiento
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apexgym:auth-login'));
    }
    setEstaLogeadoEn(true);
  };

  const accionLogout = async () => {
    try {
      await api.user.logout();
    } catch (error) {
      console.error('error al cerrar sesion', error);
    }

    eliminarUsuarioActual();
    try {
      sessionStorage.removeItem('apexgym_sucursal_sesion_confirmada');
    } catch {
      // Ignorar
    }
    setEstaLogeadoEn(false);
  };

  return (
    <EmpresaProvider estaLogeadoEn={estaLogeadoEn}>
      <SucursalProvider estaLogeadoEn={estaLogeadoEn}>
        <SeccionesProvider estaLogeadoEn={estaLogeadoEn}>
          <ApiLoading />
          <BrowserRouter>
            <ErrorBoundary estaLogeadoEn={estaLogeadoEn}>
              <RutasApp
                estaLogeadoEn={estaLogeadoEn}
                accionLogin={accionLogin}
                accionLogout={accionLogout}
                onSessionExpired={manejarSesionExpirada}
              />
            </ErrorBoundary>
          </BrowserRouter>
        </SeccionesProvider>
      </SucursalProvider>
    </EmpresaProvider>
  );
}

export default App;
