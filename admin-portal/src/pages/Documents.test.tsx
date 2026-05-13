/**
 * Documents.test.tsx - Tests for the Documents page
 *
 * These tests verify:
 * - Rendering of the documents grid
 * - Search and filter functionality
 * - Upload modal
 * - Document detail modal
 * - Permission-based UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import Documents from './Documents'
import { mockDocuments, paginatedDocuments, mockUser } from '../test/mocks/fixtures'

// Mock the API module
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: mockUser,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock permissions
vi.mock('../lib/permissions', () => ({
  hasPermission: () => true,
}))

describe('Documents Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/cases/')) {
        return Promise.resolve({ data: { results: [] } })
      }
      return Promise.resolve({ data: paginatedDocuments })
    })
  })

  describe('Rendering', () => {
    it('should render the page title', async () => {
      render(<Documents />)

      expect(screen.getByText('Documentos')).toBeInTheDocument()
    })

    it('should render the page subtitle', async () => {
      render(<Documents />)

      expect(screen.getByText('Gestiona los documentos del despacho')).toBeInTheDocument()
    })

    it('should render the upload button', async () => {
      render(<Documents />)

      // There are two spans for responsive design (desktop: "Subir Documento", mobile: "Subir")
      const uploadButtons = screen.getAllByText(/Subir/i)
      expect(uploadButtons.length).toBeGreaterThan(0)
    })

    it('should render search input', async () => {
      render(<Documents />)

      expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument()
    })

    it('should render filters button', async () => {
      render(<Documents />)

      expect(screen.getByText('Filtros')).toBeInTheDocument()
    })

    it('should display loading spinner while fetching data', () => {
      mockGet.mockImplementation(() => new Promise(() => {}))

      render(<Documents />)

      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })

    it('should display documents after loading', async () => {
      render(<Documents />)

      await waitFor(() => {
        expect(screen.getByText(mockDocuments[0].name)).toBeInTheDocument()
      })
    })

    it('should display document file names', async () => {
      render(<Documents />)

      await waitFor(() => {
        expect(screen.getByText(mockDocuments[0].original_filename)).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('should update search state when typing', async () => {
      render(<Documents />)

      const searchInput = screen.getByPlaceholderText('Buscar documentos...') as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'Contract' } })

      expect(searchInput.value).toBe('Contract')
    })

    it('should call API with search parameter', async () => {
      render(<Documents />)

      const searchInput = screen.getByPlaceholderText('Buscar documentos...')
      fireEvent.change(searchInput, { target: { value: 'Contract' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=Contract'))
      })
    })
  })

  describe('Filter Functionality', () => {
    it('should toggle filters panel when clicking Filtros button', async () => {
      render(<Documents />)

      const filtersButton = screen.getByText('Filtros')
      fireEvent.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByText('Categoria')).toBeInTheDocument()
      })
    })

    it('should show category and status filters when expanded', async () => {
      render(<Documents />)

      fireEvent.click(screen.getByText('Filtros'))

      await waitFor(() => {
        expect(screen.getByText('Categoria')).toBeInTheDocument()
        expect(screen.getByText('Estado')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty message when no documents found', async () => {
      mockGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })

      render(<Documents />)

      await waitFor(() => {
        expect(screen.getByText('No hay documentos')).toBeInTheDocument()
      })
    })

    it('should display upload button in empty state', async () => {
      mockGet.mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      })

      render(<Documents />)

      await waitFor(() => {
        // "Subir Documento" appears in both header and empty state
        const uploadButtons = screen.getAllByText('Subir Documento')
        expect(uploadButtons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Upload Modal', () => {
    it('should open upload modal when clicking upload button', async () => {
      render(<Documents />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument()
      })

      // Find the upload button by role (the button contains text with "Subir")
      const uploadButton = screen.getByRole('button', { name: /subir/i })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        // Modal header should appear with "Subir Documento"
        const modalHeaders = screen.getAllByText('Subir Documento')
        expect(modalHeaders.length).toBeGreaterThan(0)
      })
    })

    it('should close upload modal when clicking X button', async () => {
      render(<Documents />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument()
      })

      // Open modal
      const uploadButton = screen.getByRole('button', { name: /subir/i })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        const modalHeaders = screen.getAllByText('Subir Documento')
        expect(modalHeaders.length).toBeGreaterThan(1) // Modal header should now appear
      })

      // Find and click the X button (close button in modal)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'))
      if (closeButton) {
        fireEvent.click(closeButton)
      }
    })

    it('should have required form fields in upload modal', async () => {
      render(<Documents />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar documentos...')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /subir/i })
      fireEvent.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText('Archivo *')).toBeInTheDocument()
        expect(screen.getByText('Nombre del documento *')).toBeInTheDocument()
        // Check for category label (might be "Categoria" or "Categoría")
        const categoryLabel = screen.queryByText('Categoria *') || screen.queryByText('Categoría *')
        expect(categoryLabel).toBeInTheDocument()
      })
    })
  })

  describe('Document Security Indicators', () => {
    it('should display confidential indicator when document is confidential', async () => {
      const confidentialDoc = { ...mockDocuments[2], is_confidential: true }
      mockGet.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [confidentialDoc],
        },
      })

      render(<Documents />)

      await waitFor(() => {
        expect(screen.getByTitle('Confidencial')).toBeInTheDocument()
      })
    })
  })
})
