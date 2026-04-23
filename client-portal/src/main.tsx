/**
 * ARCHIVO: main.tsx
 * PROPOSITO: Punto de entrada principal de la aplicacion React del Portal del Cliente.
 * Este archivo configura todos los proveedores necesarios (React Query, Router, Autenticacion)
 * y monta la aplicacion en el DOM.
 */

// Importacion de React - biblioteca principal para construir interfaces de usuario
import React from 'react'

// Importacion de ReactDOM para renderizar la aplicacion en el navegador
// createRoot es la API moderna de React 18 para renderizado concurrente
import ReactDOM from 'react-dom/client'

// BrowserRouter proporciona navegacion basada en el historial del navegador
// Permite navegacion SPA (Single Page Application) sin recargar la pagina
import { BrowserRouter } from 'react-router-dom'

// React Query - biblioteca para manejo de estado del servidor
// QueryClient: instancia que gestiona el cache de consultas
// QueryClientProvider: proveedor que hace disponible el cliente en toda la aplicacion
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// AuthProvider - contexto personalizado que maneja el estado de autenticacion del usuario
import { AuthProvider } from './context/AuthContext'

// Componente principal de la aplicacion que contiene todas las rutas
import App from './App'

// Estilos globales de la aplicacion (Tailwind CSS y estilos personalizados)
import './index.css'

/**
 * Configuracion del cliente de React Query
 * Este cliente maneja el cache, refetch y estado de todas las consultas de datos
 */
const queryClient = new QueryClient({
  // Opciones por defecto para todas las consultas
  defaultOptions: {
    queries: {
      // retry: 1 - Solo reintentar una vez si la consulta falla
      // (por defecto React Query reintenta 3 veces)
      retry: 1,
      // refetchOnWindowFocus: false - No volver a consultar automaticamente
      // cuando el usuario regresa a la ventana del navegador
      // Esto evita consultas innecesarias y mejora el rendimiento
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Renderizado de la aplicacion
 *
 * document.getElementById('root')! - Obtiene el elemento DOM donde se montara la app
 * El signo de exclamacion (!) indica a TypeScript que el elemento definitivamente existe
 *
 * Estructura de proveedores (de exterior a interior):
 * 1. React.StrictMode - Activa comprobaciones adicionales en desarrollo
 * 2. BrowserRouter - Proporciona funcionalidad de enrutamiento
 * 3. QueryClientProvider - Proporciona el cliente de React Query
 * 4. AuthProvider - Proporciona el contexto de autenticacion
 * 5. App - Componente raiz de la aplicacion
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode ayuda a identificar problemas potenciales en la aplicacion
  // Solo afecta al modo desarrollo, no tiene efecto en produccion
  <React.StrictMode>
    {/* BrowserRouter habilita la navegacion basada en URL */}
    <BrowserRouter>
      {/* QueryClientProvider hace que React Query este disponible en toda la app */}
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider gestiona el estado de autenticacion globalmente */}
        <AuthProvider>
          {/* App es el componente raiz que contiene todas las rutas y paginas */}
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
