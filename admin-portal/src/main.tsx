/**
 * main.tsx - Punto de entrada de la aplicacion React
 *
 * Este es el archivo de arranque de la aplicacion. Se encarga de:
 *
 * 1. Crear el nodo raiz de React en el DOM
 * 2. Configurar los proveedores globales de la aplicacion
 * 3. Inicializar la aplicacion con StrictMode para detectar problemas
 *
 * Jerarquia de proveedores (de exterior a interior):
 * - React.StrictMode: Activa verificaciones adicionales en desarrollo
 * - QueryClientProvider: Proporciona TanStack Query para manejo de estado del servidor
 * - BrowserRouter: Proporciona el contexto de enrutamiento (React Router)
 * - AuthProvider: Proporciona el contexto de autenticacion
 * - App: Componente raiz con la configuracion de rutas
 *
 * El orden de los proveedores es importante:
 * - QueryClient va primero porque los otros componentes pueden usarlo
 * - BrowserRouter va antes de AuthProvider para que useNavigate funcione en auth
 * - AuthProvider va antes de App para que las rutas puedan verificar autenticacion
 */

// Importacion de React para usar JSX y StrictMode
import React from 'react'

// Importacion de ReactDOM para renderizar la aplicacion en el DOM
// createRoot es la nueva API de React 18 para renderizado concurrente
import ReactDOM from 'react-dom/client'

// Importacion del componente BrowserRouter de React Router
// Proporciona el contexto de enrutamiento usando la API de historial del navegador
// Permite navegacion mediante URLs sin recargar la pagina
import { BrowserRouter } from 'react-router-dom'

// Importacion de TanStack Query (anteriormente React Query)
// QueryClient: instancia que maneja la cache y configuracion de queries
// QueryClientProvider: componente proveedor que hace disponible el QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Importacion del componente raiz de la aplicacion
// Contiene la configuracion de rutas y la estructura principal
import App from './App'

// Importacion del proveedor de autenticacion
// Maneja el estado de sesion y proporciona funciones de login/logout
import { AuthProvider } from './context/AuthContext'

// Importacion de los estilos globales CSS
// Incluye Tailwind CSS y estilos personalizados de la aplicacion
import './index.css'

/**
 * Configuracion del cliente de TanStack Query
 *
 * QueryClient maneja:
 * - Cache de datos del servidor
 * - Estados de carga y error
 * - Revalidacion automatica de datos
 * - Reintentos en caso de error
 */
const queryClient = new QueryClient({
  // Opciones por defecto para todas las queries
  defaultOptions: {
    queries: {
      // retry: numero de reintentos si una query falla
      // 1 = intenta una vez mas despues del fallo inicial
      // Por defecto TanStack Query reintenta 3 veces; reducimos a 1 para UX mas rapida
      retry: 1,

      // refetchOnWindowFocus: si recargar datos cuando el usuario vuelve a la pestana
      // false = desactiva esta funcionalidad para evitar peticiones innecesarias
      // Util en aplicaciones donde los datos no cambian frecuentemente
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Punto de montaje de la aplicacion React
 *
 * document.getElementById('root')! obtiene el elemento div#root del HTML
 * El ! es una asercion de TypeScript que indica que el elemento existe
 *
 * createRoot crea un nodo raiz de React usando la nueva API de React 18
 * que habilita caracteristicas como renderizado concurrente
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  /**
   * React.StrictMode - Modo estricto de desarrollo
   *
   * Solo afecta en desarrollo, no en produccion. Activa:
   * - Deteccion de ciclos de vida deprecados
   * - Deteccion de API legacy de contexto
   * - Deteccion de side effects inseguros
   * - Doble renderizado para detectar efectos impuros
   *
   * El doble renderizado puede causar que console.logs aparezcan dos veces,
   * esto es comportamiento esperado en desarrollo.
   */
  <React.StrictMode>
    {/*
      QueryClientProvider - Proveedor de TanStack Query
      Hace disponible el queryClient a todos los componentes hijos
      Permite usar hooks como useQuery y useMutation
    */}
    <QueryClientProvider client={queryClient}>
      {/*
        BrowserRouter - Proveedor de React Router
        Habilita la navegacion client-side usando la History API
        Permite usar hooks como useNavigate, useParams, useLocation
      */}
      <BrowserRouter>
        {/*
          AuthProvider - Proveedor de autenticacion personalizado
          Proporciona el contexto de autenticacion a toda la aplicacion
          Permite usar el hook useAuth() para acceder al estado de sesion
        */}
        <AuthProvider>
          {/*
            App - Componente raiz de la aplicacion
            Contiene la configuracion de rutas y renderiza la pagina actual
          */}
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
