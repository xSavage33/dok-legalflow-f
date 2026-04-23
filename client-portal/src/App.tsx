/**
 * ARCHIVO: App.tsx
 * PROPOSITO: Componente principal de la aplicacion que define todas las rutas
 * y la estructura de navegacion del Portal del Cliente.
 * Implementa rutas protegidas que requieren autenticacion.
 */

// Importaciones de React Router para manejo de rutas
// Routes: contenedor de todas las definiciones de rutas
// Route: define una ruta individual con su path y componente
// Navigate: componente para redireccion programatica
import { Routes, Route, Navigate } from 'react-router-dom'

// Hook personalizado para acceder al contexto de autenticacion
import { useAuth } from './context/AuthContext'

// Componente de layout principal que envuelve las paginas autenticadas
import Layout from './components/Layout'

// Importacion de todas las paginas de la aplicacion
import Login from './pages/Login'           // Pagina de inicio de sesion
import MyCases from './pages/MyCases'       // Lista de casos del cliente
import CaseDetail from './pages/CaseDetail' // Detalle de un caso especifico
import MyDocuments from './pages/MyDocuments' // Documentos del cliente
import MyInvoices from './pages/MyInvoices'   // Facturas del cliente
import Messages from './pages/Messages'       // Sistema de mensajeria
import Profile from './pages/Profile'         // Perfil del usuario

/**
 * Componente PrivateRoute - Protege rutas que requieren autenticacion
 *
 * @param children - Elementos hijos que se renderizaran si el usuario esta autenticado
 *
 * Funcionamiento:
 * 1. Verifica si la autenticacion esta cargando (isLoading)
 * 2. Si esta cargando, muestra un spinner de carga
 * 3. Si el usuario esta autenticado, renderiza los hijos
 * 4. Si no esta autenticado, redirige a la pagina de login
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  // Obtiene el estado de autenticacion del contexto
  const { isAuthenticated, isLoading } = useAuth()

  // Mientras se verifica la autenticacion, muestra un indicador de carga
  // Esto evita parpadeos o redirecciones incorrectas mientras se carga el estado
  if (isLoading) {
    return (
      // Contenedor centrado con altura minima de pantalla completa
      <div className="min-h-screen flex items-center justify-center">
        {/* Spinner animado usando clases de Tailwind */}
        {/* animate-spin: rotacion continua */}
        {/* rounded-full: forma circular */}
        {/* border-b-2: borde inferior que crea el efecto de spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Si esta autenticado, renderiza los componentes hijos
  // Si no, redirige a /login usando el componente Navigate
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

/**
 * Componente App - Componente raiz que define la estructura de rutas
 *
 * Estructura de rutas:
 * - /login: Pagina de inicio de sesion (publica)
 * - / (raiz): Redirige automaticamente a /cases
 * - /cases: Lista de casos del cliente
 * - /cases/:id: Detalle de un caso especifico (id dinamico)
 * - /documents: Documentos del cliente
 * - /invoices: Facturas del cliente
 * - /messages: Sistema de mensajeria
 * - /profile: Perfil del usuario
 * - * (cualquier otra ruta): Redirige a la raiz
 */
function App() {
  return (
    // Routes es el contenedor principal de todas las definiciones de rutas
    <Routes>
      {/* Ruta publica para inicio de sesion - no requiere autenticacion */}
      <Route path="/login" element={<Login />} />

      {/* Ruta raiz protegida - requiere autenticacion */}
      {/* El Layout envuelve todas las rutas hijas autenticadas */}
      <Route
        path="/"
        element={
          // PrivateRoute verifica la autenticacion antes de mostrar el Layout
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Ruta index: cuando se accede a "/" exactamente, redirige a /cases */}
        {/* replace: reemplaza la entrada actual en el historial en lugar de agregar una nueva */}
        <Route index element={<Navigate to="/cases" replace />} />

        {/* Rutas anidadas dentro del Layout */}
        {/* Estas rutas se renderizan dentro del Outlet del componente Layout */}
        <Route path="cases" element={<MyCases />} />

        {/* Ruta dinamica con parametro :id para ver detalles de un caso especifico */}
        <Route path="cases/:id" element={<CaseDetail />} />

        {/* Ruta para la pagina de documentos */}
        <Route path="documents" element={<MyDocuments />} />

        {/* Ruta para la pagina de facturas */}
        <Route path="invoices" element={<MyInvoices />} />

        {/* Ruta para el sistema de mensajeria */}
        <Route path="messages" element={<Messages />} />

        {/* Ruta para el perfil del usuario */}
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Ruta comodin - captura cualquier ruta no definida */}
      {/* Redirige a la raiz con replace para no afectar el historial */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Exportacion del componente App como exportacion por defecto
export default App
