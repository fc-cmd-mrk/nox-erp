import { useState, useEffect } from 'react'
import { contactsAPI, companiesAPI, settingsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineOfficeBuilding,
  HiOutlineIdentification,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineX,
  HiOutlineFilter,
  HiOutlineCurrencyDollar
} from 'react-icons/hi'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [currentRates, setCurrentRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  
  // Filters
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [taxQueryLoading, setTaxQueryLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_type: 'both',
    company_name: '',
    tax_number: '',
    tax_office: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Türkiye',
    default_currency: 'TRY',
    company_ids: []
  })
  
  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.search = filter
      if (typeFilter) params.contact_type = typeFilter
      const response = await contactsAPI.list(params)
      setContacts(response.data)
    } catch (error) {
      toast.error('Cariler yüklenemedi')
    }
    setLoading(false)
  }
  
  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.list()
      setCompanies(response.data)
    } catch (error) {
      console.error('Companies fetch error:', error)
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
    fetchCompanies()
    fetchCurrentRates()
  }, [filter, typeFilter])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData)
        toast.success('Cari güncellendi')
      } else {
        await contactsAPI.create(formData)
        toast.success('Cari oluşturuldu')
      }
      setShowModal(false)
      resetForm()
      fetchContacts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (contact) => {
    setEditingContact(contact)
    setFormData({
      code: contact.code,
      name: contact.name,
      contact_type: contact.contact_type,
      company_name: contact.company_name || '',
      tax_number: contact.tax_number || '',
      tax_office: contact.tax_office || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      city: contact.city || '',
      country: contact.country || 'Türkiye',
      default_currency: contact.default_currency,
      company_ids: contact.companies?.map(c => c.id) || []
    })
    setShowModal(true)
  }
  
  const handleDelete = async (contact) => {
    if (!confirm(`${contact.name} carisini silmek istediğinize emin misiniz?`)) return
    
    try {
      await contactsAPI.delete(contact.id)
      toast.success('Cari silindi')
      fetchContacts()
    } catch (error) {
      toast.error('Cari silinemedi')
    }
  }
  
  const resetForm = () => {
    setEditingContact(null)
    setFormData({
      code: '',
      name: '',
      contact_type: 'both',
      company_name: '',
      tax_number: '',
      tax_office: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Türkiye',
      default_currency: 'TRY',
      company_ids: []
    })
  }
  
  const resetFilters = () => {
    setFilter('')
    setTypeFilter('')
    setCompanyFilter('')
    setCurrencyFilter('')
  }
  
  const handleTaxQuery = async () => {
    if (!formData.tax_number || formData.tax_number.length < 10) {
      toast.error('Lütfen geçerli bir VKN (10 hane) veya TC Kimlik No (11 hane) girin')
      return
    }
    
    setTaxQueryLoading(true)
    try {
      const response = await contactsAPI.queryTaxInfo(formData.tax_number)
      const data = response.data
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          name: data.company_name || prev.name,
          company_name: data.company_name || prev.company_name,
          tax_office: data.tax_office || prev.tax_office,
          city: data.city || prev.city
        }))
        toast.success('Bilgiler başarıyla çekildi')
      } else {
        toast.error(data.error || 'Sorgu sonucu bulunamadı')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'VKN/TC sorgulaması başarısız')
    }
    setTaxQueryLoading(false)
  }
  
  const toggleCompany = (companyId) => {
    setFormData(prev => ({
      ...prev,
      company_ids: prev.company_ids.includes(companyId)
        ? prev.company_ids.filter(id => id !== companyId)
        : [...prev.company_ids, companyId]
    }))
  }
  
  const fetchContactDetail = async (contactId) => {
    setDetailLoading(true)
    try {
      const response = await contactsAPI.get(contactId)
      setSelectedContact(response.data)
      setShowDetailModal(true)
    } catch (error) {
      toast.error('Cari detayları yüklenemedi')
    }
    setDetailLoading(false)
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  // Convert amount to USD
  const convertToUSD = (amount, currency) => {
    if (!amount || currency === 'USD') return amount
    
    const usdRate = currentRates['USD']?.buying || 1
    
    if (currency === 'TRY') {
      return amount / usdRate
    } else {
      // First convert to TRY, then to USD
      const currencyRate = currentRates[currency]?.buying || 1
      const amountInTRY = amount * currencyRate
      return amountInTRY / usdRate
    }
  }
  
  // Calculate USD summary for contact
  const calculateUSDSummary = (contact) => {
    if (!contact?.accounts) return { totalUSD: 0, accounts: [] }
    
    let totalUSD = 0
    const accountsWithUSD = contact.accounts.map(acc => {
      const balanceUSD = convertToUSD(parseFloat(acc.balance), acc.currency)
      totalUSD += balanceUSD
      return {
        ...acc,
        balanceUSD
      }
    })
    
    return { totalUSD, accounts: accountsWithUSD }
  }
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'customer': return <HiOutlineUser className="w-4 h-4 text-blue-400" />
      case 'supplier': return <HiOutlineTruck className="w-4 h-4 text-orange-400" />
      default: return <HiOutlineUserGroup className="w-4 h-4 text-nox-400" />
    }
  }
  
  const getTypeBadge = (type) => {
    switch (type) {
      case 'customer': return <span className="badge-info">Müşteri</span>
      case 'supplier': return <span className="badge-warning">Tedarikçi</span>
      default: return <span className="badge-success">Hem İkisi</span>
    }
  }
  
  // Apply filters
  const filteredContacts = contacts.filter(contact => {
    if (companyFilter) {
      const hasCompany = contact.companies?.some(c => c.id === parseInt(companyFilter))
      if (!hasCompany) return false
    }
    if (currencyFilter && contact.default_currency !== currencyFilter) {
      return false
    }
    return true
  })
  
  const activeFiltersCount = [typeFilter, companyFilter, currencyFilter].filter(Boolean).length
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Cariler</h1>
          <p className="text-dark-400 mt-1">Müşteri ve tedarikçi yönetimi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Cari</span>
        </button>
      </div>
      
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none z-10" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Cari ara (ad veya kod)..."
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
              <div>
                <label className="label">Cari Tipi</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="input"
                >
                  <option value="">Tüm Tipler</option>
                  <option value="customer">Müşteriler</option>
                  <option value="supplier">Tedarikçiler</option>
                  <option value="both">Hem İkisi</option>
                </select>
              </div>
              <div>
                <label className="label">Şirket</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
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
                <th>Kod</th>
                <th>Ad</th>
                <th>Tip</th>
                <th>Para Birimi</th>
                <th>Telefon</th>
                <th>Şehir</th>
                <th>Şirketler</th>
                <th>Bakiye</th>
                <th className="w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className="cursor-pointer hover:bg-dark-800/50"
                  onClick={() => fetchContactDetail(contact.id)}
                >
                  <td className="font-mono text-nox-400">{contact.code}</td>
                  <td>
                    <div>
                      <p className="font-medium text-dark-100">{contact.name}</p>
                      {contact.company_name && (
                        <p className="text-sm text-dark-500">{contact.company_name}</p>
                      )}
                    </div>
                  </td>
                  <td>{getTypeBadge(contact.contact_type)}</td>
                  <td>
                    <span className="badge-info">{contact.default_currency}</span>
                  </td>
                  <td className="text-dark-400">{contact.phone || '-'}</td>
                  <td className="text-dark-400">{contact.city || '-'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {contact.companies?.map(c => (
                        <span key={c.id} className="badge-info text-xs">{c.code}</span>
                      ))}
                      {(!contact.companies || contact.companies.length === 0) && (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {contact.accounts?.map((acc) => (
                      <div key={acc.id} className="text-sm">
                        <span className={parseFloat(acc.balance) > 0 ? 'text-nox-400' : parseFloat(acc.balance) < 0 ? 'text-red-400' : 'text-dark-400'}>
                          {parseFloat(acc.balance).toLocaleString('tr-TR')} {acc.currency}
                        </span>
                      </div>
                    ))}
                    {(!contact.accounts || contact.accounts.length === 0) && (
                      <span className="text-dark-500 text-sm">-</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => fetchContactDetail(contact.id)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-nox-400"
                        title="Detay Görüntüle"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(contact)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                        title="Düzenle"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(contact)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                        title="Sil"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-dark-500">
                    Cari bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="card w-[85vw] h-auto max-h-[90vh] min-w-[500px] overflow-auto animate-fade-in resize relative" style={{ resize: 'both', maxWidth: '95vw' }}>
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingContact ? 'Cari Düzenle' : 'Yeni Cari'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kod *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input"
                    required
                  />
                  <p className="text-xs text-dark-500 mt-1">Benzersiz cari kodu</p>
                </div>
                <div>
                  <label className="label">Tip *</label>
                  <select
                    value={formData.contact_type}
                    onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
                    className="input"
                  >
                    <option value="customer">Müşteri</option>
                    <option value="supplier">Tedarikçi</option>
                    <option value="both">Hem İkisi</option>
                  </select>
                </div>
              </div>
              
              {/* VKN/TC Sorgulama */}
              <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700 space-y-3">
                <div className="flex items-center gap-2 text-dark-300">
                  <HiOutlineIdentification className="w-5 h-5 text-nox-400" />
                  <span className="font-medium">VKN/TC ile Otomatik Bilgi Çek</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="VKN (10 hane) veya TC Kimlik No (11 hane)"
                    className="input flex-1 font-mono"
                    maxLength={11}
                  />
                  <button
                    type="button"
                    onClick={handleTaxQuery}
                    disabled={taxQueryLoading || !formData.tax_number || formData.tax_number.length < 10}
                    className="btn-primary !px-4"
                  >
                    {taxQueryLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <HiOutlineRefresh className="w-5 h-5" />
                    )}
                    <span>Sorgula</span>
                  </button>
                </div>
                <p className="text-xs text-dark-500">
                  GİB'den firma bilgilerini otomatik çeker
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={formData.tax_office}
                    onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Ad *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Firma Adı</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Adres</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Şehir</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Ülke</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Varsayılan Para Birimi</label>
                  <select
                    value={formData.default_currency}
                    onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                    className="input"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>
              
              {/* Company Relations */}
              <div>
                <label className="label">
                  <HiOutlineOfficeBuilding className="w-4 h-4 inline mr-1" />
                  Bağlı Şirketler
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-dark-800/50 rounded-lg">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => toggleCompany(company.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        formData.company_ids.includes(company.id)
                          ? 'bg-nox-600 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      {company.name} ({company.code})
                    </button>
                  ))}
                  {companies.length === 0 && (
                    <span className="text-dark-500 text-sm">Şirket bulunamadı</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingContact ? 'Güncelle' : 'Oluştur'}
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
      
      {/* Detail Modal - Full Screen Resizable with Multi-Currency Support */}
      {showDetailModal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="card w-[95vw] h-[90vh] min-w-[600px] min-h-[400px] overflow-auto animate-fade-in resize relative" style={{ resize: 'both', maxWidth: '95vw', maxHeight: '95vh' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {getTypeIcon(selectedContact.contact_type)}
                <div>
                  <h2 className="text-xl font-semibold text-dark-50">{selectedContact.name}</h2>
                  <p className="text-sm text-dark-400">{selectedContact.code} • {selectedContact.default_currency}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contact Info */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-dark-800/30 rounded-xl">
              <div>
                <p className="text-xs text-dark-500">Tip</p>
                <p className="text-dark-200">{getTypeBadge(selectedContact.contact_type)}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Telefon</p>
                <p className="text-dark-200">{selectedContact.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Email</p>
                <p className="text-dark-200">{selectedContact.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Şehir</p>
                <p className="text-dark-200">{selectedContact.city || '-'}</p>
              </div>
              {selectedContact.tax_number && (
                <div>
                  <p className="text-xs text-dark-500">VKN/TCKN</p>
                  <p className="text-dark-200 font-mono">{selectedContact.tax_number}</p>
                </div>
              )}
              {selectedContact.company_name && (
                <div className="col-span-2">
                  <p className="text-xs text-dark-500">Firma Adı</p>
                  <p className="text-dark-200">{selectedContact.company_name}</p>
                </div>
              )}
            </div>
            
            {/* Accounts / Balances - Multi-Currency with USD Summary */}
            {selectedContact.accounts && selectedContact.accounts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                  <HiOutlineCreditCard className="w-4 h-4" />
                  Para Birimi Hesapları (Alt Hesaplar)
                </h3>
                
                {/* USD Summary Card */}
                {(() => {
                  const summary = calculateUSDSummary(selectedContact)
                  return (
                    <div className="mb-4 p-4 bg-gradient-to-r from-nox-900/30 to-blue-900/30 rounded-xl border border-nox-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HiOutlineCurrencyDollar className="w-5 h-5 text-nox-400" />
                          <span className="text-dark-300 font-medium">Toplam Bakiye (USD Karşılığı)</span>
                        </div>
                        <p className={`text-2xl font-bold font-mono ${
                          summary.totalUSD >= 0 ? 'text-nox-400' : 'text-red-400'
                        }`}>
                          ${summary.totalUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <p className="text-xs text-dark-500 mt-2">
                        Tüm para birimlerindeki bakiyeler güncel kurlarla USD'ye çevrilmiştir
                      </p>
                    </div>
                  )
                })()}
                
                {/* Individual Currency Accounts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedContact.accounts.map((acc) => {
                    const balanceUSD = convertToUSD(parseFloat(acc.balance), acc.currency)
                    return (
                      <div key={acc.id} className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-dark-500 uppercase tracking-wider">{acc.currency}</span>
                          <span className="badge-info text-xs">Alt Hesap</span>
                        </div>
                        <p className={`text-xl font-bold font-mono ${
                          parseFloat(acc.balance) > 0 ? 'text-nox-400' : parseFloat(acc.balance) < 0 ? 'text-red-400' : 'text-dark-300'
                        }`}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </p>
                        {acc.currency !== 'USD' && (
                          <p className="text-xs text-dark-500 mt-1 font-mono">
                            ≈ ${balanceUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Payments */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                <HiOutlineCreditCard className="w-4 h-4" />
                Ödemeler ({selectedContact.payments?.length || 0})
              </h3>
              {selectedContact.payments && selectedContact.payments.length > 0 ? (
                <div className="overflow-x-auto max-h-80">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Ödeme No</th>
                        <th>Tip</th>
                        <th>Tarih</th>
                        <th>Tutar</th>
                        <th>USD Karşılığı</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedContact.payments.map((payment) => {
                        const amountUSD = convertToUSD(parseFloat(payment.amount), payment.currency)
                        return (
                          <tr key={payment.id}>
                            <td className="font-mono text-nox-400">{payment.payment_no}</td>
                            <td>
                              {payment.payment_type === 'incoming' ? (
                                <span className="badge-success flex items-center gap-1 w-fit text-xs">
                                  <HiOutlineArrowDown className="w-3 h-3" />
                                  Tahsilat
                                </span>
                              ) : (
                                <span className="badge-danger flex items-center gap-1 w-fit text-xs">
                                  <HiOutlineArrowUp className="w-3 h-3" />
                                  Ödeme
                                </span>
                              )}
                            </td>
                            <td className="text-dark-400">
                              {payment.payment_date && format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: tr })}
                            </td>
                            <td className={`font-mono ${payment.payment_type === 'incoming' ? 'text-nox-400' : 'text-red-400'}`}>
                              {payment.payment_type === 'incoming' ? '+' : '-'}
                              {formatCurrency(payment.amount, payment.currency)}
                            </td>
                            <td className="font-mono text-dark-500">
                              ${amountUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-dark-500 max-w-xs truncate">{payment.description || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-lg">Bu cariye ait ödeme kaydı bulunamadı.</p>
              )}
            </div>
            
            {/* Transactions */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                <HiOutlineDocumentText className="w-4 h-4" />
                İşlemler ({selectedContact.transactions?.length || 0})
              </h3>
              {selectedContact.transactions && selectedContact.transactions.length > 0 ? (
                <div className="overflow-x-auto max-h-80">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>İşlem No</th>
                        <th>Tip</th>
                        <th>Tarih</th>
                        <th>Tutar</th>
                        <th>USD Karşılığı</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedContact.transactions.map((trans) => {
                        const amountUSD = convertToUSD(parseFloat(trans.total_amount), trans.currency)
                        return (
                          <tr key={trans.id}>
                            <td className="font-mono text-nox-400">{trans.transaction_no}</td>
                            <td>
                              {trans.transaction_type === 'sale' && <span className="badge-success text-xs">Satış</span>}
                              {trans.transaction_type === 'purchase' && <span className="badge-warning text-xs">Alış</span>}
                              {trans.transaction_type === 'sale_return' && <span className="badge-danger text-xs">Satış İade</span>}
                              {trans.transaction_type === 'purchase_return' && <span className="badge-info text-xs">Alış İade</span>}
                            </td>
                            <td className="text-dark-400">
                              {trans.transaction_date && format(new Date(trans.transaction_date), 'dd MMM yyyy', { locale: tr })}
                            </td>
                            <td className="font-mono text-dark-200">
                              {formatCurrency(trans.total_amount, trans.currency)}
                            </td>
                            <td className="font-mono text-dark-500">
                              ${amountUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              {trans.status === 'completed' && <span className="badge-success text-xs">Tamamlandı</span>}
                              {trans.status === 'pending' && <span className="badge-warning text-xs">Bekliyor</span>}
                              {trans.status === 'cancelled' && <span className="badge-danger text-xs">İptal</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-lg">Bu cariye ait işlem kaydı bulunamadı.</p>
              )}
            </div>
            
            {/* Companies */}
            {selectedContact.companies && selectedContact.companies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                  <HiOutlineOfficeBuilding className="w-4 h-4" />
                  Bağlı Şirketler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContact.companies.map((c) => (
                    <span key={c.id} className="px-3 py-1.5 bg-dark-800/50 rounded-lg text-sm text-dark-300">
                      {c.name} ({c.code})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-6 mt-6 border-t border-dark-700">
              <button 
                onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedContact)
                }}
                className="btn-secondary flex-1"
              >
                <HiOutlinePencil className="w-4 h-4" />
                Düzenle
              </button>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn-primary flex-1"
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
