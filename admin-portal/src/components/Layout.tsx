/**
 * Layout.tsx - Componente de diseno principal de la aplicacion
 *
 * Este archivo define la estructura visual principal del portal de administracion.
 * Incluye la barra lateral de navegacion (sidebar), el encabezado movil y el area
 * de contenido principal. Tambien maneja la verificacion de permisos de acceso
 * a rutas segun el rol del usuario autenticado.
 *
 * Funcionalidades principales:
 * - Navegacion lateral con iconos y enlaces a las diferentes secciones
 * - Soporte para dispositivos moviles con sidebar colapsable
 * - Filtrado de elementos de navegacion basado en permisos del usuario
 * - Redireccion automatica si el usuario intenta acceder a rutas no permitidas
 * - Seccion de perfil de usuario con opcion de cerrar sesion
 */

// Importacion de componentes de React Router para navegacion
// Outlet: renderiza las rutas hijas dentro del layout
// NavLink: crea enlaces de navegacion con estado activo
// useNavigate: hook para navegacion programatica
// useLocation: hook para obtener la ruta actual
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'

// Importacion del hook personalizado useAuth para acceder al contexto de autenticacion
import { useAuth } from '../context/AuthContext'

// Importacion de funciones y tipos del sistema de permisos
// hasPermission: verifica si un rol tiene un permiso especifico
// canAccessRoute: verifica si un rol puede acceder a una ruta
// Permission: tipo que define los permisos disponibles
// Role: tipo que define los roles de usuario
import { hasPermission, canAccessRoute, type Permission, type Role } from '../lib/permissions'

// Importacion de iconos de la biblioteca lucide-react
// Cada icono representa una seccion o accion en la navegacion
import {
  LayoutDashboard,  // Icono para el dashboard/panel principal
  Briefcase,        // Icono para la seccion de casos
  FileText,         // Icono para la seccion de documentos
  Clock,            // Icono para el registro de tiempo
  Receipt,          // Icono para facturacion
  Calendar,         // Icono para el calendario
  MessageSquare,    // Icono para mensajes
  BarChart3,        // Icono para analytics/estadisticas
  Users,            // Icono para gestion de equipo/usuarios
  User,             // Icono para el perfil de usuario
  LogOut,           // Icono para cerrar sesion
  Menu,             // Icono de menu hamburguesa para movil
  X,                // Icono X para cerrar el sidebar movil
} from 'lucide-react'

// Importacion de hooks de React
// useState: para manejar el estado local del componente
// useEffect: para ejecutar efectos secundarios (verificacion de permisos)
import { useState, useEffect } from 'react'

// Importacion de clsx para combinar clases CSS de forma condicional
import clsx from 'clsx'

// Definicion del array de navegacion
// Cada objeto contiene:
// - name: nombre a mostrar en el menu
// - href: ruta a la que enlaza
// - icon: componente de icono a mostrar
// - permission: permiso requerido para ver este item (null = visible para todos)
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { name: 'Casos', href: '/cases', icon: Briefcase, permission: 'cases.view' as Permission },
  { name: 'Documentos', href: '/documents', icon: FileText, permission: 'documents.view' as Permission },
  { name: 'Tiempo', href: '/time', icon: Clock, permission: 'time.view' as Permission },
  { name: 'Facturacion', href: '/invoices', icon: Receipt, permission: 'invoices.view' as Permission },
  { name: 'Calendario', href: '/calendar', icon: Calendar, permission: 'calendar.view' as Permission },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, permission: 'messages.view' as Permission },
  { name: 'Equipo', href: '/users', icon: Users, permission: 'users.view' as Permission },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'analytics.view' as Permission },
]

/**
 * Componente Layout - Estructura principal de la aplicacion
 *
 * Este componente envuelve todas las paginas del portal de administracion
 * y proporciona la navegacion lateral, el encabezado y el area de contenido.
 *
 * @returns JSX.Element - El componente de layout renderizado
 */
export default function Layout() {
  // Extrae el usuario actual y la funcion de logout del contexto de autenticacion
  const { user, logout } = useAuth()

  // Hook para realizar navegacion programatica (redireccion)
  const navigate = useNavigate()

  // Hook para obtener informacion sobre la ubicacion/ruta actual
  const location = useLocation()

  // Estado local para controlar si el sidebar esta abierto en dispositivos moviles
  // Por defecto esta cerrado (false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Extrae el rol del usuario y lo convierte al tipo Role
  // Puede ser undefined si no hay usuario autenticado
  const userRole = user?.role as Role | undefined

  // Efecto para verificar el acceso a la ruta actual
  // Se ejecuta cada vez que cambia la ruta, el rol del usuario o el estado de autenticacion
  useEffect(() => {
    // Si hay un usuario autenticado pero no puede acceder a la ruta actual
    if (user && !canAccessRoute(userRole, location.pathname)) {
      // Redirige al dashboard reemplazando la entrada en el historial
      // replace: true evita que el usuario pueda volver atras a la ruta no permitida
      navigate('/', { replace: true })
    }
  }, [location.pathname, userRole, user, navigate])

  /**
   * Manejador para el evento de cerrar sesion
   * Llama a la funcion logout del contexto y redirige al login
   */
  const handleLogout = async () => {
    // Espera a que se complete el proceso de logout
    await logout()
    // Redirige a la pagina de login
    navigate('/login')
  }

  // Filtra los elementos de navegacion segun los permisos del usuario
  // Solo muestra los items que el usuario tiene permiso de ver
  const filteredNavigation = navigation.filter(item => {
    // Si el item no requiere permiso (permission es null), mostrarlo siempre
    if (!item.permission) return true
    // Si requiere permiso, verificar que el usuario lo tenga
    return hasPermission(userRole, item.permission)
  })

  return (
    // Contenedor principal con altura minima de pantalla completa y fondo gris
    <div className="min-h-screen bg-gray-100">
      {/*
        Fondo oscuro semi-transparente para el sidebar en movil
        Solo se muestra cuando el sidebar esta abierto
        Al hacer clic en el fondo, se cierra el sidebar
      */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/*
        Sidebar - Barra lateral de navegacion
        - En desktop (lg:) siempre visible
        - En movil, se muestra/oculta con animacion de desplazamiento
      */}
      <div
        className={clsx(
          // Estilos base: posicion fija, ancho de 64 unidades, fondo oscuro
          'fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 transform transition-transform lg:translate-x-0',
          // Condicion: si esta abierto, mostrarlo; si no, ocultarlo fuera de la pantalla
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/*
            Seccion del logo y boton de cerrar
            Contiene el nombre de la aplicacion y el boton X para cerrar en movil
          */}
          <div className="flex h-16 items-center justify-between px-4">
            {/* Logo/nombre de la aplicacion */}
            <span className="text-xl font-bold text-white">LegalFlow</span>
            {/* Boton para cerrar el sidebar, solo visible en movil */}
            <button
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/*
            Seccion de navegacion principal
            Contiene todos los enlaces filtrados segun los permisos del usuario
          */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {/* Itera sobre los elementos de navegacion filtrados */}
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                // Cierra el sidebar al hacer clic en un enlace (importante para movil)
                onClick={() => setSidebarOpen(false)}
                // Funcion que retorna las clases CSS segun si el enlace esta activo
                className={({ isActive }) =>
                  clsx(
                    // Estilos base del enlace
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    // Estilos condicionales segun si esta activo o no
                    isActive
                      ? 'bg-primary-800 text-white'  // Enlace activo: fondo mas claro
                      : 'text-primary-100 hover:bg-primary-800 hover:text-white'  // Enlace inactivo
                  )
                }
              >
                {/* Renderiza el icono del item con margen derecho */}
                <item.icon className="mr-3 h-5 w-5" />
                {/* Nombre del item de navegacion */}
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/*
            Seccion de usuario en la parte inferior del sidebar
            Muestra informacion del usuario actual y opcion de cerrar sesion
          */}
          <div className="border-t border-primary-800 p-4">
            {/* Enlace al perfil del usuario */}
            <NavLink
              to="/profile"
              className="flex items-center text-primary-100 hover:text-white"
            >
              {/* Icono de usuario */}
              <User className="mr-3 h-5 w-5" />
              {/* Informacion del usuario */}
              <div className="flex-1 truncate">
                {/* Nombre completo del usuario */}
                <p className="text-sm font-medium">{user?.full_name}</p>
                {/* Rol del usuario con primera letra en mayuscula */}
                <p className="text-xs text-primary-300 capitalize">{user?.role}</p>
              </div>
            </NavLink>
            {/* Boton para cerrar sesion */}
            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center px-4 py-2 text-sm text-primary-100 hover:bg-primary-800 hover:text-white rounded-lg"
            >
              {/* Icono de logout */}
              <LogOut className="mr-3 h-5 w-5" />
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>

      {/*
        Area de contenido principal
        En desktop tiene padding izquierdo para dejar espacio al sidebar
      */}
      <div className="lg:pl-64">
        {/*
          Encabezado para dispositivos moviles
          Solo visible en pantallas pequenas (lg:hidden)
          Contiene el boton de menu hamburguesa y el logo
        */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 lg:hidden">
          {/* Boton para abrir el sidebar en movil */}
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          {/* Logo/nombre de la aplicacion */}
          <span className="text-lg font-semibold">LegalFlow</span>
        </div>

        {/*
          Contenedor principal de la pagina
          Outlet renderiza el componente de la ruta hija actual
        */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
