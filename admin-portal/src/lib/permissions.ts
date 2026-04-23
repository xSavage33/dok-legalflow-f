/**
 * permissions.ts - Sistema de permisos basado en roles (RBAC)
 *
 * Este archivo implementa un sistema de control de acceso basado en roles
 * (Role-Based Access Control - RBAC) para el portal de administracion.
 *
 * Jerarquia de roles y sus capacidades:
 *
 * - admin: Acceso total al sistema
 *   - Puede gestionar usuarios (crear, editar, eliminar)
 *   - Acceso completo a todas las funcionalidades
 *
 * - partner: Casi acceso total (socio del bufete)
 *   - Puede ver usuarios pero NO gestionarlos
 *   - Acceso completo a casos, documentos, tiempo, facturacion, calendario, mensajes y analytics
 *
 * - associate: Abogado asociado
 *   - Acceso a casos (crear, ver, editar, pero no eliminar)
 *   - Acceso a documentos, tiempo y calendario
 *   - Solo puede ver facturas, no crearlas ni editarlas
 *   - Sin acceso a usuarios ni analytics
 *
 * - paralegal: Asistente legal
 *   - Solo puede ver casos (no crear/editar/eliminar)
 *   - Puede crear y editar documentos
 *   - Puede registrar tiempo (pero no editarlo)
 *   - Sin acceso a facturacion, usuarios ni analytics
 *
 * - client: Cliente (NO tiene acceso al admin portal)
 *   - Solo accede al portal de clientes, no a este sistema
 *
 * Uso: Importar las funciones hasPermission, canAccessRoute, etc.
 * para verificar permisos antes de mostrar elementos o permitir acciones.
 */

/**
 * Tipo que define los roles de usuario disponibles en el sistema
 * Estos roles corresponden a los definidos en el backend
 */
export type Role = 'admin' | 'partner' | 'associate' | 'paralegal' | 'client'

/**
 * Tipo que define todos los permisos disponibles en el sistema
 *
 * Formato: {modulo}.{accion}
 * - modulo: area funcional del sistema (users, cases, documents, etc.)
 * - accion: operacion permitida (view, create, edit, delete)
 *
 * Esta estructura permite un control granular sobre las acciones
 * que cada rol puede realizar en cada seccion del sistema.
 */
export type Permission =
  // Permisos de usuarios - Gestion del equipo
  | 'users.view'      // Ver lista de usuarios
  | 'users.create'    // Crear nuevos usuarios
  | 'users.edit'      // Editar usuarios existentes
  | 'users.delete'    // Eliminar usuarios
  // Permisos de casos - Gestion de casos legales
  | 'cases.view'      // Ver lista de casos
  | 'cases.create'    // Crear nuevos casos
  | 'cases.edit'      // Editar casos existentes
  | 'cases.delete'    // Eliminar/archivar casos
  // Permisos de documentos - Gestion documental
  | 'documents.view'   // Ver documentos
  | 'documents.create' // Subir nuevos documentos
  | 'documents.edit'   // Editar metadatos de documentos
  | 'documents.delete' // Eliminar documentos
  // Permisos de tiempo - Registro de horas
  | 'time.view'       // Ver registros de tiempo
  | 'time.create'     // Crear entradas de tiempo
  | 'time.edit'       // Editar entradas de tiempo
  // Permisos de facturacion
  | 'invoices.view'   // Ver facturas
  | 'invoices.create' // Crear facturas
  | 'invoices.edit'   // Editar facturas
  // Permisos de calendario
  | 'calendar.view'   // Ver calendario y eventos
  | 'calendar.create' // Crear eventos
  | 'calendar.edit'   // Editar eventos
  // Permisos de mensajeria
  | 'messages.view'   // Ver mensajes
  | 'messages.create' // Enviar mensajes
  // Permisos de analytics
  | 'analytics.view'  // Ver reportes y estadisticas

/**
 * Mapa que define los permisos asignados a cada rol
 *
 * Esta es la configuracion central del sistema de permisos.
 * Cada rol tiene un array de permisos que determinan que acciones
 * puede realizar el usuario con ese rol.
 *
 * Record<Role, Permission[]> garantiza que todos los roles tengan
 * una definicion de permisos (aunque sea un array vacio).
 */
const rolePermissions: Record<Role, Permission[]> = {
  // Administrador: acceso completo a todo el sistema
  admin: [
    'users.view', 'users.create', 'users.edit', 'users.delete',  // Gestion completa de usuarios
    'cases.view', 'cases.create', 'cases.edit', 'cases.delete',  // Gestion completa de casos
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete',  // Gestion completa de documentos
    'time.view', 'time.create', 'time.edit',  // Gestion completa de tiempo
    'invoices.view', 'invoices.create', 'invoices.edit',  // Gestion completa de facturacion
    'calendar.view', 'calendar.create', 'calendar.edit',  // Gestion completa de calendario
    'messages.view', 'messages.create',  // Acceso completo a mensajeria
    'analytics.view',  // Acceso a reportes y estadisticas
  ],

  // Socio: casi acceso total, pero no puede gestionar usuarios
  partner: [
    'users.view',  // Solo puede ver usuarios, NO crear/editar/eliminar
    'cases.view', 'cases.create', 'cases.edit', 'cases.delete',  // Gestion completa de casos
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete',  // Gestion completa de documentos
    'time.view', 'time.create', 'time.edit',  // Gestion completa de tiempo
    'invoices.view', 'invoices.create', 'invoices.edit',  // Gestion completa de facturacion
    'calendar.view', 'calendar.create', 'calendar.edit',  // Gestion completa de calendario
    'messages.view', 'messages.create',  // Acceso completo a mensajeria
    'analytics.view',  // Acceso a reportes
  ],

  // Abogado asociado: acceso limitado, enfocado en trabajo diario
  associate: [
    'cases.view', 'cases.create', 'cases.edit',  // Casos: puede crear y editar, pero NO eliminar
    'documents.view', 'documents.create', 'documents.edit',  // Documentos: puede crear y editar, pero NO eliminar
    'time.view', 'time.create', 'time.edit',  // Gestion completa de su tiempo
    'invoices.view',  // Solo ver facturas, NO crear/editar (la facturacion la hace admin/partner)
    'calendar.view', 'calendar.create', 'calendar.edit',  // Gestion completa de calendario
    'messages.view', 'messages.create',  // Acceso completo a mensajeria
    // Sin acceso a: users, analytics
  ],

  // Asistente legal: acceso basico para tareas de apoyo
  paralegal: [
    'cases.view',  // Solo ver casos, NO crear/editar/eliminar
    'documents.view', 'documents.create', 'documents.edit',  // Puede gestionar documentos
    'time.view', 'time.create',  // Puede ver y registrar tiempo, pero NO editar
    'calendar.view', 'calendar.create',  // Puede ver y crear eventos, pero NO editar
    'messages.view', 'messages.create',  // Acceso completo a mensajeria
    // Sin acceso a: users, invoices, analytics
  ],

  // Cliente: no tiene acceso al portal de administracion
  // Los clientes usan el portal de clientes separado
  client: [],
}

/**
 * Verifica si un rol tiene un permiso especifico
 *
 * Esta es la funcion principal para verificar permisos.
 * Se usa para mostrar/ocultar elementos de UI y para validar acciones.
 *
 * @param role - Rol del usuario (puede ser undefined si no esta autenticado)
 * @param permission - Permiso a verificar
 * @returns true si el rol tiene el permiso, false en caso contrario
 *
 * @example
 * if (hasPermission(user.role, 'users.create')) {
 *   // Mostrar boton de crear usuario
 * }
 */
export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  // Si no hay rol definido, no tiene ningun permiso
  if (!role) return false
  // Busca si el permiso existe en el array de permisos del rol
  // El operador ?? [] asegura que no falle si el rol no existe
  return rolePermissions[role]?.includes(permission) ?? false
}

/**
 * Verifica si un rol tiene AL MENOS UNO de los permisos especificados
 *
 * Util cuando una accion puede ser realizada por usuarios con diferentes permisos.
 *
 * @param role - Rol del usuario
 * @param permissions - Array de permisos a verificar
 * @returns true si tiene al menos uno de los permisos
 *
 * @example
 * // Puede ver la seccion si puede ver o crear casos
 * if (hasAnyPermission(user.role, ['cases.view', 'cases.create'])) {
 *   // Mostrar seccion
 * }
 */
export function hasAnyPermission(role: Role | undefined, permissions: Permission[]): boolean {
  // Si no hay rol, no tiene ningun permiso
  if (!role) return false
  // Usa some() para verificar si al menos un permiso coincide
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Verifica si un rol tiene TODOS los permisos especificados
 *
 * Util cuando una accion requiere multiples permisos combinados.
 *
 * @param role - Rol del usuario
 * @param permissions - Array de permisos requeridos
 * @returns true solo si tiene TODOS los permisos
 *
 * @example
 * // Solo puede aprobar facturas si puede ver Y editar
 * if (hasAllPermissions(user.role, ['invoices.view', 'invoices.edit'])) {
 *   // Mostrar boton de aprobar
 * }
 */
export function hasAllPermissions(role: Role | undefined, permissions: Permission[]): boolean {
  // Si no hay rol, no tiene ningun permiso
  if (!role) return false
  // Usa every() para verificar que TODOS los permisos coincidan
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Configuracion de items de navegacion con sus permisos requeridos
 *
 * Este array define la estructura de navegacion del sidebar y los permisos
 * necesarios para acceder a cada seccion. Se usa tanto para renderizar
 * el menu como para validar el acceso a las rutas.
 *
 * Cada item tiene:
 * - name: Nombre a mostrar en el menu
 * - href: Ruta de la URL
 * - permission: Permiso requerido (null = accesible para todos)
 */
export const navigationItems = [
  // Dashboard: accesible para todos los usuarios autenticados
  { name: 'Dashboard', href: '/', permission: null },
  // Resto de secciones con sus permisos de visualizacion
  { name: 'Casos', href: '/cases', permission: 'cases.view' as Permission },
  { name: 'Documentos', href: '/documents', permission: 'documents.view' as Permission },
  { name: 'Tiempo', href: '/time', permission: 'time.view' as Permission },
  { name: 'Facturacion', href: '/invoices', permission: 'invoices.view' as Permission },
  { name: 'Calendario', href: '/calendar', permission: 'calendar.view' as Permission },
  { name: 'Mensajes', href: '/messages', permission: 'messages.view' as Permission },
  { name: 'Equipo', href: '/users', permission: 'users.view' as Permission },
  { name: 'Analytics', href: '/analytics', permission: 'analytics.view' as Permission },
]

/**
 * Verifica si un usuario puede acceder a una ruta especifica
 *
 * Esta funcion se usa en el Layout para redirigir usuarios que intentan
 * acceder a rutas no permitidas. Tambien puede usarse para proteger
 * rutas programaticamente.
 *
 * @param role - Rol del usuario
 * @param path - Ruta de la URL a verificar (ej: '/cases', '/users/123')
 * @returns true si el usuario puede acceder a la ruta
 *
 * @example
 * if (!canAccessRoute(user.role, '/users')) {
 *   navigate('/') // Redirigir al dashboard
 * }
 */
export function canAccessRoute(role: Role | undefined, path: string): boolean {
  // Si no hay rol definido, no puede acceder a nada
  if (!role) return false

  // El dashboard (ruta raiz) siempre es accesible para usuarios autenticados
  if (path === '/') return true

  // Busca si la ruta coincide con alguno de los items de navegacion
  // Usa startsWith para manejar sub-rutas (ej: /cases/123 coincide con /cases)
  // Excluye la ruta raiz '/' para evitar que todas las rutas coincidan
  const item = navigationItems.find(nav => path.startsWith(nav.href) && nav.href !== '/')

  // Si la ruta no esta en la lista de navegacion, permitir acceso
  // Esto permite rutas como /profile que no estan en el menu principal
  if (!item) return true

  // Si el item no requiere permiso especifico, permitir acceso
  if (!item.permission) return true

  // Verificar si el rol tiene el permiso requerido para esta ruta
  return hasPermission(role, item.permission)
}
