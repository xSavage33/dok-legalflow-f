/**
 * Layout.test.tsx - Tests for the Layout component
 *
 * These tests verify:
 * - Navigation items rendering based on permissions
 * - User profile display
 * - Logout functionality
 * - Mobile sidebar toggle
 * - Route access control
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import {
  mockUser,
  mockAssociateUser,
  mockClientUser,
} from '../test/mocks/fixtures'

// Mock the auth context
const mockLogout = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Helper to render Layout with router
function renderLayout(initialRoute = '/', user = mockUser) {
  mockUseAuth.mockReturnValue({
    user,
    logout: mockLogout,
  })

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div data-testid="dashboard">Dashboard Content</div>} />
          <Route path="cases" element={<div data-testid="cases">Cases Content</div>} />
          <Route path="documents" element={<div data-testid="documents">Documents Content</div>} />
          <Route path="invoices" element={<div data-testid="invoices">Invoices Content</div>} />
          <Route path="users" element={<div data-testid="users">Users Content</div>} />
          <Route path="analytics" element={<div data-testid="analytics">Analytics Content</div>} />
          <Route path="profile" element={<div data-testid="profile">Profile Content</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogout.mockResolvedValue(undefined)
  })

  describe('Navigation Items', () => {
    it('should display all navigation items for admin user', () => {
      renderLayout('/', mockUser) // admin user

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /casos/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /documentos/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /tiempo/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /facturacion/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /calendario/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /mensajes/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /equipo/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
    })

    it('should hide restricted items for associate user', () => {
      renderLayout('/', mockAssociateUser)

      // Associates should see basic navigation
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /casos/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /documentos/i })).toBeInTheDocument()

      // Associates should not see admin-only items
      expect(screen.queryByRole('link', { name: /equipo/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /analytics/i })).not.toBeInTheDocument()
    })

    it('should show minimal navigation for client user', () => {
      renderLayout('/', mockClientUser)

      // Clients should only see Dashboard (no permission required)
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()

      // Clients should not see internal pages
      expect(screen.queryByRole('link', { name: /casos/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /facturacion/i })).not.toBeInTheDocument()
    })
  })

  describe('User Profile Section', () => {
    it('should display user full name', () => {
      renderLayout('/', mockUser)

      expect(screen.getByText(mockUser.full_name!)).toBeInTheDocument()
    })

    it('should display user role', () => {
      renderLayout('/', mockUser)

      expect(screen.getByText(mockUser.role)).toBeInTheDocument()
    })

    it('should have link to profile page', () => {
      renderLayout('/', mockUser)

      const profileLink = screen.getByRole('link', { name: new RegExp(mockUser.full_name!, 'i') })
      expect(profileLink).toHaveAttribute('href', '/profile')
    })
  })

  describe('Logout Functionality', () => {
    it('should display logout button', () => {
      renderLayout('/', mockUser)

      expect(screen.getByRole('button', { name: /cerrar sesion/i })).toBeInTheDocument()
    })

    it('should call logout when clicking logout button', async () => {
      const user = userEvent.setup()
      renderLayout('/', mockUser)

      const logoutButton = screen.getByRole('button', { name: /cerrar sesion/i })
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('App Branding', () => {
    it('should display LegalFlow logo/name', () => {
      renderLayout('/', mockUser)

      // There are multiple instances of "LegalFlow" (sidebar and mobile header)
      const logos = screen.getAllByText('LegalFlow')
      expect(logos.length).toBeGreaterThan(0)
    })
  })

  describe('Active Navigation State', () => {
    it('should highlight active navigation item', () => {
      renderLayout('/cases', mockUser)

      const casesLink = screen.getByRole('link', { name: /casos/i })
      expect(casesLink).toHaveClass('bg-primary-800')
    })

    it('should not highlight inactive navigation items', () => {
      renderLayout('/cases', mockUser)

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).not.toHaveClass('bg-primary-800')
    })
  })

  describe('Content Rendering', () => {
    it('should render dashboard content on root route', () => {
      renderLayout('/', mockUser)

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should render cases content on /cases route', () => {
      renderLayout('/cases', mockUser)

      expect(screen.getByTestId('cases')).toBeInTheDocument()
    })

    it('should render documents content on /documents route', () => {
      renderLayout('/documents', mockUser)

      expect(screen.getByTestId('documents')).toBeInTheDocument()
    })
  })

  describe('Route Access Control', () => {
    it('should redirect to dashboard when user cannot access route', async () => {
      // Client tries to access /analytics (admin only)
      renderLayout('/analytics', mockClientUser)

      // Should be redirected to dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      })
    })

    it('should allow admin to access analytics', () => {
      renderLayout('/analytics', mockUser) // admin

      expect(screen.getByTestId('analytics')).toBeInTheDocument()
    })
  })

  describe('Mobile Sidebar', () => {
    it('should have mobile menu button', () => {
      renderLayout('/', mockUser)

      // The menu button is for mobile (has Menu icon)
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(btn => btn.querySelector('svg.lucide-menu'))
      expect(menuButton).toBeTruthy()
    })

    it('should toggle sidebar when clicking menu button', async () => {
      const user = userEvent.setup()
      renderLayout('/', mockUser)

      // Find the sidebar by its transform class
      const sidebar = document.querySelector('.fixed.inset-y-0.left-0')
      expect(sidebar).toHaveClass('-translate-x-full') // Initially hidden on mobile

      // Click menu button to open
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(btn => btn.querySelector('svg.lucide-menu'))

      if (menuButton) {
        await user.click(menuButton)

        // After clicking, sidebar should be visible
        await waitFor(() => {
          expect(sidebar).toHaveClass('translate-x-0')
        })
      }
    })

    it('should close sidebar when clicking close button', async () => {
      const user = userEvent.setup()
      renderLayout('/', mockUser)

      // Open sidebar first
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(btn => btn.querySelector('svg.lucide-menu'))

      if (menuButton) {
        await user.click(menuButton)

        // Find close button (X icon)
        const closeButtons = screen.getAllByRole('button')
        const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'))

        if (closeButton) {
          await user.click(closeButton)

          // Sidebar should be hidden again
          const sidebar = document.querySelector('.fixed.inset-y-0.left-0')
          await waitFor(() => {
            expect(sidebar).toHaveClass('-translate-x-full')
          })
        }
      }
    })

    it('should close sidebar when clicking a navigation link', async () => {
      const user = userEvent.setup()
      renderLayout('/', mockUser)

      // Open sidebar
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(btn => btn.querySelector('svg.lucide-menu'))

      if (menuButton) {
        await user.click(menuButton)

        // Click a nav link
        const casesLinks = screen.getAllByRole('link', { name: /casos/i })
        await user.click(casesLinks[0])

        // Sidebar should close
        const sidebar = document.querySelector('.fixed.inset-y-0.left-0')
        await waitFor(() => {
          expect(sidebar).toHaveClass('-translate-x-full')
        })
      }
    })
  })
})
