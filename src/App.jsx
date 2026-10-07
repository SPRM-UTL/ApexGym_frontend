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
import { /** estaAutenticado, guardarToken, **/guardarUsuarioActual,/** eliminarToken,*/  eliminarUsuarioActual, obtenerUsuarioActual, obtenerEsPersistente } from './scripts/constantes.js'; //solo traemos para que guarde el usuario actual
/**usamos useEffect para mandar una peticion a la api de los permisos de esta manera
 * matamos dos pajaros de un tiro al revisar el token y los permisos el backen se encarg de 
 * revisar las cookies  si la peticion exitosa recarga a la pantalla de la aplicacion
 * **/
import { useState , useEffect} from 'react';
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

function App() {

const [estaLogeadoEn, setEstaLogeadoEn] = useState(null);

  /**de esta manera le decimos que revise con obtenerMisSecciones y este nos diga si
   *  tiene algun token para poder entrar de manera automatica de esta manera le 
   * decimos a la funcion de que si esta logueado*/

       useEffect(()=>{
        let activo = true;
        const validarSesion = async () => {
          //hacemos una espera minima para que se note que esta cargando
          const espera = new Promise((resolver) => setTimeout(resolver,500))
          const usuarioActual = obtenerUsuarioActual();
          if(!usuarioActual){
            setEstaLogeadoEn(false);
            await espera;
            return;
          }
          try{
            const respuesta = await api.seccion.obtenerMisSecciones();
            await espera;
            if(activo){
              setEstaLogeadoEn(respuesta?.responseFlag === 0);
            }
          }catch(error){
            if(activo) setEstaLogeadoEn(false)
              await espera;
          }
    };
    validarSesion();
    
    return () => {
      activo : false;
    }

  }, []);

    /**Esta es la pantalla de carga mientres no este logueado*/
  if (estaLogeadoEn === null) {
    return <PantallaCarga />;
  }
  
  const usuarioActual = obtenerUsuarioActual();

  /**Aqui solo comente las lineas y evitar que guarde cualquier token */
  const accionLogin = (/**tokenRecibido,*/ esPersistente = false, usuario = null) => {
    /**guardarToken(tokenRecibido, esPersistente);*/
    guardarUsuarioActual(usuario, esPersistente);
    setEstaLogeadoEn(true);
    api.seccion
  };

  const accionLogout = async () => {
    /**eliminarToken();*/ //Evitamos que llame el token que no esta almacenado en LocalStore
    try{
    if(usuarioActual && usuarioActual.id){

        const res = await api.user.logout(usuario.id);
    }
    
    }catch(error){
      console.error("error al serrar sesion", error)
    }


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

        <Route
          path="/estados-cliente"
          element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><EstadosCliente /></Dashboard> : <Login onLoginAceptado={accionLogin} />}
        />
        <Route
          path="/clientes"
          element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><Clientes /></Dashboard> : <Login onLoginAceptado={accionLogin} />}
        />
        <Route
          path="/estados-membresia"
          element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><EstadosMembresia /></Dashboard> : <Login onLoginAceptado={accionLogin} />}
        />
        <Route
          path="/tipos-membresia"
          element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><TiposMembresia /></Dashboard> : <Login onLoginAceptado={accionLogin} />}
        />
        <Route
          path="/tipos-visita"
          element={estaLogeadoEn ? <Dashboard onLogout={accionLogout}><TiposVisita /></Dashboard> : <Login onLoginAceptado={accionLogin} />}
        />

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
          <Route
            path="/productos"
            element={
              estaLogeadoEn ? (
                <Dashboard onLogout={accionLogout}>
                  <Productos />
                </Dashboard>
              ) : (
                <Login onLoginAceptado={accionLogin} />
              )
            }
          />
          <Route
            path="/metodos-pago"
            element={
              estaLogeadoEn ? (
                <Dashboard onLogout={accionLogout}>
                  <MetodosPago />
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
