/**
 * Dashboard.test.tsx - Tests for the Dashboard page
 *
 * These tests verify:
 * - User greeting display
 * - Statistics cards rendering
 * - Recent cases list
 * - Upcoming deadlines list
 * - Empty states when no data
 * - Navigation links
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './Dashboard'
import {
  mockUser,
  mockCases,
  mockDeadlines,
  mockDashboardData,
  createPaginatedResponse,
} from '../test/mocks/fixtures'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '../services/api'
const mockApi = vi.mocked(api)

// Helper to render with providers
function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser })
  })

  describe('User Greeting', () => {
    it('should display greeting with user first name', async () => {
      mockApi.get.mockResolvedValue({ data: mockDashboardData })

      renderDashboard()

      expect(screen.getByText(`Hola, ${mockUser.first_name}`)).toBeInTheDocument()
    })

    it('should display current date', async () => {
      mockApi.get.mockResolvedValue({ data: mockDashboardData })

      renderDashboard()

      // The date is displayed in Spanish format
      const dateElement = screen.getByText(/\d{1,2} de \w+ de \d{4}|lunes|martes|miércoles|jueves|viernes|sábado|domingo/i)
      expect(dateElement).toBeInTheDocument()
    })
  })

  describe('Statistics Cards', () => {
    beforeEach(() => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard/')) {
          return Promise.resolve({ data: mockDashboardData })
        }
        if (url.includes('/cases/')) {
          return Promise.resolve({ data: createPaginatedResponse(mockCases) })
        }
        if (url.includes('/deadlines/')) {
          return Promise.resolve({ data: createPaginatedResponse(mockDeadlines) })
        }
        return Promise.resolve({ data: {} })
      })
    })

    it('should display active cases count', async () => {
      renderDashboard()

      // Wait for data to load
      const casesValue = await screen.findByText('12')
      expect(casesValue).toBeInTheDocument()
      expect(screen.getByText('Casos Activos')).toBeInTheDocument()
    })

    it('should display billable hours', async () => {
      renderDashboard()

      const hoursValue = await screen.findByText('280h')
      expect(hoursValue).toBeInTheDocument()
      expect(screen.getByText('Horas Este Mes')).toBeInTheDocument()
    })

    it('should display outstanding billing amount', async () => {
      renderDashboard()

      // The amount is formatted as currency
      const amountValue = await screen.findByText(/\$55[.,]000/)
      expect(amountValue).toBeInTheDocument()
      expect(screen.getByText('Por Cobrar')).toBeInTheDocument()
    })

    it('should display upcoming deadlines count', async () => {
      renderDashboard()

      const deadlinesValue = await screen.findByText('7')
      expect(deadlinesValue).toBeInTheDocument()
      expect(screen.getByText('Plazos Proximos')).toBeInTheDocument()
    })

    it('should have navigation links on stat cards', async () => {
      renderDashboard()

      await screen.findByText('12') // Wait for data

      // Check that stat cards are links
      const casesLink = screen.getByRole('link', { name: /casos activos/i })
      expect(casesLink).toHaveAttribute('href', '/cases?status=active')

      const timeLink = screen.getByRole('link', { name: /horas este mes/i })
      expect(timeLink).toHaveAttribute('href', '/time')
    })
  })

  describe('Recent Cases', () => {
    beforeEach(() => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard/')) {
          return Promise.resolve({ data: mockDashboardData })
        }
        if (url.includes('/cases/')) {
          return Promise.resolve({ data: createPaginatedResponse(mockCases) })
        }
        if (url.includes('/deadlines/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        return Promise.resolve({ data: {} })
      })
    })

    it('should display recent cases section', async () => {
      renderDashboard()

      expect(await screen.findByText('Casos Recientes')).toBeInTheDocument()
    })

    it('should display case number and title', async () => {
      renderDashboard()

      expect(await screen.findByText('2024-0001')).toBeInTheDocument()
      expect(screen.getByText('Smith vs. Jones - Contract Dispute')).toBeInTheDocument()
    })

    it('should display case status badges', async () => {
      renderDashboard()

      expect(await screen.findByText('Activo')).toBeInTheDocument()
      expect(screen.getByText('Pendiente')).toBeInTheDocument()
    })

    it('should display client name', async () => {
      renderDashboard()

      expect(await screen.findByText('John Client')).toBeInTheDocument()
    })

    it('should have "Ver todos" link', async () => {
      renderDashboard()

      await screen.findByText('Casos Recientes')

      const viewAllLink = screen.getByRole('link', { name: /ver todos/i })
      expect(viewAllLink).toHaveAttribute('href', '/cases')
    })
  })

  describe('Recent Cases - Empty State', () => {
    beforeEach(() => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard/')) {
          return Promise.resolve({ data: mockDashboardData })
        }
        if (url.includes('/cases/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        if (url.includes('/deadlines/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        return Promise.resolve({ data: {} })
      })
    })

    it('should display empty state when no cases', async () => {
      renderDashboard()

      expect(await screen.findByText('No hay casos')).toBeInTheDocument()
      expect(screen.getByText('Crea tu primer caso para comenzar')).toBeInTheDocument()
    })

    it('should have create case button in empty state', async () => {
      renderDashboard()

      await screen.findByText('No hay casos')

      const createButton = screen.getByRole('link', { name: /crear caso/i })
      expect(createButton).toHaveAttribute('href', '/cases/new')
    })
  })

  describe('Upcoming Deadlines', () => {
    beforeEach(() => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard/')) {
          return Promise.resolve({ data: mockDashboardData })
        }
        if (url.includes('/cases/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        if (url.includes('/deadlines/')) {
          return Promise.resolve({ data: createPaginatedResponse(mockDeadlines) })
        }
        return Promise.resolve({ data: {} })
      })
    })

    it('should display deadlines section', async () => {
      renderDashboard()

      expect(await screen.findByText('Proximos Plazos')).toBeInTheDocument()
    })

    it('should display deadline titles', async () => {
      renderDashboard()

      expect(await screen.findByText('Presentar alegatos finales')).toBeInTheDocument()
      expect(screen.getByText('Audiencia preliminar')).toBeInTheDocument()
    })

    it('should display overdue indicator', async () => {
      renderDashboard()

      expect(await screen.findByText('Vencido')).toBeInTheDocument()
    })

    it('should have "Ver calendario" link', async () => {
      renderDashboard()

      await screen.findByText('Proximos Plazos')

      const calendarLink = screen.getByRole('link', { name: /ver calendario/i })
      expect(calendarLink).toHaveAttribute('href', '/calendar')
    })
  })

  describe('Upcoming Deadlines - Empty State', () => {
    beforeEach(() => {
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/analytics/dashboard/')) {
          return Promise.resolve({ data: mockDashboardData })
        }
        if (url.includes('/cases/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        if (url.includes('/deadlines/')) {
          return Promise.resolve({ data: createPaginatedResponse([]) })
        }
        return Promise.resolve({ data: {} })
      })
    })

    it('should display empty state when no deadlines', async () => {
      renderDashboard()

      expect(await screen.findByText('Sin plazos proximos')).toBeInTheDocument()
      expect(screen.getByText('No tienes plazos en los proximos 7 dias')).toBeInTheDocument()
    })
  })

  describe('New Case Button', () => {
    it('should have "Nuevo Caso" button in header', async () => {
      mockApi.get.mockResolvedValue({ data: mockDashboardData })

      renderDashboard()

      // Find links that go to /cases/new
      const newCaseLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('href') === '/cases/new'
      )
      expect(newCaseLinks.length).toBeGreaterThan(0)
    })
  })
})
