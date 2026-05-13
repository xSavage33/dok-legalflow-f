/**
 * Test Fixtures - Mock data for testing components
 *
 * This file provides consistent test data for all test files.
 * Use these fixtures to ensure predictable test behavior.
 */

import type { User, Case, Document, Invoice, PaginatedResponse } from '../../types'

// ==================== USER FIXTURES ====================

export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'admin@legalflow.com',
  first_name: 'Admin',
  last_name: 'User',
  full_name: 'Admin User',
  role: 'admin',
  phone: '+1234567890',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

export const mockPartnerUser: User = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  email: 'partner@legalflow.com',
  first_name: 'Partner',
  last_name: 'Attorney',
  full_name: 'Partner Attorney',
  role: 'partner',
  is_active: true,
}

export const mockAssociateUser: User = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  email: 'associate@legalflow.com',
  first_name: 'Associate',
  last_name: 'Lawyer',
  full_name: 'Associate Lawyer',
  role: 'associate',
  is_active: true,
}

export const mockClientUser: User = {
  id: '423e4567-e89b-12d3-a456-426614174003',
  email: 'client@example.com',
  first_name: 'John',
  last_name: 'Client',
  full_name: 'John Client',
  role: 'client',
  is_active: true,
}

// ==================== CASE FIXTURES ====================

export const mockCase: Case = {
  id: 'case-001',
  case_number: '2024-0001',
  title: 'Smith vs. Jones - Contract Dispute',
  description: 'Commercial contract dispute over service delivery',
  case_type: 'civil',
  status: 'active',
  priority: 'high',
  client_id: mockClientUser.id,
  client_name: mockClientUser.full_name,
  client_email: mockClientUser.email,
  lead_attorney_id: mockPartnerUser.id,
  lead_attorney_name: mockPartnerUser.full_name,
  opened_date: '2024-01-15',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-20T15:30:00Z',
}

export const mockCases: Case[] = [
  mockCase,
  {
    id: 'case-002',
    case_number: '2024-0002',
    title: 'Johnson Family Trust',
    description: 'Estate planning and trust administration',
    case_type: 'estate',
    status: 'pending',
    priority: 'medium',
    client_id: '523e4567-e89b-12d3-a456-426614174004',
    client_name: 'Mary Johnson',
    opened_date: '2024-02-01',
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2024-02-10T11:00:00Z',
  },
  {
    id: 'case-003',
    case_number: '2024-0003',
    title: 'ABC Corp Merger',
    description: 'Corporate merger documentation and compliance',
    case_type: 'corporate',
    status: 'on_hold',
    priority: 'low',
    client_id: '623e4567-e89b-12d3-a456-426614174005',
    client_name: 'ABC Corporation',
    opened_date: '2024-02-15',
    created_at: '2024-02-15T14:00:00Z',
    updated_at: '2024-02-20T16:00:00Z',
  },
  {
    id: 'case-004',
    case_number: '2023-0150',
    title: 'Rodriguez Divorce Settlement',
    description: 'Family law divorce case',
    case_type: 'family',
    status: 'closed',
    priority: 'medium',
    client_id: '723e4567-e89b-12d3-a456-426614174006',
    client_name: 'Maria Rodriguez',
    opened_date: '2023-06-01',
    closed_date: '2024-01-10',
    created_at: '2023-06-01T08:00:00Z',
    updated_at: '2024-01-10T17:00:00Z',
  },
]

// ==================== DOCUMENT FIXTURES ====================

export const mockDocument: Document = {
  id: 'doc-001',
  name: 'Contract Agreement v1.pdf',
  description: 'Initial contract agreement between parties',
  category: 'contract',
  category_display: 'Contract',
  status: 'final',
  status_display: 'Final',
  original_filename: 'Contract_Agreement_v1.pdf',
  file_size: 245760,
  mime_type: 'application/pdf',
  case_id: mockCase.id,
  case_number: mockCase.case_number,
  is_confidential: false,
  is_privileged: false,
  current_version: 1,
  created_by_id: mockPartnerUser.id,
  created_by_name: mockPartnerUser.full_name,
  created_at: '2024-01-16T10:30:00Z',
  updated_at: '2024-01-16T10:30:00Z',
}

export const mockDocuments: Document[] = [
  mockDocument,
  {
    id: 'doc-002',
    name: 'Court Filing - Motion to Dismiss',
    description: 'Motion to dismiss filed with the court',
    category: 'pleading',
    category_display: 'Pleading',
    status: 'final',
    status_display: 'Final',
    original_filename: 'Motion_to_Dismiss.pdf',
    file_size: 512000,
    mime_type: 'application/pdf',
    case_id: mockCase.id,
    case_number: mockCase.case_number,
    is_confidential: false,
    is_privileged: true,
    current_version: 2,
    created_by_id: mockAssociateUser.id,
    created_by_name: mockAssociateUser.full_name,
    created_at: '2024-01-18T14:00:00Z',
    updated_at: '2024-01-19T09:00:00Z',
  },
  {
    id: 'doc-003',
    name: 'Client Correspondence',
    description: 'Email correspondence with client',
    category: 'correspondence',
    category_display: 'Correspondence',
    status: 'draft',
    status_display: 'Draft',
    original_filename: 'email_thread.eml',
    file_size: 15360,
    mime_type: 'message/rfc822',
    case_id: mockCase.id,
    case_number: mockCase.case_number,
    is_confidential: true,
    is_privileged: false,
    current_version: 1,
    created_by_id: mockUser.id,
    created_by_name: mockUser.full_name,
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-01-20T11:00:00Z',
  },
]

// ==================== INVOICE FIXTURES ====================

export const mockInvoice: Invoice = {
  id: 'inv-001',
  invoice_number: 'INV-2024-0001',
  client_name: mockClientUser.full_name,
  case_number: mockCase.case_number,
  status: 'sent',
  total_amount: 5000.00,
  balance_due: 5000.00,
  issue_date: '2024-01-25',
  due_date: '2024-02-25',
}

export const mockInvoices: Invoice[] = [
  mockInvoice,
  {
    id: 'inv-002',
    invoice_number: 'INV-2024-0002',
    client_name: 'Mary Johnson',
    case_number: '2024-0002',
    status: 'paid',
    total_amount: 3500.00,
    balance_due: 0,
    issue_date: '2024-02-01',
    due_date: '2024-03-01',
  },
  {
    id: 'inv-003',
    invoice_number: 'INV-2024-0003',
    client_name: 'ABC Corporation',
    case_number: '2024-0003',
    status: 'overdue',
    total_amount: 12000.00,
    balance_due: 12000.00,
    issue_date: '2024-01-01',
    due_date: '2024-01-31',
  },
  {
    id: 'inv-004',
    invoice_number: 'INV-2024-0004',
    client_name: mockClientUser.full_name,
    status: 'draft',
    total_amount: 2500.00,
    balance_due: 2500.00,
    issue_date: '2024-02-20',
    due_date: '2024-03-20',
  },
]

// ==================== PAGINATED RESPONSE HELPERS ====================

export function createPaginatedResponse<T>(items: T[]): PaginatedResponse<T> {
  return {
    count: items.length,
    next: null,
    previous: null,
    results: items,
  }
}

export const paginatedCases = createPaginatedResponse(mockCases)
export const paginatedDocuments = createPaginatedResponse(mockDocuments)
export const paginatedInvoices = createPaginatedResponse(mockInvoices)

// ==================== DASHBOARD ANALYTICS FIXTURES ====================

export const mockDashboardData = {
  cases: {
    total: 25,
    active: 12,
    pending: 5,
    closed: 8,
  },
  billing: {
    total_invoiced: 150000,
    total_paid: 95000,
    outstanding: 55000,
    overdue: 12000,
  },
  time_tracking: {
    total_hours: 320,
    billable_hours: 280,
    total_amount: 42000,
  },
  deadlines: {
    upcoming_count: 7,
  },
}

// ==================== DEADLINE FIXTURES ====================

export const mockDeadline = {
  id: 'deadline-001',
  title: 'Presentar alegatos finales',
  case_id: 'case-001',
  case_number: '2024-0001',
  due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  priority: 'high',
  is_overdue: false,
  days_remaining: 2,
}

export const mockDeadlines = [
  mockDeadline,
  {
    id: 'deadline-002',
    title: 'Audiencia preliminar',
    case_id: 'case-002',
    case_number: '2024-0002',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    priority: 'medium',
    is_overdue: false,
    days_remaining: 5,
  },
  {
    id: 'deadline-003',
    title: 'Entrega de documentos',
    case_id: 'case-001',
    case_number: '2024-0001',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue)
    priority: 'critical',
    is_overdue: true,
    days_remaining: -1,
  },
]

export const paginatedDeadlines = createPaginatedResponse(mockDeadlines)

// ==================== AUTH FIXTURES ====================

export const mockAuthTokens = {
  access: 'mock-access-token-12345',
  refresh: 'mock-refresh-token-67890',
}

export const mockLoginResponse = {
  message: 'Login exitoso.',
  user: mockUser,
  tokens: mockAuthTokens,
}
