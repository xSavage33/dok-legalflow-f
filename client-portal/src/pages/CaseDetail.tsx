/**
 * ARCHIVO: CaseDetail.tsx
 * PROPOSITO: Pagina de detalle de un caso legal especifico.
 * Muestra informacion completa del caso incluyendo documentos asociados,
 * facturas relacionadas y registros de tiempo/horas trabajadas.
 * Utiliza multiples consultas para cargar datos relacionados.
 */

// useQuery - Hook de React Query para consultas de datos con cache
import { useQuery } from '@tanstack/react-query'

// useParams - Hook para obtener parametros de la URL (como el ID del caso)
// Link - Componente para navegacion declarativa
import { useParams, Link } from 'react-router-dom'

// api - Cliente HTTP configurado para el backend
import api from '../services/api'

// Tipos TypeScript para tipado seguro
// Case: datos del caso legal
// Document: documentos asociados al caso
// Invoice: facturas del caso
// TimeEntry: registros de horas trabajadas
// PaginatedResponse: estructura de respuesta paginada
import type { Case, Document, Invoice, TimeEntry, PaginatedResponse } from '../types'

// Iconos de Lucide React
// ArrowLeft: flecha para volver atras
// Briefcase: icono de caso/maletin
// FileText: icono de documento
// Receipt: icono de factura
// Clock: icono de reloj para tiempo
import { ArrowLeft, Briefcase, FileText, Receipt, Clock } from 'lucide-react'

// clsx - Utilidad para construir clases CSS condicionalmente
import clsx from 'clsx'

/**
 * Componente CaseDetail - Vista detallada de un caso legal
 *
 * Caracteristicas:
 * - Carga del caso principal y datos relacionados
 * - Muestra documentos, facturas y horas trabajadas
 * - Vista responsiva con grid de 3 columnas en desktop
 * - Estados de carga y manejo de caso no encontrado
 */
export default function CaseDetail() {
  // ========== PARAMETROS DE URL ==========

  // Extrae el parametro 'id' de la URL (/cases/:id)
  // El tipo generico especifica que esperamos un objeto con propiedad 'id'
  const { id } = useParams<{ id: string }>()

  // ========== CONSULTA PRINCIPAL DEL CASO ==========

  /**
   * Consulta para obtener los datos del caso
   * Se ejecuta siempre que exista un ID
   */
  const { data: caseData, isLoading } = useQuery({
    // Clave de consulta que incluye el ID para cache especifico
    queryKey: ['case', id],
    queryFn: async () => {
      // Peticion GET al endpoint del caso especifico
      const response = await api.get<Case>(`/portal/my-cases/${id}/`)
      return response.data
    },
  })

  // ========== CONSULTAS DE DATOS RELACIONADOS ==========

  /**
   * Consulta para obtener los documentos asociados al caso
   * enabled: solo se ejecuta si existe un ID
   */
  const { data: documents } = useQuery({
    queryKey: ['case-documents', id],
    queryFn: async () => {
      // Filtra documentos por case_id mediante query parameter
      const response = await api.get<PaginatedResponse<Document>>(`/portal/my-documents/?case_id=${id}`)
      return response.data
    },
    // Solo ejecuta la consulta si hay un ID valido
    enabled: !!id,
  })

  /**
   * Consulta para obtener las facturas asociadas al caso
   */
  const { data: invoices } = useQuery({
    queryKey: ['case-invoices', id],
    queryFn: async () => {
      // Filtra facturas por case_id
      const response = await api.get<PaginatedResponse<Invoice>>(`/portal/my-invoices/?case_id=${id}`)
      return response.data
    },
    enabled: !!id,
  })

  /**
   * Consulta para obtener los registros de tiempo del caso
   */
  const { data: timeEntries } = useQuery({
    queryKey: ['case-time-entries', id],
    queryFn: async () => {
      // Filtra entradas de tiempo por case_id
      const response = await api.get<PaginatedResponse<TimeEntry>>(`/portal/my-time-entries/?case_id=${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // ========== MAPEOS DE ETIQUETAS Y COLORES ==========

  /**
   * Etiquetas en espanol para los estados de caso
   */
  const statusLabels: Record<string, string> = {
    active: 'Activo',
    pending: 'Pendiente',
    on_hold: 'En Espera',
    closed: 'Cerrado',
  }

  /**
   * Clases CSS para los badges de estado
   */
  const statusColors: Record<string, string> = {
    active: 'badge-active',
    pending: 'badge-pending',
    on_hold: 'bg-orange-100 text-orange-800',
    closed: 'badge-closed',
  }

  // ========== ESTADOS DE CARGA Y ERROR ==========

  // Muestra spinner mientras se carga el caso principal
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Muestra mensaje si el caso no fue encontrado
  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Caso no encontrado.</p>
        {/* Enlace para volver a la lista de casos */}
        <Link to="/cases" className="text-primary-600 hover:underline">
          Volver a mis casos
        </Link>
      </div>
    )
  }

  // ========== RENDERIZADO PRINCIPAL ==========

  return (
    <div className="space-y-6">

      {/* ========== ENLACE PARA VOLVER ========== */}
      <Link to="/cases" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a mis casos
      </Link>

      {/* ========== TARJETA DE INFORMACION DEL CASO ========== */}
      <div className="card">
        <div className="flex items-start gap-4">
          {/* Icono del caso */}
          <div className="p-3 bg-primary-100 rounded-lg">
            <Briefcase className="h-6 w-6 text-primary-600" />
          </div>

          {/* Informacion principal del caso */}
          <div className="flex-1">
            {/* Titulo y estado */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Titulo del caso */}
              <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
              {/* Badge de estado con color dinamico */}
              <span className={clsx('badge', statusColors[caseData.status])}>
                {statusLabels[caseData.status] || caseData.status}
              </span>
            </div>

            {/* Numero y tipo de caso */}
            <p className="text-gray-500 mt-1">
              {caseData.case_number} - {caseData.case_type}
            </p>

            {/* Nombre del abogado principal (si existe) */}
            {caseData.lead_attorney_name && (
              <p className="text-gray-600 mt-2">
                <span className="font-medium">Abogado:</span> {caseData.lead_attorney_name}
              </p>
            )}

            {/* Descripcion del caso (si existe) */}
            {caseData.description && (
              <p className="text-gray-600 mt-4">{caseData.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* ========== GRID DE SECCIONES RELACIONADAS ========== */}
      {/* 1 columna en movil, 3 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========== SECCION DE DOCUMENTOS ========== */}
        <div className="card">
          {/* Encabezado de la seccion */}
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Documentos</h2>
          </div>

          {/* Contenido: estado vacio o lista de documentos */}
          {documents?.results.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay documentos.</p>
          ) : (
            <div className="space-y-2">
              {/* Muestra solo los primeros 5 documentos */}
              {documents?.results.slice(0, 5).map((doc) => (
                <div key={doc.id} className="p-2 bg-gray-50 rounded text-sm">
                  {/* Nombre del documento, truncado si es muy largo */}
                  <p className="font-medium truncate">{doc.name}</p>
                  {/* Fecha de creacion formateada */}
                  <p className="text-gray-500 text-xs">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}

              {/* Enlace para ver todos si hay mas de 5 */}
              {(documents?.results.length || 0) > 5 && (
                <Link
                  to={`/documents?case_id=${id}`}
                  className="text-primary-600 text-sm hover:underline"
                >
                  Ver todos ({documents?.results.length})
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ========== SECCION DE FACTURAS ========== */}
        <div className="card">
          {/* Encabezado de la seccion */}
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Facturas</h2>
          </div>

          {/* Contenido: estado vacio o lista de facturas */}
          {invoices?.results.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay facturas.</p>
          ) : (
            <div className="space-y-2">
              {/* Muestra solo las primeras 5 facturas */}
              {invoices?.results.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="p-2 bg-gray-50 rounded text-sm">
                  {/* Numero de factura y monto total */}
                  <div className="flex justify-between">
                    <p className="font-medium">{invoice.invoice_number}</p>
                    {/* Formato peso colombiano sin decimales */}
                    <p className="font-medium">${Math.round(invoice.total_amount).toLocaleString('es-CO')}</p>
                  </div>
                  {/* Fecha de emision formateada */}
                  <p className="text-gray-500 text-xs">
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== SECCION DE HORAS TRABAJADAS ========== */}
        <div className="card">
          {/* Encabezado de la seccion */}
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold">Horas Trabajadas</h2>
          </div>

          {/* Contenido: estado vacio o lista de entradas de tiempo */}
          {timeEntries?.results.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay registros de tiempo.</p>
          ) : (
            <div className="space-y-2">
              {/* Muestra solo las primeras 5 entradas */}
              {timeEntries?.results.slice(0, 5).map((entry) => (
                <div key={entry.id} className="p-2 bg-gray-50 rounded text-sm">
                  {/* Descripcion y duracion */}
                  <div className="flex justify-between">
                    {/* Descripcion truncada */}
                    <p className="font-medium truncate flex-1">{entry.description}</p>
                    {/* Duracion en horas */}
                    <p className="font-medium ml-2">{entry.duration_hours}h</p>
                  </div>
                  {/* Fecha y nombre del abogado */}
                  <p className="text-gray-500 text-xs">
                    {new Date(entry.date).toLocaleDateString()}
                    {/* Muestra nombre del abogado si existe */}
                    {entry.attorney_name && ` - ${entry.attorney_name}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
