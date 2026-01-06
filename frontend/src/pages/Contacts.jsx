import { useState, useEffect } from 'react'
import { contactsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineUser
} from 'react-icons/hi'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_type: 'both',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    default_currency: 'TRY'
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
  
  useEffect(() => {
    fetchContacts()
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
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      city: contact.city || '',
      country: contact.country || '',
      default_currency: contact.default_currency
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
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      default_currency: 'TRY'
    })
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari ara..."
            className="input pl-11"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tüm Tipler</option>
          <option value="customer">Müşteriler</option>
          <option value="supplier">Tedarikçiler</option>
          <option value="both">Hem İkisi</option>
        </select>
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
                <th>Telefon</th>
                <th>Şehir</th>
                <th>Bakiye</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
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
                  <td className="text-dark-400">{contact.phone || '-'}</td>
                  <td className="text-dark-400">{contact.city || '-'}</td>
                  <td>
                    {contact.accounts?.map((acc) => (
                      <div key={acc.id} className="text-sm">
                        <span className={acc.balance > 0 ? 'text-nox-400' : acc.balance < 0 ? 'text-red-400' : 'text-dark-400'}>
                          {acc.balance.toLocaleString('tr-TR')} {acc.currency}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(contact)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(contact)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-dark-500">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingContact ? 'Cari Düzenle' : 'Yeni Cari'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kod</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Tip</label>
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
              
              <div>
                <label className="label">Ad</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
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
                  <label className="label">Para Birimi</label>
                  <select
                    value={formData.default_currency}
                    onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                    className="input"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
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
    </div>
  )
}

