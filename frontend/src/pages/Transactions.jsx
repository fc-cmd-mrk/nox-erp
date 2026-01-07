import { useState, useEffect } from 'react'
import { transactionsAPI, contactsAPI, productsAPI, companiesAPI, accountsAPI, settingsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlineShoppingCart, 
  HiOutlineTruck,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineReply,
  HiOutlineBan,
  HiOutlineTrash
} from 'react-icons/hi'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(null)
  const [contacts, setContacts] = useState([])
  const [products, setProducts] = useState([])
  const [companies, setCompanies] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [exchangeRates, setExchangeRates] = useState({})
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    transaction_type: 'sale',
    company_id: '',
    contact_id: '',
    currency: 'TRY',
    exchange_rate: 1,
    transaction_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [{ product_id: '', warehouse_id: '', quantity: 1, unit_price: 0, cost_price: 0 }]
  })
  
  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = {}
      if (typeFilter) params.transaction_type = typeFilter
      const response = await transactionsAPI.list(params)
      setTransactions(response.data)
    } catch (error) {
      toast.error('İşlemler yüklenemedi')
    }
    setLoading(false)
  }
  
  const fetchDropdownData = async () => {
    try {
      const [contactsRes, productsRes, companiesRes, currenciesRes, ratesRes] = await Promise.all([
        contactsAPI.list({}),
        productsAPI.list({}),
        companiesAPI.list(),
        settingsAPI.currencies(),
        settingsAPI.getTCMBRates()
      ])
      setContacts(contactsRes.data)
      setProducts(productsRes.data)
      setCompanies(companiesRes.data)
      setCurrencies(currenciesRes.data)
      setExchangeRates(ratesRes.data)
      
      // Set default company
      if (companiesRes.data.length > 0 && !createForm.company_id) {
        setCreateForm(prev => ({ ...prev, company_id: companiesRes.data[0].id }))
      }
    } catch (error) {
      console.error('Dropdown data fetch error:', error)
    }
  }
  
  useEffect(() => {
    fetchTransactions()
    fetchDropdownData()
  }, [typeFilter])
  
  // Update exchange rate when currency changes
  useEffect(() => {
    if (createForm.currency === 'TRY') {
      setCreateForm(prev => ({ ...prev, exchange_rate: 1 }))
    } else if (exchangeRates[createForm.currency]) {
      setCreateForm(prev => ({ 
        ...prev, 
        exchange_rate: exchangeRates[createForm.currency].rate || exchangeRates[createForm.currency].buying || 1
      }))
    }
  }, [createForm.currency, exchangeRates])
  
  const getTypeBadge = (type, status) => {
    if (status === 'cancelled') {
      return <span className="badge-danger">İptal</span>
    }
    switch (type) {
      case 'sale': return <span className="badge-success">Satış</span>
      case 'purchase': return <span className="badge-warning">Alım</span>
      case 'sale_return': return <span className="badge-danger">İade (Satış)</span>
      case 'purchase_return': return <span className="badge-info">İade (Alım)</span>
      default: return <span className="badge-info">{type}</span>
    }
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  // Create transaction
  const handleCreate = async (e) => {
    e.preventDefault()
    
    if (!createForm.company_id) {
      toast.error('Şirket seçin')
      return
    }
    
    if (createForm.items.length === 0 || !createForm.items.some(i => i.product_id && i.quantity > 0)) {
      toast.error('En az bir ürün ekleyin')
      return
    }
    
    try {
      const data = {
        ...createForm,
        company_id: parseInt(createForm.company_id),
        contact_id: createForm.contact_id ? parseInt(createForm.contact_id) : null,
        transaction_date: createForm.transaction_date || new Date().toISOString().split('T')[0],
        items: createForm.items.filter(i => i.product_id).map(i => ({
          product_id: parseInt(i.product_id),
          warehouse_id: i.warehouse_id ? parseInt(i.warehouse_id) : null,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          cost_price: parseFloat(i.cost_price || 0)
        }))
      }
      
      await transactionsAPI.create(data)
      toast.success('İşlem oluşturuldu')
      setShowCreateModal(false)
      resetCreateForm()
      fetchTransactions()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem oluşturulamadı')
    }
  }
  
  const resetCreateForm = () => {
    setCreateForm({
      transaction_type: 'sale',
      company_id: companies[0]?.id || '',
      contact_id: '',
      currency: 'TRY',
      exchange_rate: 1,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ product_id: '', warehouse_id: '', quantity: 1, unit_price: 0, cost_price: 0 }]
    })
  }
  
  const addItem = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', warehouse_id: '', quantity: 1, unit_price: 0, cost_price: 0 }]
    }))
  }
  
  const removeItem = (index) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }
  
  const updateItem = (index, field, value) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value }
          
          // Auto-fill price when product selected
          if (field === 'product_id' && value) {
            const product = products.find(p => p.id === parseInt(value))
            if (product) {
              updated.unit_price = product.default_sale_price || 0
              updated.cost_price = product.default_cost_price || 0
            }
          }
          
          return updated
        }
        return item
      })
    }))
  }
  
  // Cancel transaction
  const handleCancel = async (transaction) => {
    const reason = prompt('İptal sebebi (opsiyonel):')
    if (reason === null) return // User cancelled prompt
    
    try {
      await transactionsAPI.cancel(transaction.id, reason)
      toast.success('İşlem iptal edildi')
      fetchTransactions()
      setSelectedTransaction(null)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İptal edilemedi')
    }
  }
  
  // Create return
  const handleReturn = async (transaction) => {
    const reason = prompt('İade sebebi (opsiyonel):')
    if (reason === null) return
    
    try {
      const response = await transactionsAPI.createReturn(transaction.id, reason, true)
      toast.success(`İade oluşturuldu: ${response.data.transaction_no}`)
      fetchTransactions()
      setSelectedTransaction(null)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İade oluşturulamadı')
    }
  }
  
  // Delete transaction
  const handleDelete = async (transaction) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return
    
    try {
      await transactionsAPI.delete(transaction.id)
      toast.success('İşlem silindi')
      fetchTransactions()
      setSelectedTransaction(null)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silinemedi')
    }
  }
  
  // Calculate totals
  const calculateItemTotal = (item) => {
    return parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)
  }
  
  const calculateFormTotal = () => {
    return createForm.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">İşlemler</h1>
          <p className="text-dark-400 mt-1">Satış ve alım işlemleri</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-48 h-11"
          >
            <option value="">Tüm İşlemler</option>
            <option value="sale">Satışlar</option>
            <option value="purchase">Alımlar</option>
            <option value="sale_return">İadeler (Satış)</option>
            <option value="purchase_return">İadeler (Alım)</option>
          </select>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary h-11 px-5"
          >
            <HiOutlinePlus className="w-5 h-5" />
            Yeni İşlem
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Toplam İşlem</p>
          <p className="text-2xl font-bold text-dark-50 mt-1">{transactions.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Toplam Satış</p>
          <p className="text-2xl font-bold text-nox-400 mt-1">
            {formatCurrency(
              transactions
                .filter(t => t.transaction_type === 'sale' && t.status !== 'cancelled')
                .reduce((sum, t) => sum + parseFloat(t.total_amount), 0)
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Toplam Alım</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            {formatCurrency(
              transactions
                .filter(t => t.transaction_type === 'purchase' && t.status !== 'cancelled')
                .reduce((sum, t) => sum + parseFloat(t.total_amount), 0)
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Toplam Kar</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(
              transactions
                .filter(t => t.transaction_type === 'sale' && t.status !== 'cancelled')
                .flatMap(t => t.items || [])
                .reduce((sum, item) => sum + parseFloat(item.profit || 0), 0)
            )}
          </p>
        </div>
      </div>
      
      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>İşlem No</th>
                <th>Tip</th>
                <th>Tarih</th>
                <th>Kalem Sayısı</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className={transaction.status === 'cancelled' ? 'opacity-50' : ''}>
                  <td className="font-mono text-nox-400">{transaction.transaction_no}</td>
                  <td>{getTypeBadge(transaction.transaction_type, transaction.status)}</td>
                  <td className="text-dark-400">
                    {transaction.transaction_date && format(
                      new Date(transaction.transaction_date),
                      'dd MMM yyyy HH:mm',
                      { locale: tr }
                    )}
                  </td>
                  <td className="text-dark-300">{transaction.items?.length || 0} kalem</td>
                  <td className="font-mono font-medium text-dark-100">
                    {formatCurrency(transaction.total_amount, transaction.currency)}
                  </td>
                  <td>
                    {transaction.status === 'cancelled' ? (
                      <span className="badge-danger">İptal</span>
                    ) : transaction.is_paid ? (
                      <span className="badge-success">Ödendi</span>
                    ) : (
                      <span className="badge-warning">Bekliyor</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedTransaction(transaction)}
                      className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-dark-500">
                    İşlem bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Create Modal - Full Screen Resizable */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="card w-[90vw] h-[85vh] min-w-[600px] min-h-[400px] overflow-auto animate-fade-in resize relative" style={{ resize: 'both', maxWidth: '95vw', maxHeight: '95vh' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-dark-50">Yeni İşlem</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-dark-800 rounded-lg">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    İşlem Tipi *
                  </label>
                  <select
                    value={createForm.transaction_type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, transaction_type: e.target.value }))}
                    className="input w-full"
                    required
                  >
                    <option value="sale">Satış</option>
                    <option value="purchase">Alım</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Şirket *
                  </label>
                  <select
                    value={createForm.company_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, company_id: e.target.value }))}
                    className="input w-full"
                    required
                  >
                    <option value="">Seçin...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Cari
                  </label>
                  <select
                    value={createForm.contact_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, contact_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Seçin...</option>
                    {contacts
                      .filter(c => {
                        if (createForm.transaction_type === 'sale') return c.contact_type !== 'supplier'
                        if (createForm.transaction_type === 'purchase') return c.contact_type !== 'customer'
                        return true
                      })
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="TRY">TRY - Türk Lirası</option>
                    <option value="USD">USD - Dolar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USDT">USDT - Tether</option>
                  </select>
                </div>
              </div>
              
              {/* Transaction Date */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    İşlem Tarihi *
                  </label>
                  <input
                    type="date"
                    value={createForm.transaction_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              {/* Exchange Rate */}
              {createForm.currency !== 'TRY' && (
                <div className="p-3 bg-dark-800/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-400">Döviz Kuru ({createForm.currency}/TRY)</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={createForm.exchange_rate}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 1 }))}
                      className="input w-32 text-right"
                    />
                  </div>
                </div>
              )}
              
              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-dark-300">Ürünler</label>
                  <button type="button" onClick={addItem} className="btn-ghost text-sm">
                    <HiOutlinePlus className="w-4 h-4" /> Satır Ekle
                  </button>
                </div>
                
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-dark-800/60 rounded-t-lg border-b border-dark-700">
                  <div className="col-span-4">
                    <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">Ürün</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">Adet</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">Birim Fiyat</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">Maliyet</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">Toplam</span>
                  </div>
                  <div className="col-span-1"></div>
                </div>
                
                <div className="space-y-2 mt-2">
                  {createForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-dark-800/30 rounded-lg items-center">
                      <div className="col-span-4">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="">Ürün seçin...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.model_code})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="input w-full text-sm text-center"
                          placeholder="0"
                          min="1"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          className="input w-full text-sm text-right"
                          placeholder="0,00"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost_price}
                          onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                          className="input w-full text-sm text-right"
                          placeholder="0,00"
                        />
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end text-dark-300 font-mono text-sm">
                        {formatCurrency(calculateItemTotal(item), createForm.currency)}
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end">
                        {createForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Notlar</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input w-full"
                  rows={2}
                />
              </div>
              
              {/* Total */}
              <div className="flex justify-end p-4 bg-dark-800/50 rounded-xl">
                <div className="text-right">
                  <span className="text-dark-400">Toplam: </span>
                  <span className="text-2xl font-bold text-nox-400 ml-2">
                    {formatCurrency(calculateFormTotal(), createForm.currency)}
                  </span>
                  {createForm.currency !== 'TRY' && (
                    <span className="text-dark-500 text-sm block mt-1">
                      ≈ {formatCurrency(calculateFormTotal() * createForm.exchange_rate, 'TRY')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn-primary">
                  <HiOutlinePlus className="w-5 h-5" />
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Detail Modal - Full Screen Resizable */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="card w-[85vw] h-[85vh] min-w-[500px] min-h-[400px] overflow-auto animate-fade-in resize relative" style={{ resize: 'both', maxWidth: '95vw', maxHeight: '95vh' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-dark-50">İşlem Detayı</h2>
                <p className="text-dark-400 font-mono">{selectedTransaction.transaction_no}</p>
              </div>
              {getTypeBadge(selectedTransaction.transaction_type, selectedTransaction.status)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-dark-500">Tarih</p>
                <p className="text-dark-200">
                  {selectedTransaction.transaction_date && format(
                    new Date(selectedTransaction.transaction_date),
                    'dd MMMM yyyy HH:mm',
                    { locale: tr }
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Durum</p>
                <p className="text-dark-200">
                  {selectedTransaction.status === 'cancelled' ? 'İptal Edildi' : 
                   selectedTransaction.is_paid ? 'Ödendi' : 'Ödeme Bekliyor'}
                </p>
              </div>
            </div>
            
            {/* Items */}
            <div className="border border-dark-800 rounded-xl overflow-hidden mb-6">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Birim Fiyat</th>
                    <th>Maliyet</th>
                    <th>Kar</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="text-dark-200">{item.description || `Ürün #${item.product_id}`}</td>
                      <td className="text-dark-400">{item.quantity}</td>
                      <td className="font-mono text-dark-200">
                        {formatCurrency(item.unit_price, selectedTransaction.currency)}
                      </td>
                      <td className="font-mono text-dark-400">
                        {formatCurrency(item.cost_price, selectedTransaction.currency)}
                      </td>
                      <td className={`font-mono ${parseFloat(item.profit) >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                        {formatCurrency(item.profit, selectedTransaction.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-dark-400">
                  <span>Ara Toplam:</span>
                  <span className="font-mono">{formatCurrency(selectedTransaction.subtotal, selectedTransaction.currency)}</span>
                </div>
                {parseFloat(selectedTransaction.discount_amount) > 0 && (
                  <div className="flex justify-between text-dark-400">
                    <span>İndirim:</span>
                    <span className="font-mono text-red-400">-{formatCurrency(selectedTransaction.discount_amount, selectedTransaction.currency)}</span>
                  </div>
                )}
                {parseFloat(selectedTransaction.tax_amount) > 0 && (
                  <div className="flex justify-between text-dark-400">
                    <span>Vergi:</span>
                    <span className="font-mono">{formatCurrency(selectedTransaction.tax_amount, selectedTransaction.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-dark-100 pt-2 border-t border-dark-700">
                  <span>Toplam:</span>
                  <span className="font-mono">{formatCurrency(selectedTransaction.total_amount, selectedTransaction.currency)}</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between">
              <div className="flex gap-2">
                {selectedTransaction.status !== 'cancelled' && (
                  <>
                    <button 
                      onClick={() => handleCancel(selectedTransaction)}
                      className="btn-danger text-sm"
                    >
                      <HiOutlineBan className="w-4 h-4" />
                      İptal Et
                    </button>
                    {selectedTransaction.transaction_type === 'sale' && (
                      <button 
                        onClick={() => handleReturn(selectedTransaction)}
                        className="btn-warning text-sm"
                      >
                        <HiOutlineReply className="w-4 h-4" />
                        İade Oluştur
                      </button>
                    )}
                  </>
                )}
                <button 
                  onClick={() => handleDelete(selectedTransaction)}
                  className="btn-ghost text-sm text-red-400 hover:text-red-300"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                  Sil
                </button>
              </div>
              
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="btn-secondary"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
