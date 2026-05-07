/**
 * ARCHIVO: MyDocuments.tsx
 * PROPOSITO: Pagina que muestra todos los documentos del cliente.
 * Permite buscar y filtrar documentos por categoria.
 * Incluye funcionalidad de descarga de documentos.
 */

// Hooks de React Query
// useQuery: para obtener datos del servidor
// useMutation: para ejecutar acciones que modifican datos (descarga)
// useQueryClient: para invalidar cache despues de mutaciones
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// api - Cliente HTTP configurado
import api from '../services/api'

// Tipos TypeScript para documentos y respuestas paginadas
import type { Document, PaginatedResponse } from '../types'

// Iconos de Lucide React
// FileText: icono de documento
// Download: icono de descarga
// Search: icono de busqueda
// Filter: icono de filtro
import { FileText, Download, Search, Filter } from 'lucide-react'

// useState - Hook para estados locales de busqueda y filtros
import { useState } from 'react'

// clsx - Utilidad para clases CSS condicionales
import clsx from 'clsx'

/**
 * Componente MyDocuments - Lista de documentos del cliente
 *
 * Caracteristicas:
 * - Carga de documentos desde el API
 * - Busqueda por nombre de documento
 * - Filtro por categoria de documento
 * - Descarga de documentos mediante blob
 * - Tabla responsiva con informacion detallada
 */
export default function MyDocuments() {
  // ========== ESTADOS LOCALES ==========

  // Estado para el termino de busqueda
  const [search, setSearch] = useState('')

  // Estado para el filtro de categoria seleccionada
  const [categoryFilter, setCategoryFilter] = useState('')

  // Cliente de React Query para invalidar cache
  const queryClient = useQueryClient()

  // ========== CONSULTA DE DOCUMENTOS ==========

  /**
   * Consulta para obtener la lista de documentos del cliente
   */
  const { data, isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      // Peticion GET al endpoint de documentos del portal
      const response = await api.get<PaginatedResponse<Document>>('/portal/my-documents/')
      return response.data
    },
  })

  // ========== MUTACION PARA DESCARGA ==========

  /**
   * Mutacion para descargar un documento
   * Solicita el archivo como blob y lo descarga en el navegador
   */
  const downloadMutation = useMutation({
    // Funcion que ejecuta la descarga
    mutationFn: async (documentId: string) => {
      // Peticion GET para obtener el archivo
      // responseType: 'blob' indica que esperamos datos binarios
      const response = await api.get(`/portal/my-documents/${documentId}/download/`, {
        responseType: 'blob',
      })
      return response
    },
    // Callback ejecutado cuando la descarga es exitosa
    onSuccess: (response, documentId) => {
      // Busca el documento en los datos para obtener su nombre
      const doc = data?.results.find((d) => d.id === documentId)

      // Obtener el tipo MIME del documento o usar uno por defecto
      const mimeType = doc?.mime_type || 'application/octet-stream'

      // Crea una URL temporal para el blob descargado con el tipo MIME correcto
      const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }))

      // Crea un elemento <a> temporal para iniciar la descarga
      const link = document.createElement('a')
      link.href = url

      // Establece el nombre del archivo de descarga usando el nombre original con extension
      link.setAttribute('download', doc?.original_filename || doc?.name || 'documento')

      // Agrega el enlace al DOM, hace clic y lo elimina
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Liberar la URL del objeto para evitar memory leaks
      window.URL.revokeObjectURL(url)

      // Invalida el cache para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['my-documents'] })
    },
  })

  // ========== MAPEO DE CATEGORIAS ==========

  /**
   * Etiquetas en espanol para las categorias de documentos
   */
  const categoryLabels: Record<string, string> = {
    contract: 'Contrato',           // Contratos legales
    pleading: 'Escrito',            // Escritos judiciales
    evidence: 'Evidencia',          // Material probatorio
    correspondence: 'Correspondencia', // Cartas y comunicaciones
    court_filing: 'Presentacion Judicial', // Documentos presentados en corte
    invoice: 'Factura',             // Facturas
    other: 'Otro',                  // Otros documentos
  }

  // ========== EXTRACCION DE CATEGORIAS UNICAS ==========

  /**
   * Obtiene las categorias unicas de los documentos para el filtro
   * Usa Set para eliminar duplicados
   */
  const categories = [...new Set(data?.results.map((d) => d.category) || [])]

  // ========== FILTRADO DE DOCUMENTOS ==========

  /**
   * Filtra documentos basandose en busqueda y categoria
   */
  const filteredDocuments = data?.results.filter((doc) => {
    // Verifica si el nombre coincide con la busqueda (case insensitive)
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase())
    // Verifica si la categoria coincide (si hay filtro seleccionado)
    const matchesCategory = !categoryFilter || doc.category === categoryFilter
    // El documento debe cumplir ambas condiciones
    return matchesSearch && matchesCategory
  })

  // ========== FUNCION DE FORMATO DE TAMANO ==========

  /**
   * Convierte bytes a formato legible (KB, MB, GB)
   * @param bytes - Tamano en bytes
   * @returns Cadena formateada con unidad apropiada
   */
  const formatFileSize = (bytes: number) => {
    // Si es 0, retorna directamente
    if (bytes === 0) return '0 Bytes'

    // Factor de conversion
    const k = 1024

    // Unidades disponibles
    const sizes = ['Bytes', 'KB', 'MB', 'GB']

    // Calcula el indice de la unidad apropiada usando logaritmo
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    // Calcula el valor y formatea con 2 decimales
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

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
      {/* Titulo de la pagina */}
      <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>

      {/* ========== BARRA DE FILTROS ========== */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Campo de busqueda */}
        <div className="relative flex-1">
          {/* Icono de busqueda */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {/* Input de busqueda */}
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Selector de categoria */}
        <div className="relative">
          {/* Icono de filtro */}
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {/* Select de categorias */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            // appearance-none: elimina estilos nativos del select
            className="input pl-10 pr-8 appearance-none"
          >
            {/* Opcion por defecto: todas las categorias */}
            <option value="">Todas las categorias</option>
            {/* Opciones dinamicas basadas en categorias existentes */}
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {/* Muestra etiqueta traducida o valor original */}
                {categoryLabels[cat] || cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      {/* Renderizado condicional: estado vacio o tabla de documentos */}

      {filteredDocuments?.length === 0 ? (
        // ========== ESTADO VACIO ==========
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">No hay documentos</h2>
          <p className="text-gray-500">No tiene documentos disponibles actualmente.</p>
        </div>
      ) : (
        // ========== TABLA DE DOCUMENTOS ==========
        <div className="card overflow-hidden">
          {/* Contenedor para scroll horizontal en pantallas pequenas */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Encabezado de la tabla */}
              <thead className="bg-gray-50">
                <tr>
                  {/* Columna: Documento */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  {/* Columna: Categoria */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  {/* Columna: Caso asociado */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caso
                  </th>
                  {/* Columna: Tamano del archivo */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamano
                  </th>
                  {/* Columna: Fecha de creacion */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  {/* Columna: Acciones */}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la tabla */}
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Itera sobre los documentos filtrados */}
                {filteredDocuments?.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    {/* Celda: Nombre del documento con icono */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>

                    {/* Celda: Categoria con badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge bg-gray-100 text-gray-800">
                        {categoryLabels[doc.category] || doc.category}
                      </span>
                    </td>

                    {/* Celda: Numero de caso o guion si no tiene */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.case_number || '-'}
                    </td>

                    {/* Celda: Tamano formateado */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.file_size ?? 0)}
                    </td>

                    {/* Celda: Fecha formateada */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>

                    {/* Celda: Boton de descarga */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        // Ejecuta la mutacion de descarga con el ID del documento
                        onClick={() => downloadMutation.mutate(doc.id)}
                        // Deshabilita mientras la descarga esta en progreso
                        disabled={downloadMutation.isPending}
                        className={clsx(
                          'inline-flex items-center text-primary-600 hover:text-primary-800',
                          // Reduce opacidad y cambia cursor cuando esta cargando
                          downloadMutation.isPending && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
