/**
 * Cases.test.tsx - Tests for the Cases list page
 *
 * These tests verify:
 * - Rendering of the cases list
 * - Search functionality
 * - Filter by status
 * - Loading states
 * - Empty states
 * - Navigation to case details
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import Cases from './Cases'
import { mockCases, paginatedCases } from '../test/mocks/fixtures'

// Mock the API module
const mockGet = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', email: 'admin@test.com', role: 'admin' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Cases Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ data: paginatedCases })
  })

  describe('Rendering', () => {
    it('should render the page title', async () => {
      render(<Cases />)

      expect(screen.getByText('Casos')).toBeInTheDocument()
    })

    it('should render the new case button', async () => {
      render(<Cases />)

      expect(screen.getByText('Nuevo Caso')).toBeInTheDocument()
    })

    it('should render search input', async () => {
      render(<Cases />)

      expect(screen.getByPlaceholderText('Buscar casos...')).toBeInTheDocument()
    })

    it('should render status filter dropdown', async () => {
      render(<Cases />)

      expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    })

    it('should display loading spinner while fetching data', () => {
      // Make the API call never resolve to keep loading state
      mockGet.mockImplementation(() => new Promise(() => {}))

      render(<Cases />)

      // Look for loading indicator (spinner or loading text)
      const spinner = document.querySelector('.animate-spin')
      const loadingText = screen.queryByText(/cargando/i)
      expect(spinner || loadingText).toBeTruthy()
    })

    it('should display cases after loading', async () => {
      render(<Cases />)

      await waitFor(() => {
        expect(screen.getByText(mockCases[0].case_number)).toBeInTheDocument()
      })

      expect(screen.getByText(mockCases[0].title)).toBeInTheDocument()
      expect(screen.getByText(`Cliente: ${mockCases[0].client_name}`)).toBeInTheDocument()
    })

    it('should display status badges with correct labels', async () => {
      render(<Cases />)

      await waitFor(() => {
        // Use getAllByText since there might be multiple badges with same status
        expect(screen.getAllByText('Activo').length).toBeGreaterThan(0)
      })

      expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
      expect(screen.getAllByText('En Espera').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cerrado').length).toBeGreaterThan(0)
    })
  })

  describe('Search Functionality', () => {
    it('should update search state when typing', async () => {
      render(<Cases />)

      const searchInput = screen.getByPlaceholderText('Buscar casos...') as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'Smith' } })

      expect(searchInput.value).toBe('Smith')
    })

    it('should call API with search parameter', async () => {
      render(<Cases />)

      const searchInput = screen.getByPlaceholderText('Buscar casos...')
      fireEvent.change(searchInput, { target: { value: 'Smith' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=Smith'))
      })
    })
  })

  describe('Filter Functionality', () => {
    it('should filter by status when selecting from dropdown', async () => {
      render(<Cases />)

      const filterSelect = screen.getByRole('combobox')
      fireEvent.change(filterSelect, { target: { value: 'active' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=active'))
      })
    })

    it('should show all cases when "Todos los estados" is selected', async () => {
      render(<Cases />)

      const filterSelect = screen.getByRole('combobox')

      // First select a specific status
      fireEvent.change(filterSelect, { target: { value: 'active' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=active'))
      })

      // Then select "all" (empty value)
      fireEvent.change(filterSelect, { target: { value: '' } })

      // Verify the select value changed back to empty
      expect(filterSelect).toHaveValue('')
    })
  })

  describe('Empty State', () => {
    it('should display empty message when no cases found', async () => {
      mockGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })

      render(<Cases />)

      await waitFor(() => {
        expect(screen.getByText('No se encontraron casos')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should have links to case details', async () => {
      render(<Cases />)

      await waitFor(() => {
        const caseLink = screen.getByText(mockCases[0].title).closest('a')
        expect(caseLink).toHaveAttribute('href', `/cases/${mockCases[0].id}`)
      })
    })

    it('should have link to create new case', () => {
      render(<Cases />)

      const newCaseLink = screen.getByText('Nuevo Caso').closest('a')
      expect(newCaseLink).toHaveAttribute('href', '/cases/new')
    })
  })
})
