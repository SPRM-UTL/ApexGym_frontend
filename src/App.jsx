import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { estaAutenticado, guardarToken, guardarUsuarioActual, eliminarToken, eliminarUsuarioActual } from './scripts/constantes.js';
import { useState } from 'react';
import { Ventas } from './pages/RegistroVentas/Ventas/Ventas.jsx';
import { Nueva } from './pages/RegistroVentas/Nueva/Nueva.jsx';
import { CategoriaProducto } from './pages/CategoriaProducto/CategoriaProducto.jsx';

function App() {
  const [estaLogeadoEn, setEstaLogeadoEn] = useState(() => estaAutenticado());

  const accionLogin = (tokenRecibido, esPersistente = false, usuario = null) => {
    guardarToken(tokenRecibido, esPersistente);
    guardarUsuarioActual(usuario, esPersistente);
    setEstaLogeadoEn(true);
  };

  const accionLogout = () => {
    eliminarToken();
    eliminarUsuarioActual();
    setEstaLogeadoEn(false);
  }

  return (
    <>
      <ApiLoading />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              estaLogeadoEn ? <Navigate to="/" replace /> : <Nueva onLoginAceptado={accionLogin} />
            }
          />

          {/* Rutas de módulos específicos: pasan children al Dashboard */}
          <Route
            path="/usuarios"
            element={
              estaLogeadoEn ? (
                <Dashboard onLogout={accionLogout}>
                  <Usuarios />
                </Dashboard>
              ) : (
                <Login onLoginAceptado={accionLogin} />
              )
            }
          />
          <Route path="/registro-de-ventas" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Ventas /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/registro-de-ventas/nueva" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Nueva /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/tipos-actividad" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><TiposActividad /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/configuracion-sistema" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><ConfiguracionSistema /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/administracion-roles" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><AdministracionRoles /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/cajas" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Cajas /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/areas-trabajo" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><AreasTrabajo /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/puestos" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Puestos /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/estados-empleado" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><EstadosEmpleado /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/empleados" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Empleados /></Dashboard> : <Login onLogout={accionLogout} />} />
          <Route path="/apertura-caja" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><AperturaCaja /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/movimientos-caja" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><MovimientosCaja /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
          <Route path="/corte-caja" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><CorteCaja /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />

          {/* Ruta raíz: muestra el grid de secciones (sin children) */}
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
          <Route
            path="/categorias-productos"
            element={
              estaLogeadoEn ? (
                <Dashboard onLogout={accionLogout}>
                  <CategoriaProducto />
                </Dashboard>
              ) : (
                <Login onLoginAceptado={accionLogin} />
              )
            }
          />

          {/* Cualquier otra ruta no reconocida redirige a inicio */}
          <Route
            path="*"
            element={<Navigate to={estaLogeadoEn ? "/" : "/login"} replace />}
          />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;
