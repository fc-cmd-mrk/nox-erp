import { useState, useEffect } from 'react'
import { productsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCollection,
  HiOutlineCheckCircle,
  HiOutlineXCircle
} from 'react-icons/hi'

export default function ProductGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  })
  
  const fetchGroups = async () => {
    setLoading(true)
    try {
      const response = await productsAPI.groups()
      setGroups(response.data || [])
    } catch (error) {
      console.error('Ürün grupları yüklenemedi', error)
      toast.error('Ürün grupları yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchGroups()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.code || !formData.name) {
      toast.error('Kod ve Ad alanları zorunludur')
      return
    }
    
    try {
      if (editingGroup) {
        await productsAPI.updateGroup(editingGroup.id, formData)
        toast.success('Ürün grubu güncellendi')
      } else {
        await productsAPI.createGroup(formData)
        toast.success('Ürün grubu oluşturuldu')
      }
      
      setShowModal(false)
      resetForm()
      fetchGroups()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (group) => {
    setEditingGroup(group)
    setFormData({
      code: group.code,
      name: group.name,
      description: group.description || '',
      is_active: group.is_active
    })
    setShowModal(true)
  }
  
  const handleDelete = async (group) => {
    if (!confirm(`"${group.name}" grubunu silmek istediğinize emin misiniz?`)) return
    
    try {
      await productsAPI.deleteGroup(group.id)
      toast.success('Ürün grubu silindi')
      fetchGroups()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Silme işlemi başarısız')
    }
  }
  
  const resetForm = () => {
    setEditingGroup(null)
    setFormData({
      code: '',
      name: '',
      description: '',
      is_active: true
    })
  }
  
  // Filter groups
  const filteredGroups = groups.filter(group => {
    if (!searchFilter) return true
    const search = searchFilter.toLowerCase()
    return (
      group.name.toLowerCase().includes(search) ||
      group.code.toLowerCase().includes(search) ||
      (group.description && group.description.toLowerCase().includes(search))
    )
  })
  
  // Count products per group
  const getProductCount = (group) => {
    return group.products?.length || 0
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Ürün Grupları</h1>
          <p className="text-dark-400 mt-1">Ürünlerinizi gruplandırın ve yönetin</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary h-11 px-5"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Grup</span>
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-nox-900/30">
              <HiOutlineCollection className="w-5 h-5 text-nox-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Grup</p>
              <p className="text-xl font-bold text-dark-50">{groups.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-900/30">
              <HiOutlineCheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Aktif Gruplar</p>
              <p className="text-xl font-bold text-green-400">
                {groups.filter(g => g.is_active).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-900/30">
              <HiOutlineXCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Pasif Gruplar</p>
              <p className="text-xl font-bold text-red-400">
                {groups.filter(g => !g.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none z-10" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Grup ara..."
          className="input !pl-11 w-full max-w-md"
        />
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
                <th>Açıklama</th>
                <th>Ürün Sayısı</th>
                <th>Durum</th>
                <th>Oluşturulma</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id}>
                  <td className="font-mono text-nox-400">{group.code}</td>
                  <td className="font-medium text-dark-100">{group.name}</td>
                  <td className="text-dark-400 max-w-xs truncate">{group.description || '-'}</td>
                  <td>
                    <span className="badge-info">{getProductCount(group)} ürün</span>
                  </td>
                  <td>
                    {group.is_active ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        <HiOutlineCheckCircle className="w-3 h-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="badge-danger flex items-center gap-1 w-fit">
                        <HiOutlineXCircle className="w-3 h-3" />
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="text-dark-400">
                    {group.created_at && format(
                      new Date(group.created_at),
                      'dd MMM yyyy',
                      { locale: tr }
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEdit(group)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-nox-400"
                        title="Düzenle"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(group)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                        title="Sil"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-dark-500">
                    {searchFilter ? 'Arama sonucu bulunamadı' : 'Henüz ürün grubu oluşturulmamış'}
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
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-nox-900/30">
                  <HiOutlineCollection className="w-5 h-5 text-nox-400" />
                </div>
                <h2 className="text-xl font-semibold text-dark-50">
                  {editingGroup ? 'Ürün Grubu Düzenle' : 'Yeni Ürün Grubu'}
                </h2>
              </div>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                className="p-2 hover:bg-dark-800 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Grup Kodu *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="input"
                    placeholder="GRP01"
                    required
                  />
                  <p className="text-xs text-dark-500 mt-1">Benzersiz grup kodu</p>
                </div>
                <div>
                  <label className="label">Grup Adı *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Dijital Ürünler"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Grup hakkında kısa açıklama..."
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-nox-500 focus:ring-nox-500"
                />
                <label htmlFor="is_active" className="text-dark-200">Aktif</label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingGroup ? 'Güncelle' : 'Oluştur'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); resetForm(); }}
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

