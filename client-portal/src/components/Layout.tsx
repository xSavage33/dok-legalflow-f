/**
 * ARCHIVO: Layout.tsx
 * PROPOSITO: Componente de layout principal que proporciona la estructura
 * de navegacion de la aplicacion, incluyendo sidebar (barra lateral),
 * header movil y area de contenido principal.
 * Implementa un diseno responsivo con diferentes vistas para movil y escritorio.
 */

// useState - Hook de React para manejar el estado local del componente
import { useState } from 'react'

// Importaciones de React Router
// Outlet: renderiza los componentes hijos de las rutas anidadas
// NavLink: enlace de navegacion que aplica estilos cuando esta activo
// useNavigate: hook para navegacion programatica
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

// Hook personalizado para acceder al contexto de autenticacion
import { useAuth } from '../context/AuthContext'

// Iconos de la biblioteca Lucide React
// Briefcase: icono de maletin para casos
// FileText: icono de documento para documentos
// Receipt: icono de recibo para facturas
// MessageSquare: icono de mensaje para mensajes
// User: icono de usuario para perfil
// LogOut: icono de salida para cerrar sesion
// Menu: icono de hamburguesa para menu movil
// X: icono de cerrar para cerrar sidebar movil
// Scale: icono de balanza (logo legal)
import {
  Briefcase,
  FileText,
  Receipt,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  Scale,
} from 'lucide-react'

// clsx - utilidad para construir cadenas de clases CSS condicionalmente
import clsx from 'clsx'

/**
 * Configuracion de los elementos de navegacion
 * Cada elemento contiene:
 * - name: nombre mostrado en el menu
 * - href: ruta de destino
 * - icon: componente de icono a mostrar
 */
const navigation = [
  { name: 'Mis Casos', href: '/cases', icon: Briefcase },
  { name: 'Mis Documentos', href: '/documents', icon: FileText },
  { name: 'Mis Facturas', href: '/invoices', icon: Receipt },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare },
  { name: 'Mi Perfil', href: '/profile', icon: User },
]

/**
 * Componente Layout - Estructura principal de la aplicacion
 *
 * Caracteristicas:
 * - Sidebar fijo en escritorio (pantallas grandes)
 * - Sidebar deslizable en movil (pantallas pequenas)
 * - Header con menu hamburguesa en movil
 * - Area de contenido principal con Outlet para rutas anidadas
 * - Informacion del usuario y boton de cerrar sesion
 */
export default function Layout() {
  // Obtiene datos del usuario y funcion de logout del contexto de autenticacion
  const { user, logout } = useAuth()

  // Hook para navegacion programatica (redireccionar despues de logout)
  const navigate = useNavigate()

  // Estado para controlar si el sidebar movil esta abierto o cerrado
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /**
   * Manejador para cerrar sesion
   * Ejecuta el logout y redirige a la pagina de login
   */
  const handleLogout = () => {
    logout()           // Limpia los tokens y el estado del usuario
    navigate('/login') // Redirige a la pagina de inicio de sesion
  }

  return (
    // Contenedor principal con altura minima de pantalla completa y fondo gris claro
    <div className="min-h-screen bg-gray-50">

      {/* ========== BACKDROP DEL SIDEBAR MOVIL ========== */}
      {/* Solo visible cuando el sidebar movil esta abierto */}
      {/* Al hacer clic, cierra el sidebar */}
      {sidebarOpen && (
        <div
          // fixed inset-0: cubre toda la pantalla
          // z-40: indice z para estar debajo del sidebar pero encima del contenido
          // bg-gray-600 bg-opacity-75: fondo semitransparente oscuro
          // lg:hidden: oculto en pantallas grandes (escritorio)
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========== SIDEBAR MOVIL (DESLIZABLE) ========== */}
      {/* Visible solo en pantallas pequenas (movil/tablet) */}
      <div
        className={clsx(
          // Posicionamiento fijo a la izquierda con ancho de 64 (256px)
          'fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden',
          // Condicion: si esta abierto, posicion normal; si no, oculto a la izquierda
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Encabezado del sidebar movil con logo y boton de cerrar */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {/* Logo y nombre de la aplicacion */}
          <div className="flex items-center gap-2">
            {/* Icono de balanza como logo */}
            <Scale className="h-8 w-8 text-primary-600" />
            {/* Nombre de la aplicacion */}
            <span className="text-xl font-bold text-gray-900">LegalFlow</span>
          </div>
          {/* Boton para cerrar el sidebar movil */}
          <button onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Menu de navegacion del sidebar movil */}
        <nav className="mt-4 px-2">
          {/* Itera sobre los elementos de navegacion */}
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              // Cierra el sidebar al navegar en movil
              onClick={() => setSidebarOpen(false)}
              // Funcion que recibe isActive para aplicar estilos condicionales
              className={({ isActive }) =>
                clsx(
                  // Estilos base para todos los enlaces
                  'flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-colors',
                  // Estilos condicionales basados en si la ruta esta activa
                  isActive
                    ? 'bg-primary-50 text-primary-700'  // Estilo activo
                    : 'text-gray-700 hover:bg-gray-100' // Estilo inactivo
                )
              }
            >
              {/* Renderiza el icono del elemento */}
              <item.icon className="h-5 w-5" />
              {/* Nombre del elemento */}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ========== SIDEBAR DE ESCRITORIO (FIJO) ========== */}
      {/* Visible solo en pantallas grandes (lg y superiores) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        {/* Contenedor del sidebar con borde derecho */}
        <div className="flex flex-col flex-1 bg-white border-r">
          {/* Encabezado del sidebar con logo */}
          <div className="flex items-center gap-2 h-16 px-6 border-b">
            <Scale className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">LegalFlow</span>
          </div>

          {/* Menu de navegacion principal */}
          <nav className="flex-1 mt-4 px-3">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Seccion inferior del sidebar con info del usuario y logout */}
          <div className="p-4 border-t">
            {/* Informacion del usuario */}
            <div className="flex items-center gap-3 mb-3">
              {/* Avatar circular con la inicial del usuario */}
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-700 font-medium">
                  {/* Muestra la primera letra del nombre o email */}
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              {/* Contenedor para nombre y email con overflow oculto */}
              <div className="flex-1 min-w-0">
                {/* Nombre completo del usuario, truncado si es muy largo */}
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                {/* Email del usuario, truncado si es muy largo */}
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            {/* Boton de cerrar sesion */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesion
            </button>
          </div>
        </div>
      </div>

      {/* ========== AREA DE CONTENIDO PRINCIPAL ========== */}
      {/* lg:pl-64 - En escritorio, deja espacio para el sidebar fijo */}
      <div className="lg:pl-64">

        {/* ========== HEADER MOVIL ========== */}
        {/* Solo visible en pantallas pequenas */}
        <div className="sticky top-0 z-30 flex items-center gap-4 h-16 px-4 bg-white border-b lg:hidden">
          {/* Boton hamburguesa para abrir el sidebar movil */}
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-500" />
          </button>
          {/* Logo reducido para movil */}
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-gray-900">LegalFlow</span>
          </div>
        </div>

        {/* ========== CONTENIDO DE LA PAGINA ========== */}
        {/* El Outlet renderiza el componente de la ruta activa */}
        <main className="p-6">
          {/* Outlet es donde se renderizan las rutas hijas definidas en App.tsx */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
