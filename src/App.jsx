import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import { Usuarios } from './pages/Usuarios/Usuarios.jsx';
import { estaAutenticado, guardarToken, eliminarToken } from './scripts/constantes.js';
import { useState } from 'react';
import { chartsDynamic } from './components/ReportComponent/ReporFile.jsx';

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

  const dataStatistics = [
        { fecha: 'Enero', Activos: 10, Inactivos: 2 },
        { fecha: 'Febrero', Activos: 25, Inactivos: 5 },
        { fecha: 'Marzo', Activos: 40, Inactivos: 3 },
        { fecha: 'Abril', Activos: 55, Inactivos: 8 },
    ];

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            estaLogeadoEn ? <Navigate to="/" replace /> : <Login onLoginAceptado={accionLogin} />
          }
        />
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
        <Route
          path="/*"
          element={
            estaLogeadoEn ? (
              <Dashboard onLogout={accionLogout}>
                <h2>Bienvenido al Dashboard</h2>

                {chartsDynamic(dataStatistics, 350, 'fecha')}
              </Dashboard>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App;