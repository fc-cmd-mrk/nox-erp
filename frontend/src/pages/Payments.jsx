import { useState, useEffect } from 'react'
import { paymentsAPI, contactsAPI, accountsAPI, settingsAPI, companiesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus,
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineCreditCard,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineSwitchHorizontal,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineCalendar,
  HiOutlineX
} from 'react-icons/hi'

const channelLabels = {
  cash: 'Nakit',
  bank_transfer: 'Havale/EFT',
  credit_card: 'Kredi Kartı',
  paytr: 'PayTR',
  gpay: 'GPay',
  crypto: 'Kripto',
  advance: 'Avans',
  other: 'Diğer'
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [contacts, setContacts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [companies, setCompanies] = useState([])
  const [currentRates, setCurrentRates] = useState({})
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [showFilters, setShowFilters] = useState(false)
  
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [formData, setFormData] = useState({
    payment_type: 'incoming',
    payment_channel: 'bank_transfer',
    currency: 'TRY',
    amount: '',
    exchange_rate: '1',
    contact_id: '',
    account_id: '',
    description: '',
    reference_no: ''
  })
  const [transferData, setTransferData] = useState({
    from_account_id: '',
    to_account_id: '',
    from_amount: '',
    to_amount: '',
    exchange_rate: '',
    description: '',
    reference_no: ''
  })
  
  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = {}
      if (typeFilter) params.payment_type = typeFilter
      if (channelFilter) params.payment_channel = channelFilter
      if (searchFilter) params.search = searchFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (currencyFilter) params.currency = currencyFilter
      if (accountFilter) params.account_id = accountFilter
      const response = await paymentsAPI.list(params)
      setPayments(response.data)
    } catch (error) {
      toast.error('Ödemeler yüklenemedi')
    }
    setLoading(false)
  }
  
  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.list()
      setContacts(response.data)
    } catch (error) {
      console.error('Cariler yüklenemedi', error)
    }
  }
  
  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.list()
      setAccounts(response.data)
    } catch (error) {
      console.error('Hesaplar yüklenemedi', error)
    }
  }
  
  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.list()
      setCompanies(response.data)
    } catch (error) {
      console.error('Şirketler yüklenemedi', error)
    }
  }
  
  const fetchCurrentRates = async () => {
    try {
      const response = await settingsAPI.getTCMBRates()
      setCurrentRates(response.data || {})
    } catch (error) {
      console.log('Kurlar yüklenemedi')
    }
  }
  
  useEffect(() => {
    fetchContacts()
    fetchAccounts()
    fetchCompanies()
    fetchCurrentRates()
  }, [])
  
  useEffect(() => {
    fetchPayments()
  }, [typeFilter, channelFilter, searchFilter, dateFrom, dateTo, currencyFilter, accountFilter])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Cari veya hesap seçilmeli
    if (!formData.contact_id && !formData.account_id) {
      toast.error('Cari veya hesap seçmelisiniz')
      return
    }
    
    try {
      const data = { 
        ...formData, 
        amount: parseFloat(formData.amount),
        exchange_rate: parseFloat(formData.exchange_rate) || 1,
        contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
        account_id: formData.account_id ? parseInt(formData.account_id) : null
      }
      await paymentsAPI.create(data)
      toast.success('Ödeme kaydedildi')
      setShowModal(false)
      resetForm()
      fetchPayments()
      fetchAccounts() // Refresh account balances
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    
    if (!transferData.from_account_id || !transferData.to_account_id) {
      toast.error('Kaynak ve hedef hesap seçmelisiniz')
      return
    }
    
    if (transferData.from_account_id === transferData.to_account_id) {
      toast.error('Kaynak ve hedef hesap aynı olamaz')
      return
    }
    
    try {
      const data = {
        from_account_id: parseInt(transferData.from_account_id),
        to_account_id: parseInt(transferData.to_account_id),
        from_amount: parseFloat(transferData.from_amount),
        to_amount: transferData.to_amount ? parseFloat(transferData.to_amount) : null,
        exchange_rate: transferData.exchange_rate ? parseFloat(transferData.exchange_rate) : null,
        description: transferData.description,
        reference_no: transferData.reference_no
      }
      
      const response = await paymentsAPI.transfer(data)
      toast.success(`Virman başarılı: ${response.data.transfer_no}`)
      setShowTransferModal(false)
      resetTransferForm()
      fetchPayments()
      fetchAccounts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Virman başarısız')
    }
  }
  
  const handleDelete = async (payment) => {
    if (!confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) return
    
    try {
      await paymentsAPI.delete(payment.id)
      toast.success('Ödeme silindi')
      fetchPayments()
      fetchAccounts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme işlemi başarısız')
    }
  }
  
  const resetForm = () => {
    setFormData({
      payment_type: 'incoming',
      payment_channel: 'bank_transfer',
      currency: 'TRY',
      amount: '',
      exchange_rate: '1',
      contact_id: '',
      account_id: '',
      description: '',
      reference_no: ''
    })
  }
  
  const resetTransferForm = () => {
    setTransferData({
      from_account_id: '',
      to_account_id: '',
      from_amount: '',
      to_amount: '',
      exchange_rate: '',
      description: '',
      reference_no: ''
    })
  }
  
  const resetFilters = () => {
    setTypeFilter('')
    setChannelFilter('')
    setSearchFilter('')
    setCompanyFilter('')
    setAccountFilter('')
    setCurrencyFilter('')
    setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId)
    return contact ? contact.name : '-'
  }
  
  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId)
    return account ? `${account.name} (${account.currency})` : '-'
  }
  
  // Calculate filtered totals
  const totalIncoming = payments
    .filter(p => p.payment_type === 'incoming')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  const totalOutgoing = payments
    .filter(p => p.payment_type === 'outgoing')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  // Filter accounts by selected currency
  const filteredAccounts = accounts.filter(a => 
    !formData.currency || a.currency === formData.currency
  )
  
  // Filter accounts by company
  const companyFilteredAccounts = companyFilter 
    ? accounts.filter(a => a.company_id === parseInt(companyFilter))
    : accounts
  
  // Get account by ID
  const getAccount = (id) => accounts.find(a => a.id === parseInt(id))
  
  // Calculate exchange rate suggestion
  const calculateSuggestedRate = () => {
    const fromAccount = getAccount(transferData.from_account_id)
    const toAccount = getAccount(transferData.to_account_id)
    
    if (!fromAccount || !toAccount) return null
    if (fromAccount.currency === toAccount.currency) return 1
    
    // Try to find TCMB rate
    const fromCurrency = fromAccount.currency
    const toCurrency = toAccount.currency
    
    // Get rates to TRY
    const fromToTRY = fromCurrency === 'TRY' ? 1 : (currentRates[fromCurrency]?.buying || null)
    const toToTRY = toCurrency === 'TRY' ? 1 : (currentRates[toCurrency]?.buying || null)
    
    if (fromToTRY && toToTRY) {
      // Cross rate: from -> TRY -> to
      return fromToTRY / toToTRY
    }
    
    return null
  }
  
  // Auto-fill exchange rate when accounts change
  useEffect(() => {
    if (transferData.from_account_id && transferData.to_account_id) {
      const suggestedRate = calculateSuggestedRate()
      if (suggestedRate && !transferData.exchange_rate) {
        setTransferData(prev => ({
          ...prev,
          exchange_rate: suggestedRate.toFixed(6)
        }))
      }
    }
  }, [transferData.from_account_id, transferData.to_account_id])
  
  // Calculate to_amount when from_amount or exchange_rate changes
  useEffect(() => {
    const fromAccount = getAccount(transferData.from_account_id)
    const toAccount = getAccount(transferData.to_account_id)
    
    if (fromAccount && toAccount && transferData.from_amount && transferData.exchange_rate) {
      if (fromAccount.currency !== toAccount.currency) {
        const calculated = parseFloat(transferData.from_amount) * parseFloat(transferData.exchange_rate)
        setTransferData(prev => ({
          ...prev,
          to_amount: calculated.toFixed(2)
        }))
      } else {
        setTransferData(prev => ({
          ...prev,
          to_amount: transferData.from_amount
        }))
      }
    }
  }, [transferData.from_amount, transferData.exchange_rate])
  
  const activeFiltersCount = [
    typeFilter, channelFilter, companyFilter, accountFilter, currencyFilter
  ].filter(Boolean).length
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Ödemeler</h1>
          <p className="text-dark-400 mt-1">Tahsilat, ödeme ve virman takibi</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { resetTransferForm(); setShowTransferModal(true); }}
            className="btn-secondary"
          >
            <HiOutlineSwitchHorizontal className="w-5 h-5" />
            <span>Virman</span>
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn-primary"
          >
            <HiOutlinePlus className="w-5 h-5" />
            <span>Yeni Ödeme</span>
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-nox-900/30">
              <HiOutlineArrowDown className="w-5 h-5 text-nox-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Tahsilat</p>
              <p className="text-xl font-bold text-nox-400">{formatCurrency(totalIncoming)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-900/30">
              <HiOutlineArrowUp className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Ödeme</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalOutgoing)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-900/30">
              <HiOutlineCreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Net Akış</p>
              <p className={`text-xl font-bold ${totalIncoming - totalOutgoing >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                {formatCurrency(totalIncoming - totalOutgoing)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none z-10" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Ödeme no veya açıklama ara..."
              className="input !pl-11"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${showFilters ? 'bg-nox-900/50 border-nox-500' : ''}`}
          >
            <HiOutlineFilter className="w-5 h-5" />
            <span>Filtreler</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-nox-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        
        {showFilters && (
          <div className="card !p-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="label flex items-center gap-1">
                  <HiOutlineCalendar className="w-4 h-4" />
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <HiOutlineCalendar className="w-4 h-4" />
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input"
                />
              </div>
              
              {/* Type & Channel */}
              <div>
                <label className="label">İşlem Tipi</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input"
                >
                  <option value="">Tüm Tipler</option>
                  <option value="incoming">Tahsilat</option>
                  <option value="outgoing">Ödeme</option>
                </select>
              </div>
              <div>
                <label className="label">Ödeme Kanalı</label>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="input"
                >
                  <option value="">Tüm Kanallar</option>
                  {Object.entries(channelLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              
              {/* Company & Account */}
              <div>
                <label className="label">Şirket</label>
                <select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value)
                    setAccountFilter('')
                  }}
                  className="input"
                >
                  <option value="">Tüm Şirketler</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hesap</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="input"
                >
                  <option value="">Tüm Hesaplar</option>
                  {companyFilteredAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Currency */}
              <div>
                <label className="label">Para Birimi</label>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="input"
                >
                  <option value="">Tüm Para Birimleri</option>
                  <option value="TRY">TRY - Türk Lirası</option>
                  <option value="USD">USD - Dolar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USDT">USDT - Tether</option>
                </select>
              </div>
              
              {/* Reset */}
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="btn-secondary w-full"
                >
                  <HiOutlineX className="w-4 h-4" />
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>
        )}
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
                <th>Ödeme No</th>
                <th>Tip</th>
                <th>Kanal</th>
                <th>Cari</th>
                <th>Hesap</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-mono text-nox-400">{payment.payment_no}</td>
                  <td>
                    {payment.payment_type === 'incoming' ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        <HiOutlineArrowDown className="w-3 h-3" />
                        Tahsilat
                      </span>
                    ) : (
                      <span className="badge-danger flex items-center gap-1 w-fit">
                        <HiOutlineArrowUp className="w-3 h-3" />
                        Ödeme
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge-info">{channelLabels[payment.payment_channel] || payment.payment_channel}</span>
                  </td>
                  <td className="text-dark-300">{getContactName(payment.contact_id)}</td>
                  <td className="text-dark-400 text-sm">{getAccountName(payment.account_id)}</td>
                  <td className="text-dark-400">
                    {payment.payment_date && format(
                      new Date(payment.payment_date),
                      'dd MMM yyyy HH:mm',
                      { locale: tr }
                    )}
                  </td>
                  <td className={`font-mono font-medium ${payment.payment_type === 'incoming' ? 'text-nox-400' : 'text-red-400'}`}>
                    {payment.payment_type === 'incoming' ? '+' : '-'}
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(payment)}
                      className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-dark-500">
                    Ödeme bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Yeni Ödeme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Yeni Ödeme</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">İşlem Tipi *</label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                    className="input"
                  >
                    <option value="incoming">Tahsilat (Gelen)</option>
                    <option value="outgoing">Ödeme (Giden)</option>
                  </select>
                  <p className="text-xs text-dark-500 mt-1">Paranın yönü</p>
                </div>
                <div>
                  <label className="label">Ödeme Kanalı *</label>
                  <select
                    value={formData.payment_channel}
                    onChange={(e) => setFormData({ ...formData, payment_channel: e.target.value })}
                    className="input"
                  >
                    {Object.entries(channelLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-dark-500 mt-1">Ödeme yöntemi</p>
                </div>
              </div>
              
              {/* Cari veya Hesap Seçimi */}
              <div className="p-4 bg-dark-800/30 rounded-xl border border-dark-700/50">
                <p className="text-xs text-dark-500 mb-3">Cari veya hesap seçmelisiniz (en az biri zorunlu)</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Cari (Müşteri/Tedarikçi)</label>
                    <select
                      value={formData.contact_id}
                      onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Cari Seçin</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} ({contact.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-dark-500 mt-1">Ödemeyi yapan/alan cari</p>
                  </div>
                  
                  <div>
                    <label className="label">Hesap (Kasa/Banka/Cüzdan)</label>
                    <select
                      value={formData.account_id}
                      onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                      className="input"
                    >
                      <option value="">Hesap Seçin</option>
                      {filteredAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} - {account.account_type} ({account.currency}) - Bakiye: {parseFloat(account.balance).toLocaleString('tr-TR')}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-dark-500 mt-1">
                      {formData.payment_type === 'incoming' ? 'Paranın gireceği hesap' : 'Paranın çıkacağı hesap'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Tutar *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-dark-500 mt-1">Ödeme tutarı</p>
                </div>
                <div>
                  <label className="label">Para Birimi *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value, account_id: '' })}
                    className="input"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <div>
                  <label className="label">Döviz Kuru</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.exchange_rate}
                    onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                    className="input"
                    placeholder="1.0000"
                  />
                  <p className="text-xs text-dark-500 mt-1">1 {formData.currency} = X TRY</p>
                </div>
              </div>
              
              <div>
                <label className="label">Referans No</label>
                <input
                  type="text"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  className="input"
                  placeholder="Banka referans, dekont no vb."
                />
                <p className="text-xs text-dark-500 mt-1">Opsiyonel referans numarası</p>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Ödeme ile ilgili notlar..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Kaydet
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Virman (Transfer) Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-900/30">
                <HiOutlineSwitchHorizontal className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-dark-50">Hesaplar Arası Virman</h2>
                <p className="text-sm text-dark-500">Farklı para birimleri arası dönüşüm desteklenir</p>
              </div>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {/* Kaynak Hesap */}
              <div>
                <label className="label">Kaynak Hesap (Paranın Çıkacağı) *</label>
                <select
                  value={transferData.from_account_id}
                  onChange={(e) => setTransferData({ ...transferData, from_account_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Hesap Seçin</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency}) - Bakiye: {parseFloat(account.balance).toLocaleString('tr-TR')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">Para çıkışı yapılacak hesap</p>
              </div>
              
              {/* Hedef Hesap */}
              <div>
                <label className="label">Hedef Hesap (Paranın Gireceği) *</label>
                <select
                  value={transferData.to_account_id}
                  onChange={(e) => setTransferData({ ...transferData, to_account_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Hesap Seçin</option>
                  {accounts.filter(a => a.id !== parseInt(transferData.from_account_id)).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency}) - Bakiye: {parseFloat(account.balance).toLocaleString('tr-TR')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">Para girişi yapılacak hesap</p>
              </div>
              
              {/* Tutarlar ve Kur */}
              {transferData.from_account_id && transferData.to_account_id && (
                <>
                  {getAccount(transferData.from_account_id)?.currency !== getAccount(transferData.to_account_id)?.currency && (
                    <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
                      <div className="flex items-center gap-2 mb-2">
                        <HiOutlineRefresh className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-400">Kur Dönüşümü</span>
                      </div>
                      <p className="text-xs text-dark-400">
                        {getAccount(transferData.from_account_id)?.currency} → {getAccount(transferData.to_account_id)?.currency} dönüşümü yapılacak
                      </p>
                      {calculateSuggestedRate() && (
                        <p className="text-xs text-dark-500 mt-1">
                          TCMB kuru: 1 {getAccount(transferData.from_account_id)?.currency} = {calculateSuggestedRate()?.toFixed(4)} {getAccount(transferData.to_account_id)?.currency}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        Çıkış Tutarı ({getAccount(transferData.from_account_id)?.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transferData.from_amount}
                        onChange={(e) => setTransferData({ ...transferData, from_amount: e.target.value })}
                        className="input"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    {getAccount(transferData.from_account_id)?.currency !== getAccount(transferData.to_account_id)?.currency && (
                      <div>
                        <label className="label flex items-center gap-1">
                          Kur
                          {calculateSuggestedRate() && (
                            <button
                              type="button"
                              onClick={() => setTransferData({ 
                                ...transferData, 
                                exchange_rate: calculateSuggestedRate()?.toFixed(6) 
                              })}
                              className="text-xs text-nox-400 hover:text-nox-300"
                              title="TCMB kurunu kullan"
                            >
                              (TCMB)
                            </button>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={transferData.exchange_rate}
                          onChange={(e) => setTransferData({ ...transferData, exchange_rate: e.target.value })}
                          className="input"
                          placeholder="Kur"
                          required
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="label">
                        Giriş Tutarı ({getAccount(transferData.to_account_id)?.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transferData.to_amount}
                        onChange={(e) => setTransferData({ ...transferData, to_amount: e.target.value })}
                        className="input"
                        placeholder="0.00"
                        readOnly={getAccount(transferData.from_account_id)?.currency === getAccount(transferData.to_account_id)?.currency}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label className="label">Referans No</label>
                <input
                  type="text"
                  value={transferData.reference_no}
                  onChange={(e) => setTransferData({ ...transferData, reference_no: e.target.value })}
                  className="input"
                  placeholder="Banka referans, dekont no vb."
                />
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Virman ile ilgili notlar..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  <HiOutlineSwitchHorizontal className="w-4 h-4" />
                  Virman Yap
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
