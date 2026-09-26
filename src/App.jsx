import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import { Usuarios } from './pages/Usuarios/Usuarios.jsx';
import { estaAutenticado, guardarToken, eliminarToken } from './scripts/constantes.js';
import { useState } from 'react';

function App() {
  const [estaLogeadoEn, setEstaLogeadoEn] = useState(() => estaAutenticado());

  const accionLogin = (tokenRecibido, esPersistente = false) => {
    guardarToken(tokenRecibido, esPersistente);
    setEstaLogeadoEn(true);
  };

  const accionLogout = () => {
    eliminarToken();
    setEstaLogeadoEn(false);
  }

  return (
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

        {/* Cualquier otra ruta no reconocida redirige a inicio */}
        <Route
          path="*"
          element={<Navigate to={estaLogeadoEn ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
