/**
 * Login.test.tsx - Tests for the Login page component
 *
 * These tests verify:
 * - Rendering of the login form
 * - Form validation
 * - User interactions
 * - Authentication flow
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import Login from './Login'

// Mock the useAuth hook
const mockLogin = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-redirect">{to}</div>,
  }
})

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
    })
  })

  describe('Rendering', () => {
    it('should render the login form', () => {
      render(<Login />, { withAuth: false })

      expect(screen.getByText('Bienvenido')).toBeInTheDocument()
      expect(screen.getByLabelText(/correo electronico/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/contrasena/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument()
    })

    it('should display the demo credentials', () => {
      render(<Login />, { withAuth: false })

      expect(screen.getByText(/demo:/i)).toBeInTheDocument()
      expect(screen.getByText(/admin@legalflow.com/i)).toBeInTheDocument()
    })

    it('should display the LegalFlow branding', () => {
      render(<Login />, { withAuth: false })

      // Mobile logo visible on small screens
      expect(screen.getAllByText('LegalFlow').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('User Interactions', () => {
    it('should allow user to type email', () => {
      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput.value).toBe('test@example.com')
    })

    it('should allow user to type password', () => {
      render(<Login />, { withAuth: false })

      const passwordInput = screen.getByLabelText(/contrasena/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput.value).toBe('password123')
    })

    it('should disable submit button while loading', async () => {
      // Mock login to return a never-resolving promise to keep loading state
      mockLogin.mockImplementation(() => new Promise(() => {}))

      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i)
      const passwordInput = screen.getByLabelText(/contrasena/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesion/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciando sesion/i })).toBeDisabled()
      })
    })
  })

  describe('Authentication Flow', () => {
    it('should call login with email and password on form submit', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i)
      const passwordInput = screen.getByLabelText(/contrasena/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesion/i })

      fireEvent.change(emailInput, { target: { value: 'admin@legalflow.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Admin123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@legalflow.com', 'Admin123!')
      })
    })

    it('should navigate to home after successful login', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i)
      const passwordInput = screen.getByLabelText(/contrasena/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesion/i })

      fireEvent.change(emailInput, { target: { value: 'admin@legalflow.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Admin123!' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('should redirect if already authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        login: mockLogin,
      })

      render(<Login />, { withAuth: false })

      expect(screen.getByTestId('navigate-redirect')).toHaveTextContent('/')
    })
  })

  describe('Error Handling', () => {
    it('should display error message on login failure', async () => {
      mockLogin.mockRejectedValue({
        response: {
          data: {
            detail: 'Invalid credentials',
          },
        },
      })

      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i)
      const passwordInput = screen.getByLabelText(/contrasena/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesion/i })

      fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display generic error message when server provides no detail', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))

      render(<Login />, { withAuth: false })

      const emailInput = screen.getByLabelText(/correo electronico/i)
      const passwordInput = screen.getByLabelText(/contrasena/i)
      const submitButton = screen.getByRole('button', { name: /iniciar sesion/i })

      fireEvent.change(emailInput, { target: { value: 'test@email.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/credenciales invalidas/i)).toBeInTheDocument()
      })
    })
  })
})
