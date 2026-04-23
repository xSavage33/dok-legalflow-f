/**
 * types/index.ts - Definiciones de tipos TypeScript
 *
 * Este archivo centraliza todas las interfaces y tipos de TypeScript utilizados
 * en la aplicacion. Proporciona tipado estatico para:
 *
 * - Entidades principales: User, Case, Document, TimeEntry, Invoice, Event, Message
 * - Tipos auxiliares: AuthTokens, PaginatedResponse
 * - Tipos de creacion: UserCreate, MessageCreate
 *
 * Beneficios del tipado centralizado:
 * - Consistencia: Todos los componentes usan los mismos tipos
 * - Autocompletado: El IDE puede sugerir propiedades correctamente
 * - Deteccion de errores: TypeScript detecta errores de tipo en tiempo de compilacion
 * - Documentacion: Los tipos sirven como documentacion del modelo de datos
 *
 * Convencion de nombres:
 * - Interfaces de entidades: PascalCase (User, Case, Document)
 * - Interfaces de creacion: {Entidad}Create (UserCreate, MessageCreate)
 * - Interfaces de respuesta: {Contexto}Response (PaginatedResponse)
 */

/**
 * Interface User - Representa un usuario del sistema
 *
 * Define la estructura de datos de un usuario, ya sea administrador,
 * abogado, paralegal o cliente. El campo 'role' determina los permisos.
 */
export interface User {
  // Identificador unico del usuario (UUID generado por el backend)
  id: string
  // Correo electronico del usuario (unico, se usa para login)
  email: string
  // Nombre del usuario
  first_name: string
  // Apellido del usuario
  last_name: string
  // Nombre completo (calculado por el backend: first_name + ' ' + last_name)
  full_name: string
  // Rol del usuario que determina sus permisos en el sistema
  role: 'admin' | 'partner' | 'associate' | 'paralegal' | 'client'
  // Numero de telefono (opcional)
  phone?: string
  // Indica si la cuenta esta activa (usuarios desactivados no pueden iniciar sesion)
  is_active: boolean
  // Fecha de creacion de la cuenta (formato ISO 8601)
  created_at?: string
  // Lista de permisos adicionales (opcional, normalmente se usan los del rol)
  permissions?: string[]
}

/**
 * Interface UserCreate - Datos necesarios para crear un nuevo usuario
 *
 * Se utiliza en el formulario de creacion de usuarios. El password
 * es obligatorio aqui pero no aparece en la interface User por seguridad.
 */
export interface UserCreate {
  // Email del nuevo usuario (debe ser unico)
  email: string
  // Contrasena inicial del usuario
  password: string
  // Nombre del usuario
  first_name: string
  // Apellido del usuario
  last_name: string
  // Telefono (opcional)
  phone?: string
  // Rol asignado al usuario (como string para flexibilidad)
  role: string
  // Estado activo/inactivo (por defecto true si no se especifica)
  is_active?: boolean
}

/**
 * Interface AuthTokens - Tokens JWT de autenticacion
 *
 * Estructura de los tokens retornados por el endpoint de login.
 * Se almacenan en localStorage para mantener la sesion.
 */
export interface AuthTokens {
  // Token de acceso (corta duracion, ~15-60 minutos)
  // Se envia en el header Authorization de cada peticion
  access: string
  // Token de refresco (larga duracion, ~7 dias)
  // Se usa para obtener nuevos access tokens cuando expiran
  refresh: string
}

/**
 * Interface Case - Representa un caso legal
 *
 * Los casos son la entidad central del sistema. Agrupan documentos,
 * registros de tiempo, eventos y facturacion relacionada con un
 * asunto legal especifico de un cliente.
 */
export interface Case {
  // Identificador unico del caso (UUID)
  id: string
  // Numero de caso (formato: YYYY-NNNN, generado automaticamente)
  case_number: string
  // Titulo o nombre descriptivo del caso
  title: string
  // Descripcion detallada del caso (opcional)
  description?: string
  // Tipo de caso (ej: 'civil', 'criminal', 'family', 'corporate')
  case_type: string
  // Estado actual del caso en el flujo de trabajo
  status: 'active' | 'pending' | 'on_hold' | 'closed' | 'archived'
  // Nivel de prioridad del caso
  priority: 'low' | 'medium' | 'high' | 'urgent'
  // ID del cliente propietario del caso
  client_id: string
  // Nombre del cliente (para mostrar sin hacer join)
  client_name: string
  // Email del cliente (opcional)
  client_email?: string
  // Telefono del cliente (opcional)
  client_phone?: string
  // ID del abogado principal asignado (opcional)
  lead_attorney_id?: string
  // Nombre del abogado principal (para mostrar)
  lead_attorney_name?: string
  // IDs de abogados adicionales asignados al caso
  assigned_attorneys?: string[]
  // Jurisdiccion legal del caso (ej: 'Federal', 'State-CA')
  jurisdiction?: string
  // Tribunal donde se lleva el caso
  court?: string
  // Tipo de facturacion (ej: 'hourly', 'flat_fee', 'contingency')
  billing_type?: string
  // Fecha de apertura del caso (formato ISO 8601)
  opened_date: string
  // Fecha de cierre del caso (null si esta abierto)
  closed_date?: string
  // Fecha de creacion del registro
  created_at: string
  // Fecha de ultima modificacion
  updated_at: string
}

/**
 * Interface Document - Representa un documento del sistema
 *
 * Los documentos pueden estar asociados a un caso o ser generales.
 * El sistema mantiene versionamiento y control de acceso.
 */
export interface Document {
  // Identificador unico del documento (UUID)
  id: string
  // Nombre del documento (puede ser diferente al archivo original)
  name: string
  // Descripcion del contenido del documento (opcional)
  description?: string
  // Categoria del documento (ej: 'contract', 'pleading', 'correspondence')
  category: string
  // Nombre legible de la categoria
  category_display?: string
  // Estado del documento (ej: 'draft', 'final', 'archived')
  status: string
  // Nombre legible del estado
  status_display?: string
  // Nombre original del archivo subido
  original_filename: string
  // Tamano del archivo en bytes
  file_size: number
  // Tipo MIME del archivo (ej: 'application/pdf', 'image/png')
  mime_type?: string
  // Hash del archivo para verificar integridad
  checksum?: string
  // ID del caso asociado (null si es documento general)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
  // ID del documento padre (para documentos relacionados)
  parent_document_id?: string
  // Indica si el documento es confidencial (acceso restringido)
  is_confidential: boolean
  // Indica si el documento esta protegido por privilegio abogado-cliente
  is_privileged: boolean
  // Estado de encriptacion del documento
  encryption_status?: string
  // Etiquetas para clasificacion y busqueda
  tags?: string[]
  // Metadatos adicionales (flexible, definido por el usuario)
  metadata?: Record<string, any>
  // Numero de version actual
  current_version: number
  // ID del usuario que creo el documento
  created_by_id: string
  // Nombre del usuario creador
  created_by_name: string
  // ID del ultimo usuario que modifico el documento
  last_modified_by_id?: string
  // Nombre del ultimo modificador
  last_modified_by_name?: string
  // Fecha de creacion
  created_at: string
  // Fecha de ultima modificacion
  updated_at: string
  // Lista de versiones del documento
  versions?: DocumentVersion[]
  // Lista de usuarios con acceso compartido
  shares?: DocumentShare[]
}

/**
 * Interface DocumentVersion - Representa una version especifica de un documento
 *
 * El sistema mantiene un historial de todas las versiones de cada documento,
 * permitiendo rastrear cambios y revertir si es necesario.
 */
export interface DocumentVersion {
  // Identificador unico de la version
  id: string
  // Numero de version (1, 2, 3, etc.)
  version_number: number
  // Ruta o URL del archivo de esta version
  file: string
  // Tamano del archivo de esta version en bytes
  file_size: number
  // Hash para verificar integridad
  checksum: string
  // Descripcion de los cambios en esta version (opcional)
  changes_description?: string
  // ID del usuario que creo esta version
  created_by_id: string
  // Nombre del usuario que creo esta version
  created_by_name: string
  // Fecha de creacion de esta version
  created_at: string
}

/**
 * Interface DocumentAccessLog - Registro de acceso a documentos
 *
 * Para auditoria y compliance, se registra cada accion realizada
 * sobre los documentos (ver, descargar, editar, etc.)
 */
export interface DocumentAccessLog {
  // Identificador unico del registro de acceso
  id: string
  // Tipo de accion realizada (ej: 'view', 'download', 'edit')
  action: string
  // Nombre legible de la accion
  action_display: string
  // ID del usuario que realizo la accion
  user_id: string
  // Email del usuario
  user_email: string
  // Rol del usuario al momento de la accion
  user_role: string
  // Direccion IP desde donde se realizo la accion
  ip_address?: string
  // Detalles adicionales de la accion
  details?: Record<string, any>
  // Fecha y hora de la accion
  timestamp: string
}

/**
 * Interface DocumentShare - Representa un permiso de acceso compartido
 *
 * Permite compartir documentos con usuarios especificos con diferentes
 * niveles de permiso (ver, descargar, editar).
 */
export interface DocumentShare {
  // Identificador unico del permiso de compartido
  id: string
  // ID del usuario con quien se compartio
  shared_with_user_id: string
  // Email del usuario con quien se compartio
  shared_with_email: string
  // Nivel de permiso otorgado
  permission: 'view' | 'download' | 'edit'
  // ID del usuario que compartio el documento
  shared_by_id: string
  // Nombre del usuario que compartio
  shared_by_name: string
  // Fecha de expiracion del permiso (null = no expira)
  expires_at?: string
  // Fecha en que se compartio
  created_at: string
}

/**
 * Interface TimeEntry - Representa un registro de tiempo trabajado
 *
 * Los abogados registran el tiempo dedicado a cada caso para
 * facturacion y seguimiento de productividad.
 */
export interface TimeEntry {
  // Identificador unico del registro de tiempo
  id: string
  // ID del usuario que registro el tiempo
  user_id: string
  // Nombre del usuario
  user_name: string
  // ID del caso asociado (opcional, puede ser tiempo administrativo)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
  // Fecha del trabajo realizado (formato YYYY-MM-DD)
  date: string
  // Duracion en minutos (usado internamente)
  duration_minutes: number
  // Duracion en horas (para mostrar y facturar)
  duration_hours: number
  // Descripcion del trabajo realizado
  description: string
  // Tipo de actividad (ej: 'research', 'drafting', 'meeting', 'court')
  activity_type: string
  // Indica si el tiempo es facturable al cliente
  is_billable: boolean
  // Tarifa por hora aplicable (del abogado o del caso)
  hourly_rate?: number
  // Monto calculado (duration_hours * hourly_rate)
  amount?: number
  // Estado del registro (ej: 'draft', 'submitted', 'approved', 'billed')
  status: string
}

/**
 * Interface Timer - Representa un temporizador activo
 *
 * Permite a los usuarios registrar tiempo en tiempo real mientras trabajan,
 * sin necesidad de calcular manualmente la duracion.
 */
export interface Timer {
  // Identificador unico del temporizador
  id: string
  // ID del usuario propietario del temporizador
  user_id: string
  // ID del caso asociado (opcional)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
  // Descripcion del trabajo (opcional, se puede agregar al detener)
  description?: string
  // Indica si el temporizador esta activo
  is_running: boolean
  // Fecha y hora de inicio (formato ISO 8601)
  start_time: string
  // Tiempo transcurrido en segundos
  elapsed_seconds: number
  // Tiempo transcurrido en minutos (para compatibilidad)
  elapsed_minutes: number
}

/**
 * Interface Invoice - Representa una factura
 *
 * Las facturas se generan a partir de registros de tiempo aprobados
 * y gastos. Pueden tener diferentes estados de pago.
 */
export interface Invoice {
  // Identificador unico de la factura
  id: string
  // Numero de factura (formato: INV-YYYY-NNNN)
  invoice_number: string
  // Nombre del cliente a facturar
  client_name: string
  // Numero del caso asociado (opcional, puede abarcar varios casos)
  case_number?: string
  // Estado de la factura (ej: 'draft', 'sent', 'paid', 'overdue', 'cancelled')
  status: string
  // Monto total de la factura
  total_amount: number
  // Saldo pendiente de pago
  balance_due: number
  // Fecha de emision de la factura
  issue_date: string
  // Fecha de vencimiento para el pago
  due_date: string
}

/**
 * Interface Event - Representa un evento de calendario
 *
 * Los eventos pueden ser audiencias, reuniones, plazos, citas con clientes, etc.
 * Pueden estar asociados a casos especificos.
 */
export interface Event {
  // Identificador unico del evento
  id: string
  // Titulo del evento
  title: string
  // Descripcion detallada del evento (opcional)
  description?: string
  // Tipo de evento (ej: 'hearing', 'meeting', 'deadline', 'appointment')
  event_type: string
  // Estado del evento (ej: 'scheduled', 'completed', 'cancelled')
  status: string
  // Fecha y hora de inicio (formato ISO 8601)
  start_datetime: string
  // Fecha y hora de fin (opcional para eventos sin duracion definida)
  end_datetime?: string
  // Ubicacion del evento (direccion, sala de videoconferencia, etc.)
  location?: string
  // ID del caso asociado (opcional)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
}

/**
 * Interface Deadline - Representa un plazo o fecha limite
 *
 * Los plazos son criticos en el trabajo legal. Esta interface permite
 * rastrear fechas limite con sus prioridades y estados.
 */
export interface Deadline {
  // Identificador unico del plazo
  id: string
  // Titulo del plazo
  title: string
  // Descripcion detallada (opcional)
  description?: string
  // Nivel de prioridad (ej: 'low', 'medium', 'high', 'critical')
  priority: string
  // Estado del plazo (ej: 'pending', 'completed', 'extended')
  status: string
  // Fecha limite (formato YYYY-MM-DD)
  due_date: string
  // ID del caso asociado (opcional)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
  // Dias restantes hasta la fecha limite (calculado)
  days_remaining?: number
  // Indica si el plazo ya vencio
  is_overdue: boolean
}

/**
 * Interface Message - Representa un mensaje interno
 *
 * Sistema de mensajeria interna entre usuarios del bufete y clientes.
 * Puede estar asociado a casos para mantener la comunicacion organizada.
 */
export interface Message {
  // Identificador unico del mensaje
  id: string
  // ID del usuario que envio el mensaje
  sender_id: string
  // Nombre del remitente
  sender_name: string
  // Rol del remitente
  sender_role: string
  // ID del usuario destinatario
  recipient_id: string
  // Nombre del destinatario
  recipient_name: string
  // ID del caso asociado (opcional)
  case_id?: string
  // Numero del caso asociado
  case_number?: string
  // Asunto del mensaje
  subject: string
  // Contenido del mensaje
  content: string
  // Estado del mensaje
  status: 'sent' | 'delivered' | 'read'
  // Nombre legible del estado
  status_display?: string
  // Fecha y hora en que se leyo el mensaje (null si no se ha leido)
  read_at?: string
  // ID del mensaje al que responde (para hilos de conversacion)
  parent_message_id?: string
  // Fecha de creacion del mensaje
  created_at: string
}

/**
 * Interface MessageCreate - Datos necesarios para crear un mensaje
 *
 * Se utiliza en el formulario de composicion de mensajes.
 * No incluye sender ya que se obtiene del usuario autenticado.
 */
export interface MessageCreate {
  // ID del destinatario
  recipient_id: string
  // Nombre del destinatario (para referencia)
  recipient_name: string
  // ID del caso asociado (opcional)
  case_id?: string
  // Numero del caso asociado (opcional)
  case_number?: string
  // Asunto del mensaje
  subject: string
  // Contenido del mensaje
  content: string
  // ID del mensaje padre para respuestas (opcional)
  parent_message_id?: string
}

/**
 * Interface PaginatedResponse - Respuesta paginada de la API
 *
 * Estructura generica para respuestas de lista que incluyen paginacion.
 * El parametro de tipo T permite usar esta interface con cualquier entidad.
 *
 * @template T - Tipo de los elementos en el array results
 *
 * @example
 * // Para una lista paginada de casos:
 * const response: PaginatedResponse<Case> = await api.get('/cases/')
 */
export interface PaginatedResponse<T> {
  // Numero total de elementos (no solo en esta pagina)
  count: number
  // URL de la siguiente pagina (null si es la ultima)
  next: string | null
  // URL de la pagina anterior (null si es la primera)
  previous: string | null
  // Array de elementos de la pagina actual
  results: T[]
}
