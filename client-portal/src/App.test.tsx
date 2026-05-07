/**
 * App.test.tsx - Tests for the main App component (routing)
 *
 * These tests verify:
 * - Route rendering
 * - Authentication protection
 * - Redirect behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from './test/test-utils'
import App from './App'

// Mock the useAuth hook
const mockUseAuth = vi.fn()

vi.mock('./context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the Layout component
vi.mock('./components/Layout', () => ({
  default: () => <div data-testid="layout">Layout Component</div>,
}))

// Mock all page components
vi.mock('./pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))

vi.mock('./pages/MyCases', () => ({
  default: () => <div data-testid="cases-page">My Cases Page</div>,
}))

vi.mock('./pages/CaseDetail', () => ({
  default: () => <div data-testid="case-detail-page">Case Detail Page</div>,
}))

vi.mock('./pages/MyDocuments', () => ({
  default: () => <div data-testid="documents-page">My Documents Page</div>,
}))

vi.mock('./pages/MyInvoices', () => ({
  default: () => <div data-testid="invoices-page">My Invoices Page</div>,
}))

vi.mock('./pages/Messages', () => ({
  default: () => <div data-testid="messages-page">Messages Page</div>,
}))

vi.mock('./pages/Profile', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
}))

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Public Routes', () => {
    it('should render Login page on /login route', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      })

      render(<App />, {
        initialEntries: ['/login'],
        withAuth: false
      })

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  describe('Protected Routes', () => {
    it('should show loading spinner while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      })

      render(<App />, {
        initialEntries: ['/cases'],
        withAuth: false
      })

      // Should show the loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should redirect to login if not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      })

      render(<App />, {
        initialEntries: ['/cases'],
        withAuth: false
      })

      // Should redirect to login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('should render protected route when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      })

      render(<App />, {
        initialEntries: ['/cases'],
        withAuth: false
      })

      // Layout should be rendered for authenticated users
      expect(screen.getByTestId('layout')).toBeInTheDocument()
    })
  })

  describe('Route Redirects', () => {
    it('should redirect root to /cases when authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      })

      render(<App />, {
        initialEntries: ['/'],
        withAuth: false
      })

      // Should show the layout (which contains the cases route by default)
      expect(screen.getByTestId('layout')).toBeInTheDocument()
    })

    it('should redirect unknown routes to root', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      })

      render(<App />, {
        initialEntries: ['/unknown-route'],
        withAuth: false
      })

      // Unknown route redirects to / which then redirects to login if not authenticated
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })
})

describe('App Authentication Flow', () => {
  it('should protect all main routes', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })

    const protectedRoutes = [
      '/cases',
      '/documents',
      '/invoices',
      '/messages',
      '/profile',
    ]

    protectedRoutes.forEach(route => {
      const { unmount } = render(<App />, {
        initialEntries: [route],
        withAuth: false
      })

      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      unmount()
    })
  })
})
