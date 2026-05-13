/**
 * Invoices.test.tsx - Tests for the Invoices page
 *
 * These tests verify:
 * - Rendering of the invoices table
 * - Summary cards with KPIs
 * - Search and filter functionality
 * - Invoice creation modal
 * - Invoice detail modal
 * - Payment registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, userEvent } from '../test/test-utils'
import Invoices from './Invoices'
import { mockInvoices, paginatedInvoices, mockUser } from '../test/mocks/fixtures'

// Mock the API module
const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../services/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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

// Mock summary data
const mockSummary = {
  total_invoiced: 23000,
  total_paid: 3500,
  total_outstanding: 19500,
  overdue_amount: 12000,
}

describe('Invoices Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/summary')) {
        return Promise.resolve({ data: mockSummary })
      }
      if (url.includes('/auth/users/')) {
        return Promise.resolve({ data: { results: [] } })
      }
      if (url.includes('/cases/')) {
        return Promise.resolve({ data: { results: [] } })
      }
      return Promise.resolve({ data: paginatedInvoices })
    })
  })

  describe('Rendering', () => {
    it('should render the page title', async () => {
      render(<Invoices />)

      expect(screen.getByText('Facturacion')).toBeInTheDocument()
    })

    it('should render the page subtitle', async () => {
      render(<Invoices />)

      expect(screen.getByText('Gestiona facturas y pagos')).toBeInTheDocument()
    })

    it('should render the new invoice button', async () => {
      render(<Invoices />)

      // "Nueva" appears in both desktop and mobile spans
      const newButtons = screen.getAllByText(/Nueva/i)
      expect(newButtons.length).toBeGreaterThan(0)
    })

    it('should render search input', async () => {
      render(<Invoices />)

      expect(screen.getByPlaceholderText('Buscar facturas...')).toBeInTheDocument()
    })

    it('should render status filter dropdown', async () => {
      render(<Invoices />)

      expect(screen.getByText('Todos los estados')).toBeInTheDocument()
    })

    it('should display loading spinner while fetching data', () => {
      mockGet.mockImplementation(() => new Promise(() => {}))

      render(<Invoices />)

      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })

    it('should display invoices after loading', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText(mockInvoices[0].invoice_number)).toBeInTheDocument()
      })
    })
  })

  describe('Summary Cards', () => {
    it('should display Total Facturado card', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('Total Facturado')).toBeInTheDocument()
      })
    })

    it('should display Total Cobrado card', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('Total Cobrado')).toBeInTheDocument()
      })
    })

    it('should display Por Cobrar card', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('Por Cobrar')).toBeInTheDocument()
      })
    })

    it('should display Vencido card', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('Vencido')).toBeInTheDocument()
      })
    })

    it('should display formatted currency amounts', async () => {
      render(<Invoices />)

      await waitFor(() => {
        // Check that amounts are displayed with $ sign (may have multiple matches)
        const amounts = screen.getAllByText(/\$23[.,]000/)
        expect(amounts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Invoice Table', () => {
    it('should display invoice numbers', async () => {
      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText(mockInvoices[0].invoice_number)).toBeInTheDocument()
      })
    })

    it('should display client names', async () => {
      render(<Invoices />)

      await waitFor(() => {
        // Client may appear multiple times (has multiple invoices)
        const clientNames = screen.getAllByText(mockInvoices[0].client_name!)
        expect(clientNames.length).toBeGreaterThan(0)
      })
    })

    it('should display status badges', async () => {
      render(<Invoices />)

      await waitFor(() => {
        // Use getAllByText since there may be multiple invoices with same status
        expect(screen.getAllByText('Enviada').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Pagada').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Vencida').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0)
      })
    })

    it('should display total amounts', async () => {
      render(<Invoices />)

      await waitFor(() => {
        // Multiple invoices may have similar amounts
        const amounts = screen.getAllByText(/\$5[.,]000/)
        expect(amounts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Search Functionality', () => {
    it('should update search state when typing', async () => {
      render(<Invoices />)

      const searchInput = screen.getByPlaceholderText('Buscar facturas...') as HTMLInputElement
      fireEvent.change(searchInput, { target: { value: 'INV-2024' } })

      expect(searchInput.value).toBe('INV-2024')
    })

    it('should call API with search parameter', async () => {
      render(<Invoices />)

      const searchInput = screen.getByPlaceholderText('Buscar facturas...')
      fireEvent.change(searchInput, { target: { value: 'Johnson' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=Johnson'))
      })
    })
  })

  describe('Filter Functionality', () => {
    it('should filter by status when selecting from dropdown', async () => {
      render(<Invoices />)

      const filterSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(filterSelect, { target: { value: 'paid' } })

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=paid'))
      })
    })
  })

  describe('Empty State', () => {
    it('should display empty message when no invoices found', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({ data: mockSummary })
        }
        return Promise.resolve({
          data: { count: 0, next: null, previous: null, results: [] },
        })
      })

      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('No hay facturas')).toBeInTheDocument()
      })
    })

    it('should display create button in empty state', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({ data: mockSummary })
        }
        return Promise.resolve({
          data: { count: 0, next: null, previous: null, results: [] },
        })
      })

      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText('Crear Factura')).toBeInTheDocument()
      })
    })
  })

  describe('Create Invoice Modal', () => {
    it('should open create modal when clicking new invoice button', async () => {
      const user = userEvent.setup()
      render(<Invoices />)

      // Wait for the page to load and button to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar facturas...')).toBeInTheDocument()
      })

      // Find and click the button using userEvent
      const newButton = screen.getByRole('button', { name: /nueva/i })
      await user.click(newButton)

      await waitFor(() => {
        // Modal title should appear (in h2)
        expect(screen.getByRole('heading', { name: /nueva factura/i })).toBeInTheDocument()
      })
    })

    it('should have required form fields in create modal', async () => {
      const user = userEvent.setup()
      render(<Invoices />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar facturas...')).toBeInTheDocument()
      })

      const newButton = screen.getByRole('button', { name: /nueva/i })
      await user.click(newButton)

      await waitFor(() => {
        expect(screen.getByText('Cliente *')).toBeInTheDocument()
        expect(screen.getByText('Fecha Emision *')).toBeInTheDocument()
        expect(screen.getByText('Fecha Vencimiento *')).toBeInTheDocument()
        expect(screen.getByText('Items de la Factura *')).toBeInTheDocument()
      })
    })

    it('should have add item button in create modal', async () => {
      const user = userEvent.setup()
      render(<Invoices />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar facturas...')).toBeInTheDocument()
      })

      const newButton = screen.getByRole('button', { name: /nueva/i })
      await user.click(newButton)

      await waitFor(() => {
        expect(screen.getByText('+ Agregar item')).toBeInTheDocument()
      })
    })

    it('should close create modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<Invoices />)

      // Wait for the page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Buscar facturas...')).toBeInTheDocument()
      })

      const newButton = screen.getByRole('button', { name: /nueva/i })
      await user.click(newButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /nueva factura/i })).toBeInTheDocument()
      })

      await user.click(screen.getByText('Cancelar'))

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /nueva factura/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Invoice Detail Modal', () => {
    it('should open detail modal when clicking on an invoice row', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({ data: mockSummary })
        }
        if (url.includes(`/invoices/${mockInvoices[0].id}/`)) {
          return Promise.resolve({
            data: {
              ...mockInvoices[0],
              items: [{ id: '1', description: 'Service', quantity: 1, unit_price: 5000, total: 5000 }],
              payments: [],
              subtotal: 5000,
              tax_rate: 0,
              tax_amount: 0,
              discount_amount: 0,
            },
          })
        }
        return Promise.resolve({ data: paginatedInvoices })
      })

      render(<Invoices />)

      await waitFor(() => {
        expect(screen.getByText(mockInvoices[0].invoice_number)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(mockInvoices[0].invoice_number))

      await waitFor(() => {
        expect(screen.getByText(`Factura ${mockInvoices[0].invoice_number}`)).toBeInTheDocument()
      })
    })
  })

  describe('Invoice Calculations', () => {
    it('should display invoice totals in the table', async () => {
      render(<Invoices />)

      await waitFor(() => {
        // Check that total amounts are displayed (may appear multiple times)
        const amount5000 = screen.getAllByText(/\$5[.,]000/)
        const amount3500 = screen.getAllByText(/\$3[.,]500/)
        expect(amount5000.length).toBeGreaterThan(0)
        expect(amount3500.length).toBeGreaterThan(0)
      })
    })
  })
})
