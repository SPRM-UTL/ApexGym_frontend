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
        <Route
          path="/usuarios"
          element={
            estaLogeadoEn ? <Usuarios onLogout={accionLogout}/> : <Login onLoginAceptado={accionLogin} />
          }
        />
        <Route
          path="/*"
          element={
            estaLogeadoEn ? <Dashboard onLogout={accionLogout} /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App;