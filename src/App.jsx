import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import { Usuarios } from './pages/Usuarios/Usuarios.jsx';
import { TiposActividad } from './pages/TiposActividad/TiposActividad.jsx';
import { ConfiguracionSistema } from './pages/ConfiguracionSistema/ConfiguracionSistema.jsx';
import { AdministracionRoles } from './pages/AdministracionRoles/AdministracionRoles.jsx';
import { ApiLoading } from './components/ApiLoading/ApiLoading.jsx';
import { estaAutenticado, guardarToken, guardarUsuarioActual, eliminarToken, eliminarUsuarioActual } from './scripts/constantes.js';
import { useState } from 'react';
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
            estaLogeadoEn ? <Navigate to="/" replace /> : <Login onLoginAceptado={accionLogin} />
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
  
        <Route path="/tipos-actividad" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><TiposActividad /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
        <Route path="/configuracion-sistema" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><ConfiguracionSistema /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />
        <Route path="/administracion-roles" element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><AdministracionRoles /></Dashboard> : <Login onLoginAceptado={accionLogin} />} />

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
