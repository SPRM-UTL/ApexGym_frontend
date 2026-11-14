import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import {
  guardarUsuarioActual,
  eliminarUsuarioActual,
  obtenerUsuarioActual,
} from './scripts/constantes.js';
import { useState, useEffect } from 'react';
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
import { SimuladorPagos } from './pages/Pagos/SimuladorPagos.jsx';
import { EmpresaProvider } from './context/EmpresaContext.jsx';
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
  { seccion: 'ventas-caja', modulo: 'ventas', element: <SimuladorPagos /> },
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
  { seccion: 'ventas', modulo: 'registro-ventas', element: <SimuladorPagos /> },
];

function App() {
  const [estaLogeadoEn, setEstaLogeadoEn] = useState(null);

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
    setEstaLogeadoEn(true);
  };

  const accionLogout = async () => {
    try {
      await api.user.logout();
    } catch (error) {
      console.error('error al cerrar sesion', error);
    }

    eliminarUsuarioActual();
    setEstaLogeadoEn(false);
  };

  return (
    <EmpresaProvider estaLogeadoEn={estaLogeadoEn}>
      <SeccionesProvider estaLogeadoEn={estaLogeadoEn}>
        <ApiLoading />
        <BrowserRouter>
          <ErrorBoundary estaLogeadoEn={estaLogeadoEn}>
            <Routes>
              <Route
                path="/login"
                element={
                  estaLogeadoEn ? <Navigate to="/" replace /> : <Login onLoginAceptado={accionLogin} />
                }
              />

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

              <Route
                path="*"
                element={<PaginaError codigo={404} estaLogeadoEn={estaLogeadoEn} />}
              />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </SeccionesProvider>
    </EmpresaProvider>
  );
}

export default App;
