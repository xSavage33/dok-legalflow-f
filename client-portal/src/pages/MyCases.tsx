/**
 * ARCHIVO: MyCases.tsx
 * PROPOSITO: Pagina que muestra la lista de todos los casos legales del cliente.
 * Permite buscar casos por titulo o numero de caso.
 * Muestra informacion resumida de cada caso con su estado y abogado asignado.
 */

// useQuery - Hook de React Query para obtener datos del servidor con cache automatico
import { useQuery } from '@tanstack/react-query'

// Link - Componente de React Router para navegacion declarativa
import { Link } from 'react-router-dom'

// api - Instancia configurada de Axios para llamadas al backend
import api from '../services/api'

// Tipos TypeScript para tipado fuerte
// Case: estructura de un caso legal
// PaginatedResponse: respuesta paginada del servidor
import type { Case, PaginatedResponse } from '../types'

// Iconos de Lucide React
// Briefcase: icono de maletin para representar casos
// ChevronRight: flecha derecha para indicar navegacion
// Search: icono de lupa para busqueda
import { Briefcase, ChevronRight, Search } from 'lucide-react'

// useState - Hook para manejar el estado de busqueda
import { useState } from 'react'

// clsx - Utilidad para construir clases CSS condicionalmente
import clsx from 'clsx'

/**
 * Componente MyCases - Lista de casos del cliente
 *
 * Caracteristicas:
 * - Carga de casos desde el API con React Query
 * - Busqueda local por titulo o numero de caso
 * - Visualizacion de estado con badges de colores
 * - Enlaces a los detalles de cada caso
 * - Estado de carga con spinner
 * - Estado vacio cuando no hay casos
 */
export default function MyCases() {
  // ========== ESTADO LOCAL ==========

  // Estado para el termino de busqueda ingresado por el usuario
  const [search, setSearch] = useState('')

  // ========== CONSULTA DE DATOS ==========

  /**
   * useQuery para obtener la lista de casos del cliente
   * - queryKey: identificador unico para el cache ['my-cases']
   * - queryFn: funcion asincrona que realiza la peticion al API
   * - data: datos retornados por la consulta
   * - isLoading: true mientras se cargan los datos
   */
  const { data, isLoading } = useQuery({
    // Clave unica para identificar esta consulta en el cache
    queryKey: ['my-cases'],
    // Funcion que ejecuta la peticion HTTP
    queryFn: async () => {
      // Realiza peticion GET al endpoint de casos del portal
      const response = await api.get<PaginatedResponse<Case>>('/portal/my-cases/')
      // Retorna los datos de la respuesta
      return response.data
    },
  })

  // ========== MAPEOS DE ETIQUETAS Y COLORES ==========

  /**
   * Mapeo de estados de caso a sus etiquetas en espanol
   * Permite mostrar textos amigables en lugar de los valores del backend
   */
  const statusLabels: Record<string, string> = {
    active: 'Activo',      // Caso en progreso activo
    pending: 'Pendiente',  // Caso pendiente de accion
    on_hold: 'En Espera',  // Caso pausado temporalmente
    closed: 'Cerrado',     // Caso finalizado
  }

  /**
   * Mapeo de estados de caso a sus clases CSS de colores
   * Define los estilos visuales para cada estado
   */
  const statusColors: Record<string, string> = {
    active: 'badge-active',                    // Verde para activo
    pending: 'badge-pending',                  // Amarillo para pendiente
    on_hold: 'bg-orange-100 text-orange-800', // Naranja para en espera
    closed: 'badge-closed',                   // Gris para cerrado
  }

  // ========== FILTRADO DE CASOS ==========

  /**
   * Filtra los casos basandose en el termino de busqueda
   * Busca coincidencias en titulo y numero de caso (case insensitive)
   */
  const filteredCases = data?.results.filter(
    (c) =>
      // Busca en el titulo del caso
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      // Busca en el numero de caso
      c.case_number.toLowerCase().includes(search.toLowerCase())
  )

  // ========== ESTADO DE CARGA ==========

  // Muestra un spinner mientras se cargan los datos
  if (isLoading) {
    return (
      // Contenedor centrado con altura fija
      <div className="flex items-center justify-center h-64">
        {/* Spinner animado */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ========== RENDERIZADO PRINCIPAL ==========

  return (
    // Contenedor principal con espaciado vertical entre secciones
    <div className="space-y-6">

      {/* ========== ENCABEZADO CON TITULO Y BUSQUEDA ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Titulo de la pagina */}
        <h1 className="text-2xl font-bold text-gray-900">Mis Casos</h1>

        {/* Campo de busqueda con icono */}
        <div className="relative">
          {/* Icono de busqueda posicionado absolutamente dentro del input */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          {/* Input de busqueda */}
          <input
            type="text"
            placeholder="Buscar casos..."
            value={search}
            // Actualiza el estado de busqueda al escribir
            onChange={(e) => setSearch(e.target.value)}
            // pl-10 para dejar espacio al icono
            className="input pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      {/* Renderizado condicional: estado vacio o lista de casos */}

      {filteredCases?.length === 0 ? (
        // ========== ESTADO VACIO ==========
        // Se muestra cuando no hay casos que coincidan con la busqueda
        <div className="text-center py-12">
          {/* Icono grande de caso */}
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {/* Mensaje principal */}
          <h2 className="text-lg font-semibold text-gray-900">No hay casos</h2>
          {/* Mensaje secundario */}
          <p className="text-gray-500">No tiene casos asignados actualmente.</p>
        </div>
      ) : (
        // ========== LISTA DE CASOS ==========
        // Grid de tarjetas de casos
        <div className="grid gap-4">
          {/* Itera sobre los casos filtrados */}
          {filteredCases?.map((caseItem) => (
            // Cada caso es un enlace clickeable a su detalle
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              // Tarjeta con efecto hover
              className="card hover:shadow-md transition-shadow"
            >
              {/* Contenedor flex para distribuir contenido */}
              <div className="flex items-center justify-between">
                {/* Seccion izquierda: icono e informacion */}
                <div className="flex items-center gap-4">
                  {/* Contenedor del icono con fondo de color */}
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary-600" />
                  </div>

                  {/* Informacion del caso */}
                  <div>
                    {/* Titulo y badge de estado */}
                    <div className="flex items-center gap-2">
                      {/* Titulo del caso */}
                      <h3 className="font-semibold text-gray-900">{caseItem.title}</h3>
                      {/* Badge de estado con color dinamico */}
                      <span className={clsx('badge', statusColors[caseItem.status])}>
                        {/* Etiqueta de estado traducida o valor original */}
                        {statusLabels[caseItem.status] || caseItem.status}
                      </span>
                    </div>
                    {/* Numero de caso y tipo */}
                    <p className="text-sm text-gray-500">
                      {caseItem.case_number} - {caseItem.case_type}
                    </p>
                    {/* Nombre del abogado (si existe) */}
                    {caseItem.lead_attorney_name && (
                      <p className="text-sm text-gray-500">
                        Abogado: {caseItem.lead_attorney_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Flecha indicando navegacion al detalle */}
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
