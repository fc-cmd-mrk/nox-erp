import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is set by auth store
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || 'Bir hata oluştu'
    
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state
      localStorage.removeItem('nox-auth')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      toast.error('Bu işlem için yetkiniz yok')
    } else if (error.response?.status >= 500) {
      toast.error('Sunucu hatası. Lütfen tekrar deneyin.')
    }
    
    return Promise.reject(error)
  }
)

export default api

// API Functions
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

export const companiesAPI = {
  list: () => api.get('/companies'),
  get: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`)
}

export const contactsAPI = {
  list: (params) => api.get('/contacts', { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  suppliers: () => api.get('/contacts/suppliers'),
  customers: () => api.get('/contacts/customers')
}

export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  categories: () => api.get('/products/categories')
}

export const transactionsAPI = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  sales: () => api.get('/transactions/sales'),
  purchases: () => api.get('/transactions/purchases')
}

export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  get: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`)
}

export const accountsAPI = {
  list: (params) => api.get('/accounts', { params }),
  get: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  transfer: (data) => api.post('/accounts/transfer', null, { params: data })
}

export const usersAPI = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  roles: () => api.get('/users/roles/list'),
  permissions: () => api.get('/users/permissions/list')
}

export const reportsAPI = {
  dashboard: (params) => api.get('/reports/dashboard', { params }),
  profitAnalysis: (params) => api.get('/reports/profit-analysis', { params }),
  supplierAnalysis: (params) => api.get('/reports/supplier-analysis', { params }),
  customerAnalysis: (params) => api.get('/reports/customer-analysis', { params }),
  paymentChannels: (params) => api.get('/reports/payment-channels', { params }),
  cashFlow: (params) => api.get('/reports/cash-flow', { params }),
  contactBalances: (params) => api.get('/reports/contact-balances', { params })
}

export const settingsAPI = {
  list: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  currencies: () => api.get('/settings/currencies/list'),
  exchangeRates: () => api.get('/settings/exchange-rates/list'),
  auditLogs: (params) => api.get('/settings/audit-logs', { params })
}

export const dataAPI = {
  importContacts: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/data/import/contacts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  importProducts: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/data/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  importTransactions: (file, type, companyId) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/data/import/transactions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { transaction_type: type, company_id: companyId }
    })
  },
  importPayments: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/data/import/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  export: (model, format) => api.get(`/data/export/${model}`, { 
    params: { format },
    responseType: 'blob'
  }),
  clearAll: () => api.delete('/data/clear-all', { params: { confirm: 'CONFIRM_DELETE_ALL' }})
}

