/**
 * ARCHIVO: MyInvoices.tsx
 * PROPOSITO: Pagina que muestra todas las facturas del cliente.
 * Incluye resumen de totales (pagado vs pendiente), busqueda por numero
 * de factura y filtro por estado de pago.
 */

// useQuery - Hook de React Query para consultas de datos
// useQueryClient - Para invalidar queries despues de un pago
import { useQuery, useQueryClient } from '@tanstack/react-query'

// api - Cliente HTTP configurado para el backend
import api from '../services/api'

// Tipos TypeScript para facturas y respuestas paginadas
import type { Invoice, PaginatedResponse } from '../types'

// Iconos de Lucide React
// Receipt: icono de factura/recibo
// Search: icono de busqueda
// DollarSign: icono de dolar para representar dinero
// AlertCircle: icono de alerta para pagos pendientes
// CheckCircle: icono de check para pagos completados
// CreditCard: icono de tarjeta para el boton de pago
import { Receipt, Search, DollarSign, AlertCircle, CheckCircle, CreditCard } from 'lucide-react'

// useState, useEffect - Hooks para estados y efectos
import { useState, useEffect } from 'react'

// useSearchParams - Hook para leer parametros de URL
import { useSearchParams } from 'react-router-dom'

// PaymentModal - Modal para procesar pagos con Stripe
import PaymentModal from '../components/PaymentModal'

// clsx - Utilidad para clases CSS condicionales
import clsx from 'clsx'

/**
 * Componente MyInvoices - Lista de facturas del cliente
 *
 * Caracteristicas:
 * - Carga de facturas desde el API
 * - Tarjetas resumen con total pagado y pendiente
 * - Busqueda por numero de factura
 * - Filtro por estado de factura
 * - Tabla detallada con informacion de cada factura
 */
export default function MyInvoices() {
  // ========== PARAMETROS DE URL ==========

  // Hook para leer parametros de la URL (para links de pago desde email)
  const [searchParams, setSearchParams] = useSearchParams()

  // ========== ESTADOS LOCALES ==========

  // Estado para el termino de busqueda por numero de factura
  const [search, setSearch] = useState('')

  // Estado para el filtro de estado de factura
  const [statusFilter, setStatusFilter] = useState('')

  // Estado para controlar el modal de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Estado para la factura seleccionada para pagar
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // QueryClient para refrescar datos despues de un pago
  const queryClient = useQueryClient()

  // ========== FUNCIONES DE PAGO ==========

  /**
   * Abre el modal de pago para una factura
   */
  const handlePayClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentModalOpen(true)
  }

  /**
   * Cierra el modal de pago
   */
  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false)
    setSelectedInvoice(null)
  }

  /**
   * Callback cuando el pago es exitoso
   */
  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false)
    setSelectedInvoice(null)
    // Refresca los datos de facturas
    queryClient.invalidateQueries({ queryKey: ['my-invoices'] })
    // Muestra notificacion de exito
    setNotification({
      show: true,
      type: 'success',
      message: '¡Pago procesado exitosamente!',
    })
    // Oculta la notificacion despues de 5 segundos
    setTimeout(() => setNotification(null), 5000)
  }

  // ========== CONSULTA DE FACTURAS ==========

  /**
   * Consulta para obtener la lista de facturas del cliente
   */
  const { data, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: async () => {
      // Peticion GET al endpoint de facturas del portal
      const response = await api.get<PaginatedResponse<Invoice>>('/portal/my-invoices/')
      return response.data
    },
  })

  // ========== EFECTO PARA ABRIR MODAL DESDE URL ==========

  /**
   * Efecto que detecta el parametro 'pay' en la URL y abre el modal de pago
   * Esto permite que los links desde emails abran directamente el pago
   */
  useEffect(() => {
    const payInvoiceId = searchParams.get('pay')

    // Si hay parametro 'pay' y las facturas estan cargadas
    if (payInvoiceId && data?.results) {
      // Busca la factura por ID
      const invoiceToPay = data.results.find(inv => inv.id === payInvoiceId)

      // Si encuentra la factura y tiene saldo pendiente, abre el modal
      if (invoiceToPay && invoiceToPay.balance_due > 0 && invoiceToPay.status !== 'cancelled') {
        setSelectedInvoice(invoiceToPay)
        setPaymentModalOpen(true)

        // Limpia el parametro de la URL para evitar reabrir el modal
        setSearchParams({})
      } else if (invoiceToPay && invoiceToPay.balance_due === 0) {
        // Si la factura ya esta pagada, muestra notificacion
        setNotification({
          show: true,
          type: 'success',
          message: 'Esta factura ya ha sido pagada.',
        })
        setTimeout(() => setNotification(null), 5000)
        setSearchParams({})
      }
    }
  }, [data, searchParams, setSearchParams])

  // ========== MAPEOS DE ETIQUETAS Y COLORES ==========

  /**
   * Etiquetas en espanol para los estados de factura
   * Nota: No incluye 'draft' porque los clientes solo ven facturas enviadas
   */
  const statusLabels: Record<string, string> = {
    sent: 'Enviada',         // Factura enviada al cliente
    paid: 'Pagada',          // Factura completamente pagada
    partial: 'Pago Parcial', // Factura parcialmente pagada
    overdue: 'Vencida',      // Factura con fecha de vencimiento pasada
    cancelled: 'Cancelada',  // Factura anulada
  }

  /**
   * Clases CSS para los badges de estado de factura
   * Nota: No incluye 'draft' porque los clientes solo ven facturas enviadas
   */
  const statusColors: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800',     // Azul para enviada
    paid: 'badge-paid',                     // Verde para pagada (clase personalizada)
    partial: 'badge-partial',               // Amarillo para parcial (clase personalizada)
    overdue: 'bg-red-100 text-red-800',    // Rojo para vencida
    cancelled: 'bg-gray-100 text-gray-500', // Gris claro para cancelada
  }

  // ========== FILTRADO DE FACTURAS ==========

  /**
   * Filtra facturas basandose en busqueda y estado
   */
  const filteredInvoices = data?.results.filter((invoice) => {
    // Verifica si el numero de factura coincide con la busqueda
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(search.toLowerCase())
    // Verifica si el estado coincide con el filtro (si hay filtro)
    const matchesStatus = !statusFilter || invoice.status === statusFilter
    // Debe cumplir ambas condiciones
    return matchesSearch && matchesStatus
  })

  // ========== CALCULOS DE TOTALES ==========

  /**
   * Calcula el total de facturas pendientes de pago
   * Excluye facturas pagadas y canceladas, suma los saldos pendientes
   */
  const totalOutstanding = data?.results
    // Filtra facturas que no estan pagadas ni canceladas
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    // Suma todos los saldos pendientes (balance_due), protegiendo contra NaN
    .reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0) || 0

  /**
   * Calcula el total de pagos recibidos
   * Suma amount_paid de todas las facturas (incluye pagos parciales)
   */
  const totalPaid = data?.results
    // Suma todos los montos pagados, protegiendo contra NaN
    .reduce((sum, i) => sum + (Number(i.amount_paid) || 0), 0) || 0

  // ========== ESTADO DE CARGA ==========

  // Muestra spinner mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ========== RENDERIZADO PRINCIPAL ==========

  return (
    <div className="space-y-6">
      {/* ========== NOTIFICACION TOAST ========== */}
      {notification && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300',
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Titulo de la pagina */}
      <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>

      {/* ========== TARJETAS DE RESUMEN ========== */}
      {/* Grid de 2 columnas en pantallas medianas y grandes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Tarjeta: Total Pagado */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo verde */}
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              {/* Etiqueta */}
              <p className="text-sm text-gray-500">Total Pagado</p>
              {/* Formato peso colombiano sin decimales */}
              <p className="text-2xl font-bold text-green-600">
                ${Math.round(totalPaid).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta: Pendiente de Pago */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo rojo */}
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              {/* Etiqueta */}
              <p className="text-sm text-gray-500">Pendiente de Pago</p>
              {/* Formato peso colombiano sin decimales */}
              <p className="text-2xl font-bold text-red-600">
                ${Math.round(totalOutstanding).toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== BARRA DE FILTROS ========== */}
      <div className="flex flex-col sm:flex-row gap-4">

        {/* Campo de busqueda por numero de factura */}
        <div className="relative flex-1">
          {/* Icono de busqueda */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {/* Input de busqueda */}
          <input
            type="text"
            placeholder="Buscar por numero de factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Selector de estado de factura */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          {/* Opcion por defecto: todos los estados */}
          <option value="">Todos los estados</option>
          {/* Opciones para filtrar por estado especifico */}
          <option value="sent">Enviadas</option>
          <option value="paid">Pagadas</option>
          <option value="partial">Pago Parcial</option>
          <option value="overdue">Vencidas</option>
        </select>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      {/* Renderizado condicional: estado vacio o tabla de facturas */}

      {filteredInvoices?.length === 0 ? (
        // ========== ESTADO VACIO ==========
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">No hay facturas</h2>
          <p className="text-gray-500">No tiene facturas actualmente.</p>
        </div>
      ) : (
        // ========== TABLA DE FACTURAS ==========
        <div className="card overflow-hidden">
          {/* Contenedor para scroll horizontal */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Encabezado de la tabla */}
              <thead className="bg-gray-50">
                <tr>
                  {/* Columna: Numero de factura */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  {/* Columna: Caso asociado */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caso
                  </th>
                  {/* Columna: Fecha de emision */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  {/* Columna: Fecha de vencimiento */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  {/* Columna: Monto total */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  {/* Columna: Saldo pendiente */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  {/* Columna: Estado de la factura */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  {/* Columna: Acciones (Pagar) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la tabla */}
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Itera sobre las facturas filtradas */}
                {filteredInvoices?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    {/* Celda: Numero de factura con icono de dolar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </td>

                    {/* Celda: Numero de caso o guion si no tiene */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.case_number || '-'}
                    </td>

                    {/* Celda: Fecha de emision formateada */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>

                    {/* Celda: Fecha de vencimiento formateada */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>

                    {/* Celda: Monto total en formato peso colombiano */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${Math.round(invoice.total_amount).toLocaleString('es-CO')}
                    </td>

                    {/* Celda: Saldo pendiente con color condicional */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={invoice.balance_due > 0 ? 'text-red-600' : 'text-green-600'}>
                        {/* Rojo si hay saldo pendiente, verde si esta pagado */}
                        ${Math.round(invoice.balance_due).toLocaleString('es-CO')}
                      </span>
                    </td>

                    {/* Celda: Badge de estado */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('badge', statusColors[invoice.status])}>
                        {/* Etiqueta traducida o valor original */}
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>

                    {/* Celda: Boton de pagar */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Solo mostrar boton si hay saldo pendiente y no esta cancelada */}
                      {invoice.balance_due > 0 && invoice.status !== 'cancelled' ? (
                        <button
                          onClick={() => handlePayClick(invoice)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pagar
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== MODAL DE PAGO ========== */}
      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          isOpen={paymentModalOpen}
          onClose={handleClosePaymentModal}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
