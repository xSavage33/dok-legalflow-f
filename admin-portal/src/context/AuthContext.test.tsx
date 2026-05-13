/**
 * AuthContext.test.tsx - Tests for the Authentication Context
 *
 * These tests verify:
 * - AuthProvider functionality
 * - Login and logout flows
 * - Token persistence in localStorage
 * - User state management
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'
import { mockUser, mockAuthTokens, mockLoginResponse } from '../test/mocks/fixtures'

// Create mock functions using vi.hoisted so they're available before vi.mock runs
const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
}))

// Mock the auth service using the hoisted mock functions
vi.mock('../services/auth', () => ({
  authService: mockAuthService,
}))

// Test component that uses the auth context
function TestComponent() {
  const { user, isAuthenticated, loading, login, logout } = useAuth()

  if (loading) {
    return <div data-testid="loading">Loading...</div>
  }

  const handleLogin = async () => {
    try {
      await login('test@test.com', 'password123')
    } catch {
      // Error is expected in some tests - component handles it gracefully
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Error is expected in some tests - component handles it gracefully
    }
  }

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      {user && <div data-testid="user-role">{user.role}</div>}
      <button onClick={handleLogin} data-testid="login-btn">
        Login
      </button>
      <button onClick={handleLogout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should show loading state initially when no token exists', () => {
      mockAuthService.getProfile.mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially should not be loading since there's no token
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    it('should show loading state when checking existing token', async () => {
      localStorage.setItem('access_token', mockAuthTokens.access)
      mockAuthService.getProfile.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('should restore user from token on mount', async () => {
      localStorage.setItem('access_token', mockAuthTokens.access)
      mockAuthService.getProfile.mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })

      expect(screen.getByTestId('user-email')).toHaveTextContent(mockUser.email)
    })

    it('should clear tokens if getProfile fails', async () => {
      localStorage.setItem('access_token', mockAuthTokens.access)
      localStorage.setItem('refresh_token', mockAuthTokens.refresh)
      mockAuthService.getProfile.mockRejectedValue(new Error('Token expired'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })
  })

  describe('Login', () => {
    it('should login user successfully', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockResolvedValue(mockLoginResponse)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })

      expect(mockAuthService.login).toHaveBeenCalledWith('test@test.com', 'password123')
      expect(localStorage.getItem('access_token')).toBe(mockAuthTokens.access)
      expect(localStorage.getItem('refresh_token')).toBe(mockAuthTokens.refresh)
      expect(screen.getByTestId('user-email')).toHaveTextContent(mockUser.email)
    })

    it('should store user data after login', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockResolvedValue(mockLoginResponse)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent(mockUser.role)
      })
    })

    it('should handle login error', async () => {
      const user = userEvent.setup()
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Click the login button - the error is handled internally
      await user.click(screen.getByTestId('login-btn'))

      // Wait for async operations to complete
      await waitFor(() => {
        // User should remain not authenticated after login error
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })

      // Verify the login was attempted
      expect(mockAuthService.login).toHaveBeenCalledWith('test@test.com', 'password123')
    })
  })

  describe('Logout', () => {
    it('should logout user successfully', async () => {
      const user = userEvent.setup()

      // First login
      localStorage.setItem('access_token', mockAuthTokens.access)
      localStorage.setItem('refresh_token', mockAuthTokens.refresh)
      mockAuthService.getProfile.mockResolvedValue(mockUser)
      mockAuthService.logout.mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })

      // Then logout
      await user.click(screen.getByTestId('logout-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })

    it('should clear local state even if server logout fails', async () => {
      const user = userEvent.setup()

      localStorage.setItem('access_token', mockAuthTokens.access)
      mockAuthService.getProfile.mockResolvedValue(mockUser)
      mockAuthService.logout.mockRejectedValue(new Error('Server error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      })

      await user.click(screen.getByTestId('logout-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
      })

      expect(localStorage.getItem('access_token')).toBeNull()
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })
})
