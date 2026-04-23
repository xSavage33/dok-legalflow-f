/**
 * App.tsx - Componente raiz de la aplicacion y configuracion de rutas
 *
 * Este archivo es el punto de entrada principal de la aplicacion React.
 * Define la estructura de navegacion completa del portal de administracion
 * mediante React Router, incluyendo:
 *
 * - Ruta publica: /login (accesible sin autenticacion)
 * - Rutas protegidas: Todas las demas rutas requieren autenticacion
 *
 * Arquitectura de rutas:
 * - Las rutas protegidas estan envueltas en el componente PrivateRoute
 * - El Layout contiene la navegacion y envuelve todas las paginas protegidas
 * - Cada pagina es una ruta hija que se renderiza dentro del Layout via <Outlet />
 *
 * Sistema de proteccion:
 * - PrivateRoute verifica si el usuario esta autenticado
 * - Si no esta autenticado, redirige a /login
 * - Mientras se verifica la autenticacion, muestra un spinner de carga
 */

// Importacion de componentes de React Router para definir las rutas
// Routes: contenedor de todas las rutas
// Route: define una ruta individual
// Navigate: componente para redireccion declarativa
import { Routes, Route, Navigate } from 'react-router-dom'

// Importacion del hook useAuth para verificar el estado de autenticacion
import { useAuth } from './context/AuthContext'

// Importacion del componente Layout que contiene la estructura visual principal
// (sidebar, header, area de contenido)
import Layout from './components/Layout'

// Importacion de todas las paginas de la aplicacion
// Cada pagina representa una seccion funcional del portal
import Login from './pages/Login'           // Pagina de inicio de sesion
import Dashboard from './pages/Dashboard'   // Panel principal con metricas
import Cases from './pages/Cases'           // Lista de casos legales
import CaseDetail from './pages/CaseDetail' // Detalle de un caso especifico
import CaseForm from './pages/CaseForm'     // Formulario para crear/editar casos
import Documents from './pages/Documents'   // Gestion de documentos
import TimeTracking from './pages/TimeTracking' // Registro de tiempo
import Invoices from './pages/Invoices'     // Gestion de facturas
import Calendar from './pages/Calendar'     // Calendario de eventos
import Messages from './pages/Messages'     // Mensajeria interna
import Analytics from './pages/Analytics'   // Reportes y estadisticas
import Profile from './pages/Profile'       // Perfil del usuario
import Users from './pages/Users'           // Gestion de usuarios/equipo

/**
 * PrivateRoute - Componente de orden superior para proteger rutas
 *
 * Este componente envuelve las rutas que requieren autenticacion.
 * Verifica el estado de autenticacion y decide que renderizar:
 * - Si esta cargando: muestra un spinner
 * - Si esta autenticado: muestra los componentes hijos
 * - Si no esta autenticado: redirige a login
 *
 * @param children - Componentes hijos a renderizar si esta autenticado
 * @returns JSX.Element - Spinner, hijos o redireccion segun el estado
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  // Obtiene el estado de autenticacion del contexto
  // isAuthenticated: true si hay un usuario logueado
  // loading: true mientras se verifica la sesion inicial
  const { isAuthenticated, loading } = useAuth()

  // Mientras se verifica la sesion (al cargar la app), muestra un spinner
  // Esto evita un flash de redireccion a login antes de verificar el token
  if (loading) {
    return (
      // Contenedor centrado que ocupa toda la pantalla
      <div className="min-h-screen flex items-center justify-center">
        {/* Spinner animado usando CSS de Tailwind */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Una vez terminada la carga, verifica autenticacion
  // Si esta autenticado, renderiza los componentes hijos (las rutas protegidas)
  // Si no esta autenticado, redirige a la pagina de login
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

/**
 * App - Componente principal de la aplicacion
 *
 * Define la estructura de rutas de toda la aplicacion.
 * Usa rutas anidadas donde el Layout es el padre y las paginas son hijas.
 *
 * @returns JSX.Element - Configuracion completa de rutas
 */
export default function App() {
  return (
    // Routes: contenedor principal que maneja el enrutamiento
    <Routes>
      {/*
        Ruta de login - PUBLICA
        No esta protegida, cualquier usuario puede acceder
        Es la unica ruta accesible sin autenticacion
      */}
      <Route path="/login" element={<Login />} />

      {/*
        Ruta raiz - PROTEGIDA
        Contiene el Layout como elemento principal
        Todas las rutas hijas se renderizan dentro del Layout via <Outlet />
        Envuelta en PrivateRoute para requerir autenticacion
      */}
      <Route
        path="/"
        element={
          // PrivateRoute protege el Layout y todas sus rutas hijas
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/*
          Rutas hijas - Se renderizan dentro del <Outlet /> del Layout
          El path es relativo al padre ('/' en este caso)
        */}

        {/* Dashboard - Pagina principal, se muestra en la ruta raiz exacta */}
        {/* index indica que es la ruta por defecto cuando se accede a '/' */}
        <Route index element={<Dashboard />} />

        {/* Seccion de Casos - Lista, detalle, creacion y edicion */}
        <Route path="cases" element={<Cases />} />
        {/* Ruta para crear nuevo caso - /cases/new */}
        <Route path="cases/new" element={<CaseForm />} />
        {/* Ruta para ver detalle de un caso - /cases/:id */}
        {/* :id es un parametro dinamico que captura el ID del caso */}
        <Route path="cases/:id" element={<CaseDetail />} />
        {/* Ruta para editar un caso existente - /cases/:id/edit */}
        <Route path="cases/:id/edit" element={<CaseForm />} />

        {/* Seccion de Documentos - Gestion documental */}
        <Route path="documents" element={<Documents />} />

        {/* Seccion de Tiempo - Registro y seguimiento de horas */}
        <Route path="time" element={<TimeTracking />} />

        {/* Seccion de Facturacion - Gestion de facturas */}
        <Route path="invoices" element={<Invoices />} />

        {/* Seccion de Calendario - Eventos, audiencias, plazos */}
        <Route path="calendar" element={<Calendar />} />

        {/* Seccion de Mensajes - Comunicacion interna */}
        <Route path="messages" element={<Messages />} />

        {/* Seccion de Analytics - Reportes y estadisticas */}
        <Route path="analytics" element={<Analytics />} />

        {/* Seccion de Usuarios - Gestion del equipo (requiere permisos especiales) */}
        <Route path="users" element={<Users />} />

        {/* Perfil del Usuario - Configuracion personal */}
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
