/**
 * =====================================================================
 * COMPONENTE: Invoices (Facturacion)
 * =====================================================================
 *
 * Proposito: Este componente gestiona el sistema de facturacion del despacho
 * de abogados. Permite a los usuarios:
 * - Crear nuevas facturas con items detallados
 * - Visualizar lista de facturas con filtros
 * - Ver detalles de facturas individuales
 * - Registrar pagos parciales o totales
 * - Enviar facturas a clientes
 *
 * El componente maneja el ciclo de vida completo de una factura desde
 * su creacion como borrador hasta su pago total.
 * =====================================================================
 */

// =====================================================================
// IMPORTACIONES
// =====================================================================

// Hooks de TanStack Query para manejo de estado del servidor
// useQuery: Para consultas GET (obtener datos)
// useMutation: Para operaciones que modifican datos (POST, PUT, DELETE)
// useQueryClient: Para manipular el cache de queries
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Instancia de API configurada con Axios para peticiones HTTP
import api from '../services/api'

// Tipos TypeScript para tipado estatico
// Invoice: Estructura de una factura
// Case: Estructura de un caso legal
// User: Estructura de un usuario
// PaginatedResponse: Wrapper para respuestas paginadas
import type { Invoice, Case, User, PaginatedResponse } from '../types'

// Iconos de Lucide React para la interfaz visual
import {
  Plus,           // Icono para agregar nuevos elementos
  Search,         // Icono de lupa para busqueda
  X,              // Icono para cerrar modales
  Send,           // Icono para enviar factura
  CreditCard,     // Icono para pagos con tarjeta
  Trash2,         // Icono de papelera para eliminar
  Loader2,        // Icono de carga animado (spinner)
  AlertCircle,    // Icono de alerta para errores
  CheckCircle,    // Icono de confirmacion
  Receipt,        // Icono de recibo para estado vacio
  ChevronRight,   // Icono de flecha derecha para navegacion
} from 'lucide-react'

// Hook useState de React para manejar estado local
import { useState } from 'react'

// Utilidad clsx para combinar clases CSS condicionalmente
import clsx from 'clsx'

// Sistema de permisos personalizado
// hasPermission: Verifica si un rol tiene un permiso especifico
// Role: Tipo que define los roles del sistema
import { hasPermission, type Role } from '../lib/permissions'

// Hook de autenticacion para acceder al usuario actual
import { useAuth } from '../context/AuthContext'

// =====================================================================
// INTERFACES LOCALES
// =====================================================================

/**
 * InvoiceItem: Representa un item/linea dentro de una factura
 * Cada item tiene descripcion, cantidad, precio unitario y total
 */
interface InvoiceItem {
  id?: string              // ID opcional (solo existe si ya esta guardado)
  description: string      // Descripcion del servicio o producto
  quantity: number         // Cantidad de unidades
  unit_price: number       // Precio por unidad
  total: number            // Total de la linea (quantity * unit_price)
  time_entry_id?: string   // ID de entrada de tiempo asociada (opcional)
}

/**
 * Payment: Representa un pago registrado para una factura
 * Una factura puede tener multiples pagos parciales
 */
interface Payment {
  id: string                 // ID unico del pago
  payment_number: string     // Numero de referencia del pago
  amount: number             // Monto del pago
  method: string             // Metodo de pago (efectivo, transferencia, etc.)
  payment_date: string       // Fecha del pago en formato ISO
  reference?: string         // Referencia externa opcional
  notes?: string             // Notas adicionales
  recorded_by_name: string   // Nombre de quien registro el pago
  created_at: string         // Fecha de creacion del registro
}

/**
 * InvoiceDetail: Extension de Invoice con informacion detallada
 * Incluye items, pagos y calculos adicionales
 */
interface InvoiceDetail extends Invoice {
  items: InvoiceItem[]       // Lista de items de la factura
  payments: Payment[]        // Lista de pagos recibidos
  subtotal: number           // Suma de todos los items sin impuestos
  tax_rate: number           // Porcentaje de impuesto aplicado
  tax_amount: number         // Monto calculado del impuesto
  discount_amount: number    // Monto de descuento aplicado
  amount_paid?: number       // Monto total pagado (calculado)
  notes?: string             // Notas para el cliente
  terms?: string             // Terminos y condiciones
  client_address?: string    // Direccion del cliente
  client_tax_id?: string     // Identificacion fiscal del cliente
}

// =====================================================================
// CONSTANTES DE CONFIGURACION
// =====================================================================

/**
 * statusColors: Mapeo de estados de factura a clases CSS de badges
 * Define el color visual segun el estado de la factura
 */
const statusColors: Record<string, string> = {
  draft: 'badge-gray',      // Gris para borradores
  pending: 'badge-warning', // Amarillo para pendientes
  sent: 'badge-primary',    // Azul para enviadas
  paid: 'badge-success',    // Verde para pagadas
  partial: 'badge-warning', // Amarillo para pago parcial
  overdue: 'badge-danger',  // Rojo para vencidas
  cancelled: 'badge-gray',  // Gris para canceladas
}

/**
 * statusLabels: Mapeo de estados internos a etiquetas en espanol
 */
const statusLabels: Record<string, string> = {
  draft: 'Borrador',       // Factura en preparacion
  pending: 'Pendiente',    // Factura pendiente de envio
  sent: 'Enviada',         // Factura enviada al cliente
  paid: 'Pagada',          // Factura totalmente pagada
  partial: 'Pago Parcial', // Factura con pago parcial
  overdue: 'Vencida',      // Factura pasada de fecha de vencimiento
  cancelled: 'Cancelada',  // Factura cancelada/anulada
}

/**
 * paymentMethodLabels: Mapeo de metodos de pago a etiquetas en espanol
 */
const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',           // Pago en efectivo
  check: 'Cheque',            // Pago con cheque
  transfer: 'Transferencia',  // Transferencia bancaria
  card: 'Tarjeta',            // Pago con tarjeta
  other: 'Otro',              // Otros metodos
}

// =====================================================================
// COMPONENTE PRINCIPAL
// =====================================================================

/**
 * Invoices: Componente principal de la pagina de facturacion
 * Exportado como default para uso en el router
 */
export default function Invoices() {
  // ===================================================================
  // AUTENTICACION Y PERMISOS
  // ===================================================================

  // Obtiene el usuario actual del contexto de autenticacion
  const { user } = useAuth()

  // Extrae y castea el rol del usuario
  const userRole = user?.role as Role | undefined

  // Verifica permisos de creacion y edicion de facturas
  const canCreate = hasPermission(userRole, 'invoices.create')
  const canEdit = hasPermission(userRole, 'invoices.edit')

  // Cliente de query para invalidar caches
  const queryClient = useQueryClient()

  // ===================================================================
  // ESTADOS LOCALES
  // ===================================================================

  // Estado para el termino de busqueda
  const [search, setSearch] = useState('')

  // Estado para el filtro de estado de factura
  const [statusFilter, setStatusFilter] = useState('')

  // Estado para mostrar/ocultar panel de filtros (reservado para uso futuro)
  const [showFilters, setShowFilters] = useState(false)
  void showFilters; void setShowFilters

  // Estado para mostrar/ocultar modal de creacion
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Estado para mostrar/ocultar modal de detalle
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Estado para mostrar/ocultar modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Factura actualmente seleccionada para ver detalle o registrar pago
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // ===================================================================
  // ESTADO DEL FORMULARIO DE CREACION
  // ===================================================================

  /**
   * invoiceForm: Datos del formulario para crear nueva factura
   * Incluye informacion del cliente, caso y fechas
   */
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',                                      // ID del cliente
    client_name: '',                                    // Nombre del cliente
    client_email: '',                                   // Email del cliente
    case_id: '',                                        // ID del caso asociado
    case_number: '',                                    // Numero del caso
    issue_date: new Date().toISOString().split('T')[0], // Fecha de emision (hoy)
    // Fecha de vencimiento (30 dias despues)
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: 0,                                        // Tasa de impuesto
    discount_amount: 0,                                 // Monto de descuento
    notes: '',                                          // Notas para el cliente
    terms: '',                                          // Terminos y condiciones
  })

  // ===================================================================
  // ESTADO DE ITEMS DE LA FACTURA
  // ===================================================================

  /**
   * invoiceItems: Lista de items/lineas de la factura
   * Inicia con un item vacio por defecto (usa placeholders en los inputs)
   */
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 0, unit_price: 0, total: 0 },
  ])

  // ===================================================================
  // ESTADO DEL FORMULARIO DE PAGO
  // ===================================================================

  /**
   * paymentForm: Datos para registrar un nuevo pago
   */
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,                                            // Monto del pago
    method: 'transfer',                                   // Metodo de pago por defecto
    payment_date: new Date().toISOString().split('T')[0], // Fecha del pago (hoy)
    reference: '',                                        // Referencia/numero de transaccion
    notes: '',                                            // Notas adicionales
  })

  // ===================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ===================================================================

  /**
   * Query para obtener la lista de facturas
   * Se filtra por busqueda y estado
   */
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter], // Clave incluye filtros
    queryFn: async () => {
      // Construye parametros de consulta
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      // Realiza la peticion
      const response = await api.get<PaginatedResponse<Invoice>>(`/invoices/?${params}`)
      return response.data
    },
  })

  /**
   * Query para obtener resumen de facturacion
   * Muestra totales facturados, cobrados, pendientes y vencidos
   */
  const { data: summary } = useQuery({
    queryKey: ['billingSummary'],
    queryFn: async () => {
      const response = await api.get('/invoices/summary/')
      return response.data
    },
  })

  /**
   * Query para obtener casos del cliente seleccionado
   * Solo se ejecuta cuando hay un cliente seleccionado
   * Filtra casos por client_id para mostrar solo los casos del cliente
   */
  const { data: casesData } = useQuery({
    queryKey: ['cases-by-client', invoiceForm.client_id],
    queryFn: async () => {
      // Si no hay cliente seleccionado, retornar lista vacia
      if (!invoiceForm.client_id) return []
      // Filtra casos por el client_id seleccionado
      const response = await api.get<PaginatedResponse<Case>>(
        `/cases/?client_id=${invoiceForm.client_id}&limit=100`
      )
      return response.data.results
    },
    // Solo ejecuta la query cuando hay cliente seleccionado
    enabled: !!invoiceForm.client_id,
  })

  /**
   * Query para obtener clientes disponibles para el dropdown
   * Filtra usuarios con rol 'client'
   */
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<User>>('/auth/users/?role=client&limit=100')
      return response.data.results
    },
  })

  /**
   * Query para obtener detalle completo de una factura
   * Solo se ejecuta cuando hay una factura seleccionada y el modal esta abierto
   */
  const { data: invoiceDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['invoice', selectedInvoice?.id],
    queryFn: async () => {
      // Retorna null si no hay factura seleccionada
      if (!selectedInvoice?.id) return null
      const response = await api.get<InvoiceDetail>(`/invoices/${selectedInvoice.id}/`)
      return response.data
    },
    // Solo ejecuta la query cuando hay factura y modal abierto
    enabled: !!selectedInvoice?.id && showDetailModal,
  })

  // ===================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ===================================================================

  /**
   * Mutacion para crear una nueva factura
   * Envia datos del formulario e items al servidor
   */
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: {
      client_id: string
      client_name: string
      client_email: string
      case_id?: string
      case_number?: string
      issue_date: string
      due_date: string
      tax_rate: number
      discount_amount: number
      notes?: string
      terms?: string
      items: { description: string; quantity: number; unit_price: number; time_entry_id?: string }[]
    }) => {
      const response = await api.post('/invoices/', data)
      return response.data
    },
    onSuccess: () => {
      // Invalida caches para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['billingSummary'] })
      // Cierra modal y resetea formulario
      setShowCreateModal(false)
      resetForm()
    },
  })

  /**
   * Mutacion para agregar un item a una factura existente
   * Usado en el modo de edicion (no implementado completamente)
   */
  const addItemMutation = useMutation({
    mutationFn: async ({ invoiceId, item }: { invoiceId: string; item: Partial<InvoiceItem> }) => {
      const response = await api.post(`/invoices/${invoiceId}/items/`, item)
      return response.data
    },
    onSuccess: () => {
      // Refresca detalle de factura y lista
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoice?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  /**
   * Mutacion para eliminar un item de una factura
   */
  const deleteItemMutation = useMutation({
    mutationFn: async ({ invoiceId, itemId }: { invoiceId: string; itemId: string }) => {
      await api.delete(`/invoices/${invoiceId}/items/${itemId}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoice?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
  void addItemMutation; void deleteItemMutation // Reservados para edicion futura

  /**
   * Mutacion para enviar una factura al cliente
   * Cambia el estado de borrador a enviada
   */
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post(`/invoices/${invoiceId}/send/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoice?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  /**
   * Mutacion para registrar un pago en una factura
   * Actualiza el saldo pendiente automaticamente
   */
  const createPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, payment }: { invoiceId: string; payment: typeof paymentForm }) => {
      const response = await api.post(`/invoices/${invoiceId}/payments/`, payment)
      return response.data
    },
    onSuccess: () => {
      // Invalida caches relacionados
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoice?.id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['billingSummary'] })
      // Cierra modal y resetea formulario de pago
      setShowPaymentModal(false)
      setPaymentForm({
        amount: 0,
        method: 'transfer',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
      })
    },
  })

  // ===================================================================
  // FUNCIONES AUXILIARES
  // ===================================================================

  /**
   * Resetea el formulario de factura a sus valores iniciales
   * Se llama despues de crear una factura o cancelar
   */
  const resetForm = () => {
    setInvoiceForm({
      client_id: '',
      client_name: '',
      client_email: '',
      case_id: '',
      case_number: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tax_rate: 0,
      discount_amount: 0,
      notes: '',
      terms: '',
    })
    // Resetea items a un item vacio
    setInvoiceItems([{ description: '', quantity: 0, unit_price: 0, total: 0 }])
  }

  /**
   * Maneja la seleccion de un cliente en el dropdown
   * Actualiza el formulario con los datos del cliente seleccionado
   * Limpia el caso seleccionado ya que los casos dependen del cliente
   *
   * @param clientId - ID del cliente seleccionado
   */
  const handleClientSelect = (clientId: string) => {
    // Busca el cliente en la lista de clientes
    const client = clientsData?.find((c) => c.id === clientId)
    // Actualiza el formulario con los datos del cliente
    // Limpia el caso ya que cambiara la lista de casos disponibles
    setInvoiceForm((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.full_name || '',
      client_email: client?.email || '',
      // Limpiar caso al cambiar cliente para evitar inconsistencias
      case_id: '',
      case_number: '',
    }))
  }

  /**
   * Maneja la seleccion de un caso en el dropdown
   * Actualiza el formulario con los datos del caso seleccionado
   *
   * @param caseId - ID del caso seleccionado
   */
  const handleCaseSelect = (caseId: string) => {
    // Busca el caso en la lista de casos
    const caseItem = casesData?.find((c) => c.id === caseId)
    // Actualiza el formulario
    setInvoiceForm((prev) => ({
      ...prev,
      case_id: caseId,
      case_number: caseItem?.case_number || '',
    }))
  }

  /**
   * Actualiza un item de la factura
   * Recalcula automaticamente el total cuando cambia cantidad o precio
   *
   * @param index - Indice del item en el array
   * @param field - Campo a actualizar
   * @param value - Nuevo valor
   */
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems((prev) => {
      // Crea copia del array
      const newItems = [...prev]
      // Actualiza el campo especificado
      newItems[index] = { ...newItems[index], [field]: value }
      // Recalcula total si cambio cantidad o precio
      if (field === 'quantity' || field === 'unit_price') {
        newItems[index].total = newItems[index].quantity * newItems[index].unit_price
      }
      return newItems
    })
  }

  /**
   * Agrega un nuevo item vacio a la lista de items
   */
  const addItem = () => {
    setInvoiceItems((prev) => [...prev, { description: '', quantity: 0, unit_price: 0, total: 0 }])
  }

  /**
   * Elimina un item de la lista
   * Mantiene al menos un item en la lista
   *
   * @param index - Indice del item a eliminar
   */
  const removeItem = (index: number) => {
    // Solo elimina si hay mas de un item
    if (invoiceItems.length > 1) {
      setInvoiceItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  /**
   * Calcula el subtotal de la factura (suma de todos los items)
   *
   * @returns Subtotal en numero
   */
  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.total, 0)
  }

  /**
   * Calcula el total final de la factura
   * Incluye subtotal + impuestos - descuentos
   *
   * @returns Total en numero
   */
  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    // Calcula el monto de impuesto
    const tax = subtotal * (invoiceForm.tax_rate / 100)
    // Retorna subtotal + impuesto - descuento
    return subtotal + tax - invoiceForm.discount_amount
  }

  /**
   * Maneja la creacion de una nueva factura
   * Valida datos minimos y ejecuta la mutacion
   */
  const handleCreateInvoice = () => {
    // Validacion: debe tener cliente y al menos un item con descripcion
    if (!invoiceForm.client_id || invoiceItems.every((item) => !item.description)) return

    // Filtra items con descripcion y mapea solo los campos requeridos por el backend
    // Esto evita enviar campos read-only como 'total' e 'id' que causan errores
    const validItems = invoiceItems
      .filter((item) => item.description.trim() !== '')
      .map((item) => ({
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        ...(item.time_entry_id ? { time_entry_id: item.time_entry_id } : {}),
      }))

    // Ejecuta la mutacion con los datos del formulario
    createInvoiceMutation.mutate({
      client_id: invoiceForm.client_id,
      client_name: invoiceForm.client_name,
      client_email: invoiceForm.client_email,
      case_id: invoiceForm.case_id || undefined,
      case_number: invoiceForm.case_number || undefined,
      issue_date: invoiceForm.issue_date,
      due_date: invoiceForm.due_date,
      tax_rate: invoiceForm.tax_rate,
      discount_amount: invoiceForm.discount_amount,
      notes: invoiceForm.notes || undefined,
      terms: invoiceForm.terms || undefined,
      // Envia array de items con solo los campos necesarios
      items: validItems,
    })
  }

  /**
   * Abre el modal de detalle para una factura
   *
   * @param invoice - Factura a mostrar
   */
  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowDetailModal(true)
  }

  /**
   * Formatea un numero como moneda
   * Usa formato espanol con 2 decimales
   *
   * @param amount - Monto a formatear
   * @returns String formateado (ej: "$1.234,56")
   */
  const formatCurrency = (amount: number) => {
    // Formato peso colombiano: sin decimales, separador de miles con punto
    return `$${Math.round(amount).toLocaleString('es-CO')}`
  }

  // ===================================================================
  // RENDERIZADO DEL COMPONENTE
  // ===================================================================

  return (
    <div className="space-y-6">
      {/* =============================================================
          SECCION: ENCABEZADO DE LA PAGINA
          Contiene titulo y boton de nueva factura
          ============================================================= */}
      <div className="page-header">
        <div>
          {/* Titulo principal */}
          <h1 className="page-title">Facturacion</h1>
          {/* Subtitulo descriptivo */}
          <p className="page-subtitle">Gestiona facturas y pagos</p>
        </div>
        {/* Boton de nueva factura - solo si tiene permiso */}
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {/* Texto responsive */}
            <span className="hidden sm:inline">Nueva Factura</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        )}
      </div>

      {/* =============================================================
          SECCION: TARJETAS DE RESUMEN
          Muestra KPIs principales de facturacion
          ============================================================= */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tarjeta: Total facturado */}
          <div className="card">
            <p className="text-sm text-gray-500">Total Facturado</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_invoiced || 0)}
            </p>
          </div>
          {/* Tarjeta: Total cobrado */}
          <div className="card">
            <p className="text-sm text-gray-500">Total Cobrado</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_paid || 0)}
            </p>
          </div>
          {/* Tarjeta: Por cobrar (pendiente) */}
          <div className="card">
            <p className="text-sm text-gray-500">Por Cobrar</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(summary.total_outstanding || 0)}
            </p>
          </div>
          {/* Tarjeta: Monto vencido */}
          <div className="card">
            <p className="text-sm text-gray-500">Vencido</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.overdue_amount || 0)}
            </p>
          </div>
        </div>
      )}

      {/* =============================================================
          SECCION: BARRA DE FILTROS
          Campo de busqueda y selector de estado
          ============================================================= */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Campo de busqueda con icono */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar facturas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          {/* Selector de estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="pending">Pendientes</option>
            <option value="sent">Enviadas</option>
            <option value="paid">Pagadas</option>
            <option value="partial">Pago Parcial</option>
            <option value="overdue">Vencidas</option>
          </select>
        </div>
      </div>

      {/* =============================================================
          SECCION: LISTA DE FACTURAS
          Tabla con todas las facturas o estado vacio
          ============================================================= */}
      {isLoading ? (
        // Estado de carga: Muestra spinner centrado
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        </div>
      ) : data?.results && data.results.length > 0 ? (
        // Tabla de facturas
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Encabezados de la tabla */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Pendiente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              {/* Cuerpo de la tabla */}
              <tbody className="bg-white divide-y divide-gray-200">
                {data.results.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetail(invoice)}
                  >
                    {/* Columna: Numero de factura y caso */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-primary-600">{invoice.invoice_number}</span>
                      {/* Muestra numero de caso si existe */}
                      {invoice.case_number && (
                        <p className="text-xs text-gray-500">{invoice.case_number}</p>
                      )}
                    </td>
                    {/* Columna: Nombre del cliente */}
                    <td className="px-6 py-4 whitespace-nowrap">{invoice.client_name}</td>
                    {/* Columna: Estado con badge de color */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('badge', statusColors[invoice.status])}>
                        {statusLabels[invoice.status]}
                      </span>
                    </td>
                    {/* Columna: Monto total */}
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    {/* Columna: Saldo pendiente (con color segun monto) */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={clsx(
                          'font-medium',
                          invoice.balance_due > 0 ? 'text-amber-600' : 'text-green-600'
                        )}
                      >
                        {formatCurrency(invoice.balance_due)}
                      </span>
                    </td>
                    {/* Columna: Fecha de vencimiento */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                    </td>
                    {/* Columna: Icono de navegacion */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <ChevronRight className="h-5 w-5 text-gray-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Estado vacio: No hay facturas
        <div className="card">
          <div className="empty-state py-12">
            <Receipt className="empty-state-icon" />
            <p className="empty-state-title">No hay facturas</p>
            <p className="empty-state-description">
              {search || statusFilter
                ? 'No se encontraron facturas con los filtros aplicados'
                : 'Crea tu primera factura para comenzar'}
            </p>
            {/* Boton de crear factura en estado vacio */}
            {canCreate && !search && !statusFilter && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-4">
                Crear Factura
              </button>
            )}
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CREAR FACTURA
          Formulario completo para crear una nueva factura
          ============================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">Nueva Factura</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cuerpo del modal con scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Seccion: Seleccion de cliente y caso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selector de cliente (requerido) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                    <select
                      value={invoiceForm.client_id}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="input"
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientsData?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Selector de caso (opcional) - Solo muestra casos del cliente seleccionado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caso</label>
                    <select
                      value={invoiceForm.case_id}
                      onChange={(e) => handleCaseSelect(e.target.value)}
                      className="input"
                      disabled={!invoiceForm.client_id}
                    >
                      <option value="">
                        {!invoiceForm.client_id
                          ? 'Primero seleccione un cliente'
                          : casesData?.length === 0
                            ? 'El cliente no tiene casos'
                            : 'Sin caso asociado'}
                      </option>
                      {casesData?.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seccion: Fechas de emision y vencimiento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emision *</label>
                    <input
                      type="date"
                      value={invoiceForm.issue_date}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento *</label>
                    <input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm((prev) => ({ ...prev, due_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                {/* Seccion: Items de la factura */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Items de la Factura *</label>
                    {/* Boton para agregar mas items */}
                    <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700">
                      + Agregar item
                    </button>
                  </div>
                  {/* Lista de items */}
                  <div className="space-y-3">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        {/* Campo: Descripcion del item */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="input"
                            placeholder="Descripcion del servicio"
                          />
                        </div>
                        {/* Campo: Cantidad */}
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="input text-center"
                            placeholder="1"
                          />
                        </div>
                        {/* Campo: Precio unitario */}
                        <div className="w-28">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="input text-right"
                            placeholder="0.00"
                          />
                        </div>
                        {/* Total calculado (solo lectura) */}
                        <div className="w-28 text-right py-2 font-medium">{formatCurrency(item.total)}</div>
                        {/* Boton eliminar (solo si hay mas de un item) */}
                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seccion: Impuestos y descuentos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Campo: Tasa de impuesto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceForm.tax_rate || ''}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({ ...prev, tax_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) }))
                      }
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  {/* Campo: Monto de descuento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descuento ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={invoiceForm.discount_amount || ''}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({ ...prev, discount_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) }))
                      }
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Seccion: Notas adicionales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Notas adicionales para el cliente"
                  />
                </div>

                {/* Seccion: Resumen de totales */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {/* Impuesto (solo si hay tasa) */}
                  {invoiceForm.tax_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Impuesto ({invoiceForm.tax_rate}%):</span>
                      <span className="font-medium">
                        {formatCurrency(calculateSubtotal() * (invoiceForm.tax_rate / 100))}
                      </span>
                    </div>
                  )}
                  {/* Descuento (solo si hay monto) */}
                  {invoiceForm.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento:</span>
                      <span className="font-medium">-{formatCurrency(invoiceForm.discount_amount)}</span>
                    </div>
                  )}
                  {/* Total final */}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Mensaje de error si falla la creacion */}
              {createInvoiceMutation.isError && (
                <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al crear la factura. Intenta de nuevo.</span>
                </div>
              )}

              {/* Footer del modal con botones de accion */}
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={
                    !invoiceForm.client_id ||
                    invoiceItems.every((item) => !item.description) ||
                    createInvoiceMutation.isPending
                  }
                  className="btn btn-primary inline-flex items-center"
                >
                  {createInvoiceMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Crear Factura
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: DETALLE DE FACTURA
          Muestra informacion completa de una factura seleccionada
          ============================================================= */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowDetailModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Encabezado con numero de factura y estado */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold">
                    Factura {selectedInvoice.invoice_number}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedInvoice.client_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Badge de estado */}
                  <span className={clsx('badge', statusColors[selectedInvoice.status])}>
                    {statusLabels[selectedInvoice.status]}
                  </span>
                  {/* Boton cerrar */}
                  <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Cuerpo del modal con scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingDetail ? (
                  // Estado de carga
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : invoiceDetail ? (
                  <>
                    {/* Seccion: Informacion general de la factura */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Fecha Emision</span>
                        <p className="font-medium">
                          {new Date(invoiceDetail.issue_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha Vencimiento</span>
                        <p className="font-medium">
                          {new Date(invoiceDetail.due_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      {/* Caso asociado (si existe) */}
                      {invoiceDetail.case_number && (
                        <div>
                          <span className="text-gray-500">Caso</span>
                          <p className="font-medium">{invoiceDetail.case_number}</p>
                        </div>
                      )}
                    </div>

                    {/* Seccion: Tabla de items */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Items</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-2">
                                Descripcion
                              </th>
                              <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-2">
                                Cant.
                              </th>
                              <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">
                                Precio
                              </th>
                              <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-2">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {invoiceDetail.items?.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 text-sm">{item.description}</td>
                                <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                  {formatCurrency(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Seccion: Resumen de totales */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(invoiceDetail.subtotal)}</span>
                      </div>
                      {/* Impuesto (si aplica) */}
                      {invoiceDetail.tax_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Impuesto ({invoiceDetail.tax_rate}%):</span>
                          <span className="font-medium">{formatCurrency(invoiceDetail.tax_amount)}</span>
                        </div>
                      )}
                      {/* Descuento (si aplica) */}
                      {invoiceDetail.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Descuento:</span>
                          <span className="font-medium">-{formatCurrency(invoiceDetail.discount_amount)}</span>
                        </div>
                      )}
                      {/* Total de la factura */}
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(invoiceDetail.total_amount)}</span>
                      </div>
                      {/* Monto pagado */}
                      <div className="flex justify-between text-sm">
                        <span>Pagado:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(invoiceDetail.amount_paid || 0)}
                        </span>
                      </div>
                      {/* Saldo pendiente */}
                      <div className="flex justify-between text-lg font-bold text-amber-600">
                        <span>Saldo Pendiente:</span>
                        <span>{formatCurrency(invoiceDetail.balance_due)}</span>
                      </div>
                    </div>

                    {/* Seccion: Lista de pagos registrados */}
                    {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Pagos Registrados</h3>
                        <div className="space-y-2">
                          {invoiceDetail.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-green-800">{payment.payment_number}</p>
                                <p className="text-sm text-green-600">
                                  {new Date(payment.payment_date).toLocaleDateString('es-ES')} •{' '}
                                  {paymentMethodLabels[payment.method]}
                                </p>
                              </div>
                              <span className="text-lg font-bold text-green-700">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Seccion: Notas de la factura */}
                    {invoiceDetail.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Notas</h3>
                        <p className="text-sm text-gray-600">{invoiceDetail.notes}</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Footer del modal con acciones */}
              <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary">
                  Cerrar
                </button>
                <div className="flex gap-3">
                  {/* Boton enviar (solo para borradores y si tiene permiso) */}
                  {canEdit && selectedInvoice.status === 'draft' && (
                    <button
                      onClick={() => sendInvoiceMutation.mutate(selectedInvoice.id)}
                      disabled={sendInvoiceMutation.isPending}
                      className="btn btn-secondary inline-flex items-center"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Enviar
                    </button>
                  )}
                  {/* Boton registrar pago (solo si hay saldo y no es borrador) */}
                  {canEdit && selectedInvoice.balance_due > 0 && selectedInvoice.status !== 'draft' && (
                    <button
                      onClick={() => {
                        // Pre-llena el monto con el saldo pendiente
                        setPaymentForm((prev) => ({
                          ...prev,
                          amount: selectedInvoice.balance_due,
                        }))
                        setShowPaymentModal(true)
                      }}
                      className="btn btn-primary inline-flex items-center"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Registrar Pago
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: REGISTRAR PAGO
          Formulario para registrar un pago en una factura
          ============================================================= */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowPaymentModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Registrar Pago</h2>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario de pago */}
              <div className="space-y-4">
                {/* Resumen de la factura */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Factura</p>
                  <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                  <p className="text-sm text-gray-500 mt-2">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatCurrency(selectedInvoice.balance_due)}
                  </p>
                </div>

                {/* Campo: Monto del pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedInvoice.balance_due}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    className="input"
                  />
                </div>

                {/* Campos: Metodo de pago y fecha */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Metodo *</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                      className="input"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                {/* Campo: Referencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                    className="input"
                    placeholder="Numero de referencia o confirmacion"
                  />
                </div>

                {/* Campo: Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {createPaymentMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al registrar el pago. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    createPaymentMutation.mutate({ invoiceId: selectedInvoice.id, payment: paymentForm })
                  }
                  disabled={
                    paymentForm.amount <= 0 ||
                    paymentForm.amount > selectedInvoice.balance_due ||
                    createPaymentMutation.isPending
                  }
                  className="btn btn-primary inline-flex items-center"
                >
                  {createPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Registrar Pago
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
