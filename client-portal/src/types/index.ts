/**
 * ARCHIVO: types/index.ts
 * PROPOSITO: Definiciones de tipos TypeScript para toda la aplicacion.
 * Contiene interfaces que definen la estructura de datos de usuarios,
 * casos, documentos, facturas, mensajes y respuestas del API.
 * Estos tipos proporcionan seguridad de tipos en tiempo de compilacion.
 */

// ========== INTERFAZ: USUARIO ==========

/**
 * Interfaz que define la estructura de un usuario
 * Utilizada para el usuario autenticado y datos de cliente
 */
export interface User {
  // Identificador unico del usuario (UUID o numerico)
  id: string

  // Correo electronico del usuario (usado para login)
  email: string

  // Nombre de pila del usuario
  first_name: string

  // Apellido del usuario
  last_name: string

  // Nombre completo concatenado (opcional, puede calcularse en el backend)
  full_name?: string

  // Rol del usuario en el sistema
  // 'client': cliente del despacho
  // 'associate': abogado asociado
  // 'partner': socio del despacho
  // 'admin': administrador del sistema
  role: 'client' | 'associate' | 'partner' | 'admin'

  // Numero de telefono del usuario (opcional)
  phone?: string

  // Indica si la cuenta del usuario esta activa (opcional)
  is_active?: boolean

  // Fecha de creacion del usuario en formato ISO (opcional)
  created_at?: string

  // Fecha de ultima actualizacion en formato ISO (opcional)
  updated_at?: string
}

// ========== INTERFAZ: RESPUESTA DE AUTENTICACION ==========

/**
 * Interfaz que define la respuesta del endpoint de login
 * Contiene el mensaje de confirmacion, datos del usuario y tokens JWT
 */
export interface AuthResponse {
  // Mensaje de confirmacion del servidor
  message: string

  // Datos del usuario autenticado
  user: User

  // Tokens JWT para autenticacion
  tokens: {
    // Token de acceso - corta duracion (15-60 minutos tipicamente)
    // Se usa en el header Authorization de las peticiones
    access: string

    // Token de refresco - larga duracion (dias o semanas)
    // Se usa para obtener un nuevo access token cuando expira
    refresh: string
  }
}

// ========== INTERFAZ: CASO LEGAL ==========

/**
 * Interfaz que define la estructura de un caso legal
 * Representa un expediente o asunto legal del cliente
 */
export interface Case {
  // Identificador unico del caso
  id: string

  // Numero de expediente o caso (ej: "CASO-2024-001")
  case_number: string

  // Titulo descriptivo del caso
  title: string

  // Tipo de caso (ej: "Civil", "Penal", "Laboral", etc.)
  case_type: string

  // Estado actual del caso (ej: "active", "pending", "closed")
  status: string

  // Descripcion detallada del caso (opcional)
  description?: string

  // Fecha de creacion del caso en formato ISO
  created_at: string

  // Fecha de ultima actualizacion en formato ISO
  updated_at: string

  // ID del abogado principal asignado (opcional)
  lead_attorney_id?: string

  // Nombre del abogado principal (opcional, para mostrar en UI)
  lead_attorney_name?: string

  // ID del cliente asociado al caso (opcional)
  client_id?: string

  // Nombre del cliente (opcional, para mostrar en UI)
  client_name?: string
}

// ========== INTERFAZ: DOCUMENTO ==========

/**
 * Interfaz que define la estructura de un documento
 * Representa archivos asociados a casos o al cliente
 */
export interface Document {
  // Identificador unico del documento
  id: string

  // Nombre del documento (ej: "Contrato de Servicios.pdf")
  name: string

  // Categoria del documento (ej: "contract", "pleading", "evidence")
  category: string

  // Estado del documento (ej: "draft", "final", "archived")
  status: string

  // Ruta del archivo en el servidor (opcional)
  file_path?: string

  // Tamano del archivo en bytes (opcional)
  file_size?: number

  // Nombre original del archivo con extension (ej: "contrato.pdf")
  original_filename?: string

  // Tipo MIME del archivo (ej: "application/pdf") (opcional)
  mime_type?: string

  // Numero de version del documento
  version: number

  // Fecha de creacion en formato ISO
  created_at: string

  // Fecha de ultima actualizacion en formato ISO
  updated_at: string

  // ID del caso asociado (opcional, un documento puede no tener caso)
  case_id?: string

  // Numero de caso asociado (opcional, para mostrar en UI)
  case_number?: string

  // ID del usuario que subio el documento (opcional)
  uploaded_by_id?: string

  // Nombre del usuario que subio el documento (opcional)
  uploaded_by_name?: string
}

// ========== INTERFAZ: FACTURA ==========

/**
 * Interfaz que define la estructura de una factura
 * Representa cargos y pagos por servicios legales
 */
export interface Invoice {
  // Identificador unico de la factura
  id: string

  // Numero de factura (ej: "FAC-2024-001")
  invoice_number: string

  // Estado de la factura (ej: "draft", "sent", "paid", "overdue")
  status: string

  // Fecha de emision en formato ISO (YYYY-MM-DD)
  issue_date: string

  // Fecha de vencimiento en formato ISO (YYYY-MM-DD)
  due_date: string

  // Subtotal antes de impuestos
  subtotal: number

  // Porcentaje de impuesto aplicado (ej: 0.16 para 16%)
  tax_rate: number

  // Monto del impuesto calculado
  tax_amount: number

  // Monto total de la factura (subtotal + impuestos)
  total_amount: number

  // Monto ya pagado
  amount_paid: number

  // Saldo pendiente de pago (total - pagado)
  balance_due: number

  // ID del caso asociado (opcional)
  case_id?: string

  // Numero de caso asociado (opcional)
  case_number?: string

  // ID del cliente (opcional)
  client_id?: string

  // Nombre del cliente (opcional)
  client_name?: string

  // Notas adicionales de la factura (opcional)
  notes?: string
}

// ========== INTERFAZ: REGISTRO DE TIEMPO ==========

/**
 * Interfaz que define la estructura de una entrada de tiempo
 * Representa horas trabajadas en un caso por un abogado
 */
export interface TimeEntry {
  // Identificador unico del registro
  id: string

  // Descripcion del trabajo realizado
  description: string

  // Fecha del trabajo en formato ISO (YYYY-MM-DD)
  date: string

  // Duracion en minutos
  minutes: number

  // Duracion en horas (calculada, opcional)
  duration_hours?: number

  // Indica si el tiempo es facturable al cliente
  billable: boolean

  // Tarifa por hora aplicada (opcional)
  hourly_rate?: number

  // Monto calculado (horas * tarifa) (opcional)
  amount?: number

  // Estado del registro (ej: "draft", "approved", "billed")
  status: string

  // ID del caso asociado (opcional)
  case_id?: string

  // Numero de caso asociado (opcional)
  case_number?: string

  // ID del abogado que registro el tiempo (opcional)
  user_id?: string

  // Nombre del abogado (opcional)
  attorney_name?: string

  // Fecha de creacion del registro en formato ISO
  created_at: string
}

// ========== INTERFAZ: MENSAJE ==========

/**
 * Interfaz que define la estructura de un mensaje
 * Representa comunicaciones entre el cliente y el equipo legal
 */
export interface Message {
  // Identificador unico del mensaje
  id: string

  // Asunto del mensaje
  subject: string

  // Contenido/cuerpo del mensaje
  content: string

  // ID del remitente
  sender_id: string

  // Nombre del remitente (opcional)
  sender_name?: string

  // ID del destinatario
  recipient_id: string

  // Nombre del destinatario (opcional)
  recipient_name?: string

  // ID del caso asociado (opcional)
  case_id?: string

  // Numero de caso asociado (opcional)
  case_number?: string

  // Estado del mensaje (ej: "sent", "read")
  status: string

  // Fecha/hora en que fue leido en formato ISO (null si no leido)
  read_at?: string

  // Fecha de creacion del mensaje en formato ISO
  created_at: string
}

// ========== INTERFAZ: RESPUESTA PAGINADA ==========

/**
 * Interfaz generica para respuestas paginadas del API
 * El parametro de tipo T especifica el tipo de elementos en results
 *
 * @template T - Tipo de los elementos en el array results
 *
 * Ejemplo de uso:
 * PaginatedResponse<Case> - respuesta paginada de casos
 * PaginatedResponse<Document> - respuesta paginada de documentos
 */
export interface PaginatedResponse<T> {
  // Numero total de elementos (en todas las paginas)
  count: number

  // URL de la siguiente pagina (null si no hay mas paginas)
  next: string | null

  // URL de la pagina anterior (null si es la primera pagina)
  previous: string | null

  // Array con los elementos de la pagina actual
  results: T[]
}
