/**
 * Test Utilities for Admin Portal
 *
 * This file provides custom render functions and utilities for testing React components
 * with proper context providers (Router, Auth, QueryClient, etc.)
 */

import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'

// Create a custom QueryClient for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

/**
 * Custom render options extending RTL options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  route?: string
  withRouter?: boolean
  withAuth?: boolean
  withQueryClient?: boolean
}

/**
 * AllTheProviders - Wrapper component that includes all necessary providers
 */
function AllTheProviders({
  children,
  withAuth = true,
  withQueryClient = true,
}: {
  children: ReactNode
  withAuth?: boolean
  withQueryClient?: boolean
}) {
  const queryClient = createTestQueryClient()

  let content = <>{children}</>

  if (withQueryClient) {
    content = (
      <QueryClientProvider client={queryClient}>
        {content}
      </QueryClientProvider>
    )
  }

  if (withAuth) {
    content = <AuthProvider>{content}</AuthProvider>
  }

  return content
}

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  {
    initialEntries = ['/'],
    route = '/',
    withRouter = true,
    withAuth = true,
    withQueryClient = true,
    ...options
  }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const content = (
      <AllTheProviders withAuth={withAuth} withQueryClient={withQueryClient}>
        {children}
      </AllTheProviders>
    )

    if (withRouter) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {content}
        </MemoryRouter>
      )
    }

    return content
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Render a component with a specific route
 */
function renderWithRoute(
  ui: ReactElement,
  { path = '/', route = '/', ...options }: CustomRenderOptions & { path?: string } = {}
) {
  return customRender(
    <Routes>
      <Route path={path} element={ui} />
    </Routes>,
    { initialEntries: [route], ...options }
  )
}

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render, renderWithRoute, createTestQueryClient }

// Export user-event
export { default as userEvent } from '@testing-library/user-event'
