import { useState, useEffect } from 'react'
import { companiesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineOfficeBuilding,
  HiOutlineGlobeAlt
} from 'react-icons/hi'

const countryFlags = {
  'TR': '🇹🇷',
  'AE': '🇦🇪',
  'CY': '🇨🇾',
  'EE': '🇪🇪',
}

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    full_name: '',
    country: '',
    country_code: '',
    default_currency: 'TRY'
  })
  
  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const response = await companiesAPI.list()
      setCompanies(response.data)
    } catch (error) {
      toast.error('Şirketler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchCompanies()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, formData)
        toast.success('Şirket güncellendi')
      } else {
        await companiesAPI.create(formData)
        toast.success('Şirket oluşturuldu')
      }
      setShowModal(false)
      resetForm()
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (company) => {
    setEditingCompany(company)
    setFormData({
      code: company.code,
      name: company.name,
      full_name: company.full_name || '',
      country: company.country,
      country_code: company.country_code || '',
      default_currency: company.default_currency
    })
    setShowModal(true)
  }
  
  const handleDelete = async (company) => {
    if (!confirm(`${company.name} şirketini silmek istediğinize emin misiniz?`)) return
    
    try {
      await companiesAPI.delete(company.id)
      toast.success('Şirket silindi')
      fetchCompanies()
    } catch (error) {
      toast.error('Şirket silinemedi')
    }
  }
  
  const resetForm = () => {
    setEditingCompany(null)
    setFormData({
      code: '',
      name: '',
      full_name: '',
      country: '',
      country_code: '',
      default_currency: 'TRY'
    })
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Şirketler</h1>
          <p className="text-dark-400 mt-1">Şirket ve depo yönetimi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Şirket</span>
        </button>
      </div>
      
      {/* Companies Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div key={company.id} className="card group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-nox-900/30 flex items-center justify-center text-xl">
                    {countryFlags[company.country_code] || '🏢'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-100">{company.name}</h3>
                    <p className="text-sm text-dark-500">{company.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(company)}
                    className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(company)}
                    className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-dark-800 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <HiOutlineGlobeAlt className="w-4 h-4 text-dark-500" />
                  <span className="text-dark-400">{company.country}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-dark-500">Para Birimi:</span>
                  <span className="text-dark-300">{company.default_currency}</span>
                </div>
                {company.warehouses?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <HiOutlineOfficeBuilding className="w-4 h-4 text-dark-500" />
                    <span className="text-dark-400">{company.warehouses.length} Depo</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket'}
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
                    placeholder="AG"
                    required
                  />
                </div>
                <div>
                  <label className="label">Ülke Kodu</label>
                  <input
                    type="text"
                    value={formData.country_code}
                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                    className="input"
                    placeholder="TR"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Şirket Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Agetekno"
                  required
                />
              </div>
              
              <div>
                <label className="label">Tam Adı</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  placeholder="Agetekno Bilişim Ltd."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ülke</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="input"
                    placeholder="Türkiye"
                    required
                  />
                </div>
                <div>
                  <label className="label">Para Birimi</label>
                  <select
                    value={formData.default_currency}
                    onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
                    className="input"
                  >
                    <option value="TRY">TRY - Türk Lirası</option>
                    <option value="USD">USD - Dolar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - Sterlin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingCompany ? 'Güncelle' : 'Oluştur'}
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

