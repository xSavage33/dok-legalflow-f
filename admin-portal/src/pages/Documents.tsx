/**
 * =====================================================
 * COMPONENTE: Documents (Gestion de Documentos)
 * =====================================================
 *
 * PROPOSITO:
 * Este componente proporciona una interfaz completa para la gestion de documentos
 * del despacho juridico. Permite subir, visualizar, descargar y organizar
 * documentos con soporte para versionado y registro de accesos.
 *
 * FUNCIONALIDADES:
 * - Listado de documentos con busqueda y filtros
 * - Subida de nuevos documentos con metadata
 * - Visualizacion de detalles del documento
 * - Descarga de documentos
 * - Gestion de versiones de documentos
 * - Historial de accesos a documentos
 * - Marcado de documentos como confidenciales o privilegiados
 * - Asociacion de documentos a casos especificos
 *
 * MODALES:
 * - Modal de subida de documento
 * - Modal de detalle con pestanas (info, versiones, historial)
 * - Modal de subida de nueva version
 *
 * DEPENDENCIAS:
 * - React Query para fetching y mutaciones
 * - React para hooks de estado y refs
 * - Lucide React para iconografia
 * - clsx para clases CSS condicionales
 * - Sistema de permisos personalizado
 *
 * =====================================================
 */

// Importa hooks de React Query:
// - useQuery: para obtener datos del servidor
// - useMutation: para crear/actualizar documentos
// - useQueryClient: para invalidar cache despues de mutaciones
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Importa la instancia configurada de axios para peticiones HTTP
import api from '../services/api'

// Importa tipos TypeScript para tipado estatico:
// - Document: estructura de un documento
// - DocumentAccessLog: registro de acceso a documento
// - Case: estructura de un caso (para el dropdown de asociacion)
// - PaginatedResponse: wrapper de respuesta paginada
import type { Document, DocumentAccessLog, Case, PaginatedResponse } from '../types'

// Importa iconos de Lucide React para la interfaz:
// Cada icono tiene un proposito especifico en la UI
import {
  Upload,          // Icono de subida de archivos
  Search,          // Icono de busqueda
  FileText,        // Icono generico de documento
  Download,        // Icono de descarga
  X,               // Icono de cerrar modal
  Filter,          // Icono de filtros
  History,         // Icono de historial/versiones
  Shield,          // Icono de confidencial (escudo)
  Lock,            // Icono de privilegiado (candado)
  Clock,           // Icono de tiempo/historial
  User,            // Icono de usuario
  Loader2,         // Spinner de carga animado
  ChevronRight,    // Flecha de navegacion
  Plus,            // Icono de agregar
  AlertCircle,     // Icono de alerta/error
  FileUp,          // Icono de archivo seleccionado para subir
} from 'lucide-react'

// Importa hooks de React:
// - useState: manejo de estado local
// - useRef: referencia a elementos del DOM (inputs de archivo)
import { useState, useRef } from 'react'

// Importa clsx para construir strings de clases CSS condicionalmente
import clsx from 'clsx'

// Importa la funcion de verificacion de permisos y el tipo Role
import { hasPermission, type Role } from '../lib/permissions'

// Importa el hook de autenticacion para obtener el usuario actual
import { useAuth } from '../context/AuthContext'

/**
 * Array de categorias de documentos disponibles
 * Cada objeto tiene value (para el backend) y label (para mostrar en espanol)
 */
const CATEGORIES = [
  { value: 'pleading', label: 'Escrito/Demanda' },
  { value: 'contract', label: 'Contrato' },
  { value: 'evidence', label: 'Evidencia' },
  { value: 'correspondence', label: 'Correspondencia' },
  { value: 'court_order', label: 'Orden Judicial' },
  { value: 'motion', label: 'Mocion' },
  { value: 'brief', label: 'Memorial' },
  { value: 'discovery', label: 'Descubrimiento' },
  { value: 'exhibit', label: 'Anexo' },
  { value: 'invoice', label: 'Factura' },
  { value: 'receipt', label: 'Recibo' },
  { value: 'power_of_attorney', label: 'Poder' },
  { value: 'identification', label: 'Identificacion' },
  { value: 'other', label: 'Otro' },
]

/**
 * Array de estados de documento disponibles
 */
const STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending_review', label: 'Pendiente Revision' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'filed', label: 'Radicado' },
  { value: 'archived', label: 'Archivado' },
]

/**
 * Mapeo de estados a clases CSS de badges
 * Define el estilo visual de cada estado
 */
const statusColors: Record<string, string> = {
  draft: 'badge-gray',           // Gris para borradores
  pending_review: 'badge-warning', // Amarillo para pendientes de revision
  approved: 'badge-success',     // Verde para aprobados
  filed: 'badge-primary',        // Azul primario para radicados
  archived: 'badge-gray',        // Gris para archivados
}

/**
 * Componente principal de la pagina de documentos
 * Maneja toda la logica de gestion documental
 */
export default function Documents() {
  // Obtiene el usuario actual del contexto de autenticacion
  const { user } = useAuth()

  // Convierte el rol del usuario al tipo Role para verificacion de permisos
  const userRole = user?.role as Role | undefined

  // Verifica si el usuario puede crear documentos
  const canCreate = hasPermission(userRole, 'documents.create')

  // Verifica si el usuario puede editar documentos
  const canEdit = hasPermission(userRole, 'documents.edit')

  // Cliente de React Query para manipular el cache
  const queryClient = useQueryClient()

  // Referencia al input de archivo oculto para subida principal
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Referencia al input de archivo oculto para subida de versiones
  const versionFileInputRef = useRef<HTMLInputElement>(null)

  // =====================================================
  // ESTADOS LOCALES DEL COMPONENTE
  // =====================================================

  // Estados para busqueda y filtros
  const [search, setSearch] = useState('')           // Termino de busqueda
  const [categoryFilter, setCategoryFilter] = useState('')  // Filtro por categoria
  const [statusFilter, setStatusFilter] = useState('')      // Filtro por estado
  const [showFilters, setShowFilters] = useState(false)     // Visibilidad del panel de filtros

  // Estados para modales
  const [showUploadModal, setShowUploadModal] = useState(false)    // Modal de subida
  const [showDetailModal, setShowDetailModal] = useState(false)    // Modal de detalle
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)  // Documento seleccionado
  const [detailTab, setDetailTab] = useState<'info' | 'versions' | 'logs'>('info') // Pestana activa en detalle

  // Estados para el formulario de subida
  const [uploadFile, setUploadFile] = useState<File | null>(null)  // Archivo seleccionado
  const [uploadForm, setUploadForm] = useState({
    name: '',                    // Nombre del documento
    description: '',             // Descripcion
    category: 'other',           // Categoria por defecto
    case_id: '',                 // ID del caso asociado (opcional)
    is_confidential: false,      // Marca de confidencialidad
    is_privileged: false,        // Marca de privilegio legal
  })

  // Estados para subida de nueva version
  const [showVersionModal, setShowVersionModal] = useState(false)  // Visibilidad del modal
  const [versionFile, setVersionFile] = useState<File | null>(null) // Archivo de la version
  const [versionDescription, setVersionDescription] = useState('')  // Descripcion de cambios

  // =====================================================
  // QUERIES DE DATOS
  // =====================================================

  /**
   * Query principal para obtener la lista de documentos
   * Incluye filtros de busqueda, categoria y estado
   */
  const { data, isLoading } = useQuery({
    // La queryKey incluye los filtros para cache separado por combinacion
    queryKey: ['documents', search, categoryFilter, statusFilter],
    queryFn: async () => {
      // Construye parametros de query dinamicamente
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (categoryFilter) params.append('category', categoryFilter)
      if (statusFilter) params.append('status', statusFilter)
      // Peticion al endpoint de documentos con los filtros
      const response = await api.get<PaginatedResponse<Document>>(`/documents/?${params}`)
      return response.data
    },
  })

  /**
   * Query para obtener la lista de casos (para el dropdown de asociacion)
   * Limitado a 100 resultados para rendimiento
   */
  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Case>>('/cases/?limit=100')
      return response.data.results
    },
  })

  /**
   * Query para obtener el detalle completo del documento seleccionado
   * Solo se ejecuta cuando hay un documento seleccionado y el modal esta abierto
   */
  const { data: documentDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['document', selectedDocument?.id],
    queryFn: async () => {
      if (!selectedDocument?.id) return null
      const response = await api.get<Document>(`/documents/${selectedDocument.id}/`)
      return response.data
    },
    // Solo ejecuta si hay documento seleccionado y modal abierto
    enabled: !!selectedDocument?.id && showDetailModal,
  })

  /**
   * Query para obtener el historial de accesos al documento
   * Solo se ejecuta cuando la pestana de logs esta activa
   */
  const { data: accessLogs } = useQuery({
    queryKey: ['document-logs', selectedDocument?.id],
    queryFn: async () => {
      if (!selectedDocument?.id) return []
      const response = await api.get<PaginatedResponse<DocumentAccessLog>>(
        `/documents/${selectedDocument.id}/access-log/`
      )
      return response.data.results
    },
    // Solo ejecuta si el modal esta abierto y la pestana es 'logs'
    enabled: !!selectedDocument?.id && showDetailModal && detailTab === 'logs',
  })

  // =====================================================
  // MUTACIONES
  // =====================================================

  /**
   * Mutacion para subir un nuevo documento
   * Envia FormData con el archivo y metadata
   */
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // POST con Content-Type multipart/form-data para archivos
      const response = await api.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      // Actualiza la lista de documentos
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      // Cierra el modal y limpia el formulario
      setShowUploadModal(false)
      resetUploadForm()
    },
  })

  /**
   * Mutacion para subir una nueva version de documento existente
   */
  const versionMutation = useMutation({
    mutationFn: async ({ documentId, formData }: { documentId: string; formData: FormData }) => {
      // POST al endpoint de versiones del documento especifico
      const response = await api.post(`/documents/${documentId}/versions/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      // Actualiza la lista y el detalle del documento
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', selectedDocument?.id] })
      // Cierra el modal y limpia el estado
      setShowVersionModal(false)
      setVersionFile(null)
      setVersionDescription('')
    },
  })

  /**
   * Mutacion para actualizar metadata de un documento (ej: cambiar estado)
   */
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Document> }) => {
      // PATCH para actualizacion parcial
      const response = await api.patch(`/documents/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      // Actualiza la lista y el detalle
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document', selectedDocument?.id] })
    },
  })

  // =====================================================
  // FUNCIONES AUXILIARES
  // =====================================================

  /**
   * Reinicia el formulario de subida a sus valores iniciales
   * Se llama al cerrar el modal o despues de subir exitosamente
   */
  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadForm({
      name: '',
      description: '',
      category: 'other',
      case_id: '',
      is_confidential: false,
      is_privileged: false,
    })
    // Limpia el valor del input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Manejador para cuando se selecciona un archivo
   * Actualiza el estado y sugiere el nombre del archivo
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      // Si no hay nombre, sugiere el nombre del archivo sin extension
      if (!uploadForm.name) {
        setUploadForm(prev => ({ ...prev, name: file.name.split('.')[0] }))
      }
    }
  }

  /**
   * Ejecuta la subida del documento
   * Construye FormData y llama a la mutacion
   */
  const handleUpload = () => {
    if (!uploadFile) return

    // Construye el FormData con archivo y metadata
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('name', uploadForm.name || uploadFile.name)
    formData.append('description', uploadForm.description)
    formData.append('category', uploadForm.category)
    if (uploadForm.case_id) {
      formData.append('case_id', uploadForm.case_id)
    }
    formData.append('is_confidential', String(uploadForm.is_confidential))
    formData.append('is_privileged', String(uploadForm.is_privileged))

    // Ejecuta la mutacion
    uploadMutation.mutate(formData)
  }

  /**
   * Ejecuta la subida de una nueva version
   */
  const handleVersionUpload = () => {
    if (!versionFile || !selectedDocument) return

    const formData = new FormData()
    formData.append('file', versionFile)
    formData.append('changes_description', versionDescription)

    versionMutation.mutate({ documentId: selectedDocument.id, formData })
  }

  /**
   * Descarga un documento desde el servidor
   * Crea un enlace temporal para iniciar la descarga
   */
  const handleDownload = async (documentId: string, filename: string) => {
    try {
      // Peticion con responseType blob para archivos binarios
      const response = await api.get(`/documents/${documentId}/download/`, {
        responseType: 'blob',
      })
      // Crea URL temporal para el blob
      const url = window.URL.createObjectURL(new Blob([response.data]))
      // Crea enlace invisible y simula clic
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      // Limpieza
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  /**
   * Descarga una version especifica de un documento
   */
  const handleVersionDownload = async (documentId: string, versionNumber: number, docName: string) => {
    try {
      const response = await api.get(`/documents/${documentId}/versions/${versionNumber}/download/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      // Incluye numero de version en el nombre
      link.setAttribute('download', `${docName}_v${versionNumber}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading version:', error)
    }
  }

  /**
   * Abre el modal de detalle para un documento
   */
  const openDetail = (doc: Document) => {
    setSelectedDocument(doc)
    setDetailTab('info')  // Empieza en la pestana de informacion
    setShowDetailModal(true)
  }

  /**
   * Formatea el tamano de archivo a una cadena legible
   * Convierte bytes a KB o MB segun corresponda
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Formatea una fecha ISO a formato legible en espanol
   */
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Obtiene la etiqueta traducida de una categoria
   */
  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
  }

  /**
   * Obtiene la etiqueta traducida de un estado
   */
  const getStatusLabel = (value: string) => {
    return STATUSES.find(s => s.value === value)?.label || value
  }

  // =====================================================
  // RENDERIZADO DEL COMPONENTE
  // =====================================================
  return (
    <div className="space-y-6">

      {/* ===== SECCION: Encabezado de la Pagina ===== */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">Gestiona los documentos del despacho</p>
        </div>
        {/* Boton de subir documento (solo si tiene permiso) */}
        {canCreate && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary inline-flex items-center"
          >
            <Upload className="h-5 w-5 mr-2" />
            {/* Texto responsivo */}
            <span className="hidden sm:inline">Subir Documento</span>
            <span className="sm:hidden">Subir</span>
          </button>
        )}
      </div>

      {/* ===== SECCION: Busqueda y Filtros ===== */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Campo de busqueda con icono */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          {/* Boton de mostrar/ocultar filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'btn inline-flex items-center',
              showFilters ? 'btn-primary' : 'btn-secondary'  // Cambia estilo segun estado
            )}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </button>
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtro por categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="">Todas las categorias</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">Todos los estados</option>
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ===== SECCION: Grid de Documentos ===== */}
      {isLoading ? (
        // Estado de carga: spinner centrado
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        // Grid responsivo de tarjetas de documentos
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.results.map((doc) => (
            // Tarjeta individual de documento (clickeable)
            <div
              key={doc.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openDetail(doc)}
            >
              <div className="flex items-start gap-4">
                {/* Icono de documento con fondo */}
                <div className="p-3 bg-primary-100 rounded-lg flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Nombre del documento con iconos de seguridad */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                    {/* Icono de confidencial si aplica */}
                    {doc.is_confidential && (
                      <span title="Confidencial"><Shield className="h-4 w-4 text-red-500" /></span>
                    )}
                    {/* Icono de privilegiado si aplica */}
                    {doc.is_privileged && (
                      <span title="Privilegiado"><Lock className="h-4 w-4 text-amber-500" /></span>
                    )}
                  </div>
                  {/* Nombre del archivo original */}
                  <p className="text-sm text-gray-500 truncate">{doc.original_filename}</p>
                  {/* Badges de estado y categoria */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={clsx('badge', statusColors[doc.status] || 'badge-gray')}>
                      {getStatusLabel(doc.status)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getCategoryLabel(doc.category)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Pie de tarjeta con tamano y acciones */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span className="mx-2">•</span>
                  <span>v{doc.current_version}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Boton de descarga rapida */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()  // Evita abrir el modal
                      handleDownload(doc.id, doc.original_filename)
                    }}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}

          {/* Estado vacio cuando no hay documentos */}
          {data?.results.length === 0 && (
            <div className="col-span-full">
              <div className="empty-state py-12">
                <FileText className="empty-state-icon" />
                <p className="empty-state-title">No hay documentos</p>
                <p className="empty-state-description">
                  {/* Mensaje dinamico segun si hay filtros activos */}
                  {search || categoryFilter || statusFilter
                    ? 'No se encontraron documentos con los filtros aplicados'
                    : 'Sube tu primer documento para comenzar'}
                </p>
                {/* Boton de subir solo si tiene permiso y no hay filtros */}
                {canCreate && !search && !categoryFilter && !statusFilter && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary mt-4"
                  >
                    Subir Documento
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL: Subir Documento ===== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Fondo oscuro semi-transparente (cierra al hacer clic) */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => {
                setShowUploadModal(false)
                resetUploadForm()
              }}
            />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Subir Documento</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    resetUploadForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* ----- Selector de Archivo ----- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo *
                  </label>
                  {/* Zona de arrastre/clic para seleccionar archivo */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                      uploadFile
                        ? 'border-primary-500 bg-primary-50'  // Estilo cuando hay archivo
                        : 'border-gray-300 hover:border-primary-400'  // Estilo vacio
                    )}
                  >
                    {/* Input de archivo oculto */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadFile ? (
                      // Muestra info del archivo seleccionado
                      <div className="flex items-center justify-center gap-3">
                        <FileUp className="h-8 w-8 text-primary-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{uploadFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(uploadFile.size)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Instrucciones cuando no hay archivo
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">
                          Haz clic para seleccionar un archivo
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          PDF, DOC, DOCX, XLS, XLSX, PNG, JPG hasta 50MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* ----- Campo: Nombre del Documento ----- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del documento *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="Nombre descriptivo"
                  />
                </div>

                {/* ----- Campo: Categoria ----- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ----- Campo: Asociar a Caso ----- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asociar a caso
                  </label>
                  <select
                    value={uploadForm.case_id}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, case_id: e.target.value }))}
                    className="input"
                  >
                    <option value="">Sin caso asociado</option>
                    {casesData?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.case_number} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ----- Campo: Descripcion ----- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripcion
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Descripcion opcional del documento"
                  />
                </div>

                {/* ----- Opciones de Seguridad ----- */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Checkbox: Confidencial */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.is_confidential}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, is_confidential: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Shield className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-700">Confidencial</span>
                  </label>
                  {/* Checkbox: Privilegiado */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadForm.is_privileged}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, is_privileged: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-700">Privilegiado</span>
                  </label>
                </div>
              </div>

              {/* Mensaje de error si la subida falla */}
              {uploadMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al subir el documento. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion del modal */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    resetUploadForm()
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || !uploadForm.name || uploadMutation.isPending}
                  className="btn btn-primary inline-flex items-center"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Detalle del Documento ===== */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Fondo oscuro */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setShowDetailModal(false)}
            />
            {/* Contenedor del modal con altura maxima */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

              {/* ----- Encabezado del Modal ----- */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {selectedDocument.name}
                      {/* Iconos de seguridad */}
                      {selectedDocument.is_confidential && (
                        <Shield className="h-5 w-5 text-red-500" />
                      )}
                      {selectedDocument.is_privileged && (
                        <Lock className="h-5 w-5 text-amber-500" />
                      )}
                    </h2>
                    <p className="text-sm text-gray-500">v{selectedDocument.current_version}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* ----- Pestanas de Navegacion ----- */}
              <div className="border-b">
                <div className="flex">
                  {/* Pestana: Informacion */}
                  <button
                    onClick={() => setDetailTab('info')}
                    className={clsx(
                      'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                      detailTab === 'info'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Informacion
                  </button>
                  {/* Pestana: Versiones */}
                  <button
                    onClick={() => setDetailTab('versions')}
                    className={clsx(
                      'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                      detailTab === 'versions'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <History className="h-4 w-4 inline mr-1" />
                    Versiones
                  </button>
                  {/* Pestana: Historial de Accesos */}
                  <button
                    onClick={() => setDetailTab('logs')}
                    className={clsx(
                      'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                      detailTab === 'logs'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Clock className="h-4 w-4 inline mr-1" />
                    Historial
                  </button>
                </div>
              </div>

              {/* ----- Contenido del Modal (segun pestana activa) ----- */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetail ? (
                  // Spinner mientras carga el detalle
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    {/* PESTANA: Informacion */}
                    {detailTab === 'info' && (
                      <div className="space-y-4">
                        {/* Grid de campos de informacion */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500">Archivo original</span>
                            <p className="font-medium truncate">
                              {documentDetail?.original_filename || selectedDocument.original_filename}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Tamano</span>
                            <p className="font-medium">
                              {formatFileSize(documentDetail?.file_size || selectedDocument.file_size)}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Categoria</span>
                            <p className="font-medium">
                              {getCategoryLabel(documentDetail?.category || selectedDocument.category)}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Estado</span>
                            <p>
                              <span className={clsx('badge', statusColors[documentDetail?.status || selectedDocument.status])}>
                                {getStatusLabel(documentDetail?.status || selectedDocument.status)}
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Creado por</span>
                            <p className="font-medium">
                              {documentDetail?.created_by_name || selectedDocument.created_by_name}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Fecha de creacion</span>
                            <p className="font-medium">
                              {formatDate(documentDetail?.created_at || selectedDocument.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Descripcion (si existe) */}
                        {documentDetail?.description && (
                          <div>
                            <span className="text-sm text-gray-500">Descripcion</span>
                            <p className="mt-1 text-gray-700">{documentDetail.description}</p>
                          </div>
                        )}

                        {/* Selector de cambio de estado (solo si tiene permiso) */}
                        {canEdit && (
                          <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cambiar estado
                            </label>
                            <select
                              value={documentDetail?.status || selectedDocument.status}
                              onChange={(e) => {
                                updateMutation.mutate({
                                  id: selectedDocument.id,
                                  data: { status: e.target.value },
                                })
                              }}
                              className="input"
                              disabled={updateMutation.isPending}
                            >
                              {STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PESTANA: Versiones */}
                    {detailTab === 'versions' && (
                      <div className="space-y-4">
                        {/* Boton para subir nueva version (solo si tiene permiso) */}
                        {canEdit && (
                          <button
                            onClick={() => setShowVersionModal(true)}
                            className="btn btn-secondary inline-flex items-center"
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Subir nueva version
                          </button>
                        )}

                        <div className="space-y-3">
                          {/* Version actual (destacada) */}
                          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    Version {documentDetail?.current_version || selectedDocument.current_version}
                                  </span>
                                  <span className="badge badge-success">Actual</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {formatDate(documentDetail?.updated_at || selectedDocument.created_at)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDownload(selectedDocument.id, selectedDocument.original_filename)}
                                className="btn btn-secondary btn-sm"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Versiones anteriores */}
                          {documentDetail?.versions?.filter(v => v.version_number !== documentDetail.current_version)
                            .map((version) => (
                              <div key={version.id} className="p-4 bg-gray-50 border rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">Version {version.version_number}</span>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(version.created_at)} por {version.created_by_name}
                                    </p>
                                    {/* Descripcion de cambios (si existe) */}
                                    {version.changes_description && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {version.changes_description}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleVersionDownload(
                                      selectedDocument.id,
                                      version.version_number,
                                      selectedDocument.name
                                    )}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}

                          {/* Mensaje cuando solo hay una version */}
                          {(!documentDetail?.versions || documentDetail.versions.length <= 1) && (
                            <p className="text-center text-gray-500 py-4">
                              No hay versiones anteriores
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PESTANA: Historial de Accesos */}
                    {detailTab === 'logs' && (
                      <div className="space-y-3">
                        {accessLogs && accessLogs.length > 0 ? (
                          // Lista de registros de acceso
                          accessLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="p-2 bg-white rounded-full">
                                <User className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                  <span className="font-medium">{log.user_email}</span>
                                  <span className="text-gray-500"> {log.action_display.toLowerCase()}</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDate(log.timestamp)}
                                  {/* IP del acceso si esta disponible */}
                                  {log.ip_address && ` - ${log.ip_address}`}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Mensaje cuando no hay historial
                          <p className="text-center text-gray-500 py-4">
                            No hay historial de accesos
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ----- Pie del Modal ----- */}
              <div className="p-6 border-t bg-gray-50 flex justify-between">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => handleDownload(selectedDocument.id, selectedDocument.original_filename)}
                  className="btn btn-primary inline-flex items-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Subir Nueva Version ===== */}
      {showVersionModal && selectedDocument && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Fondo oscuro */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => {
                setShowVersionModal(false)
                setVersionFile(null)
                setVersionDescription('')
              }}
            />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nueva Version</h2>
                <button
                  onClick={() => {
                    setShowVersionModal(false)
                    setVersionFile(null)
                    setVersionDescription('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Selector de archivo para la nueva version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archivo *
                  </label>
                  <div
                    onClick={() => versionFileInputRef.current?.click()}
                    className={clsx(
                      'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                      versionFile
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:border-primary-400'
                    )}
                  >
                    <input
                      ref={versionFileInputRef}
                      type="file"
                      onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {versionFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileUp className="h-8 w-8 text-primary-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{versionFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(versionFile.size)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Selecciona el archivo actualizado</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Campo para descripcion de cambios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripcion de cambios
                  </label>
                  <textarea
                    value={versionDescription}
                    onChange={(e) => setVersionDescription(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Que cambios incluye esta version?"
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {versionMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al subir la version. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowVersionModal(false)
                    setVersionFile(null)
                    setVersionDescription('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVersionUpload}
                  disabled={!versionFile || versionMutation.isPending}
                  className="btn btn-primary inline-flex items-center"
                >
                  {versionMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      {/* Muestra el numero de la nueva version */}
                      Subir version {(selectedDocument.current_version || 1) + 1}
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
