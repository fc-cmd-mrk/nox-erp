import { useState, useEffect } from 'react'
import { companiesAPI, accountsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineOfficeBuilding,
  HiOutlineGlobeAlt,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineLibrary,
  HiOutlineCreditCard
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
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [accounts, setAccounts] = useState([])
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    full_name: '',
    country: '',
    country_code: '',
    default_currency: 'TRY'
  })
  
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    description: '',
    is_default: false
  })
  
  const [subWarehouseForm, setSubWarehouseForm] = useState({
    code: '',
    name: '',
    description: ''
  })
  const [showSubWarehouseModal, setShowSubWarehouseModal] = useState(false)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null)
  
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
  
  const fetchAccounts = async (companyId) => {
    try {
      const response = await accountsAPI.list({ company_id: companyId })
      setAccounts(response.data)
    } catch (error) {
      console.error('Hesaplar yüklenemedi', error)
    }
  }
  
  useEffect(() => {
    fetchCompanies()
  }, [])
  
  useEffect(() => {
    if (expandedCompany) {
      fetchAccounts(expandedCompany)
    }
  }, [expandedCompany])
  
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
  
  // Warehouse handlers
  const handleAddWarehouse = (companyId) => {
    setSelectedCompanyId(companyId)
    setEditingWarehouse(null)
    setWarehouseForm({ code: '', name: '', description: '', is_default: false })
    setShowWarehouseModal(true)
  }
  
  const handleEditWarehouse = (warehouse, companyId) => {
    setSelectedCompanyId(companyId)
    setEditingWarehouse(warehouse)
    setWarehouseForm({
      code: warehouse.code,
      name: warehouse.name,
      description: warehouse.description || '',
      is_default: warehouse.is_default || false
    })
    setShowWarehouseModal(true)
  }
  
  const handleWarehouseSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingWarehouse) {
        await companiesAPI.updateWarehouse(selectedCompanyId, editingWarehouse.id, warehouseForm)
        toast.success('Depo güncellendi')
      } else {
        await companiesAPI.addWarehouse(selectedCompanyId, warehouseForm)
        toast.success('Depo eklendi')
      }
      setShowWarehouseModal(false)
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleDeleteWarehouse = async (companyId, warehouseId) => {
    if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) return
    
    try {
      await companiesAPI.deleteWarehouse(companyId, warehouseId)
      toast.success('Depo silindi')
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Depo silinemedi')
    }
  }
  
  // Sub-warehouse handlers
  const handleAddSubWarehouse = (warehouseId) => {
    setSelectedWarehouseId(warehouseId)
    setSubWarehouseForm({ code: '', name: '', description: '' })
    setShowSubWarehouseModal(true)
  }
  
  const handleSubWarehouseSubmit = async (e) => {
    e.preventDefault()
    try {
      await companiesAPI.addSubWarehouse(selectedWarehouseId, subWarehouseForm)
      toast.success('Alt depo eklendi')
      setShowSubWarehouseModal(false)
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleDeleteSubWarehouse = async (warehouseId, subWarehouseId) => {
    if (!confirm('Bu alt depoyu silmek istediğinize emin misiniz?')) return
    
    try {
      await companiesAPI.deleteSubWarehouse(warehouseId, subWarehouseId)
      toast.success('Alt depo silindi')
      fetchCompanies()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Alt depo silinemedi')
    }
  }
  
  const toggleExpand = (companyId) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId)
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Şirketler</h1>
          <p className="text-dark-400 mt-1">Şirket, depo ve hesap yönetimi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Şirket</span>
        </button>
      </div>
      
      {/* Companies List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <div key={company.id} className="card">
              {/* Company Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(company.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-nox-900/30 flex items-center justify-center text-xl">
                    {countryFlags[company.country_code] || '🏢'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-dark-100">{company.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-dark-500">
                      <span>{company.code}</span>
                      <span>•</span>
                      <span>{company.country}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-4 mr-4 text-sm">
                    <span className="flex items-center gap-1 text-dark-400">
                      <HiOutlineLibrary className="w-4 h-4" />
                      {company.warehouses?.length || 0} Depo
                    </span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                    className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(company); }}
                    className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                  {expandedCompany === company.id ? (
                    <HiOutlineChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <HiOutlineChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedCompany === company.id && (
                <div className="mt-6 pt-6 border-t border-dark-800 space-y-6">
                  {/* Warehouses Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-dark-200 flex items-center gap-2">
                        <HiOutlineLibrary className="w-5 h-5 text-nox-400" />
                        Depolar
                      </h4>
                      <button 
                        onClick={() => handleAddWarehouse(company.id)}
                        className="btn-secondary !py-1.5 !px-3 text-sm"
                      >
                        <HiOutlinePlus className="w-4 h-4" />
                        Depo Ekle
                      </button>
                    </div>
                    
                    {company.warehouses?.length > 0 ? (
                      <div className="space-y-3">
                        {company.warehouses.map((warehouse) => (
                          <div key={warehouse.id} className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                                  <HiOutlineOfficeBuilding className="w-5 h-5 text-dark-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-dark-100">{warehouse.name}</span>
                                    <span className="text-dark-500 text-sm">({warehouse.code})</span>
                                    {warehouse.is_default && (
                                      <span className="badge-success text-xs">Varsayılan</span>
                                    )}
                                  </div>
                                  {warehouse.description && (
                                    <p className="text-sm text-dark-500">{warehouse.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleAddSubWarehouse(warehouse.id)}
                                  className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-nox-400"
                                  title="Alt Depo Ekle"
                                >
                                  <HiOutlinePlus className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEditWarehouse(warehouse, company.id)}
                                  className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-dark-200"
                                >
                                  <HiOutlinePencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteWarehouse(company.id, warehouse.id)}
                                  className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-red-400"
                                >
                                  <HiOutlineTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Sub-warehouses */}
                            {warehouse.sub_warehouses?.length > 0 && (
                              <div className="mt-3 pl-6 space-y-2">
                                {warehouse.sub_warehouses.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between p-2 bg-dark-900/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="text-dark-500">└</span>
                                      <span className="text-dark-300">{sub.name}</span>
                                      <span className="text-dark-500 text-sm">({sub.code})</span>
                                    </div>
                                    <button 
                                      onClick={() => handleDeleteSubWarehouse(warehouse.id, sub.id)}
                                      className="p-1 hover:bg-dark-700 rounded text-dark-500 hover:text-red-400"
                                    >
                                      <HiOutlineTrash className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-xl text-center">
                        Henüz depo eklenmemiş
                      </p>
                    )}
                  </div>
                  
                  {/* Accounts Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-dark-200 flex items-center gap-2">
                        <HiOutlineCreditCard className="w-5 h-5 text-blue-400" />
                        Hesaplar (Kasa/Banka)
                      </h4>
                    </div>
                    
                    {accounts.filter(a => a.company_id === company.id).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {accounts.filter(a => a.company_id === company.id).map((account) => (
                          <div key={account.id} className="p-3 bg-dark-800/50 rounded-lg border border-dark-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-dark-300 font-medium">{account.name}</span>
                              <span className="text-xs text-dark-500">{account.account_type}</span>
                            </div>
                            <p className={`text-lg font-semibold ${account.balance >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                              {parseFloat(account.balance).toLocaleString('tr-TR')} {account.currency}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-xl text-center">
                        Bu şirkete ait hesap yok. Hesaplar sayfasından ekleyebilirsiniz.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Company Modal */}
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
              
              <p className="text-xs text-dark-500 bg-dark-800/50 p-3 rounded-lg">
                💡 Şirketin para birimleri, bağlı hesaplardan (Kasa/Banka) otomatik belirlenir.
              </p>
              
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
      
      {/* Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingWarehouse ? 'Depo Düzenle' : 'Yeni Depo'}
            </h2>
            
            <form onSubmit={handleWarehouseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Depo Kodu</label>
                  <input
                    type="text"
                    value={warehouseForm.code}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                    className="input"
                    placeholder="WH1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Depo Adı</label>
                  <input
                    type="text"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                    className="input"
                    placeholder="Ana Depo"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <input
                  type="text"
                  value={warehouseForm.description}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, description: e.target.value })}
                  className="input"
                  placeholder="Depo açıklaması"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={warehouseForm.is_default}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-nox-500 focus:ring-nox-500"
                />
                <label htmlFor="is_default" className="text-dark-300 text-sm">
                  Varsayılan depo olarak ayarla
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingWarehouse ? 'Güncelle' : 'Ekle'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowWarehouseModal(false)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Sub-warehouse Modal */}
      {showSubWarehouseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Yeni Alt Depo</h2>
            
            <form onSubmit={handleSubWarehouseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Alt Depo Kodu</label>
                  <input
                    type="text"
                    value={subWarehouseForm.code}
                    onChange={(e) => setSubWarehouseForm({ ...subWarehouseForm, code: e.target.value })}
                    className="input"
                    placeholder="SUB1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Alt Depo Adı</label>
                  <input
                    type="text"
                    value={subWarehouseForm.name}
                    onChange={(e) => setSubWarehouseForm({ ...subWarehouseForm, name: e.target.value })}
                    className="input"
                    placeholder="Raf A1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <input
                  type="text"
                  value={subWarehouseForm.description}
                  onChange={(e) => setSubWarehouseForm({ ...subWarehouseForm, description: e.target.value })}
                  className="input"
                  placeholder="Alt depo açıklaması"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Ekle
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowSubWarehouseModal(false)}
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
