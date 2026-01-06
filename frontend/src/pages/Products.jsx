import { useState, useEffect } from 'react'
import { productsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineCube
} from 'react-icons/hi'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [filter, setFilter] = useState('')
  const [formData, setFormData] = useState({
    model_code: '',
    name: '',
    default_sale_price: '',
    default_currency: 'TRY',
    description: ''
  })
  
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.search = filter
      const response = await productsAPI.list(params)
      setProducts(response.data)
    } catch (error) {
      toast.error('Ürünler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchProducts()
  }, [filter])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData, default_sale_price: parseFloat(formData.default_sale_price) || 0 }
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, data)
        toast.success('Ürün güncellendi')
      } else {
        await productsAPI.create(data)
        toast.success('Ürün oluşturuldu')
      }
      setShowModal(false)
      resetForm()
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      model_code: product.model_code,
      name: product.name,
      default_sale_price: product.default_sale_price?.toString() || '',
      default_currency: product.default_currency,
      description: product.description || ''
    })
    setShowModal(true)
  }
  
  const handleDelete = async (product) => {
    if (!confirm(`${product.name} ürününü silmek istediğinize emin misiniz?`)) return
    
    try {
      await productsAPI.delete(product.id)
      toast.success('Ürün silindi')
      fetchProducts()
    } catch (error) {
      toast.error('Ürün silinemedi')
    }
  }
  
  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      model_code: '',
      name: '',
      default_sale_price: '',
      default_currency: 'TRY',
      description: ''
    })
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Ürünler</h1>
          <p className="text-dark-400 mt-1">Ürün kataloğu yönetimi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Ürün</span>
        </button>
      </div>
      
      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Ürün ara (ad veya model kodu)..."
          className="input pl-11"
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
                <th>Model Kodu</th>
                <th>Ürün Adı</th>
                <th>Satış Fiyatı</th>
                <th>Para Birimi</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="font-mono text-nox-400">{product.model_code}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                        <HiOutlineCube className="w-5 h-5 text-dark-500" />
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-dark-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-dark-200">
                    {parseFloat(product.default_sale_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="badge-info">{product.default_currency}</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-dark-500">
                    Ürün bulunamadı
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
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Model Kodu</label>
                <input
                  type="text"
                  value={formData.model_code}
                  onChange={(e) => setFormData({ ...formData, model_code: e.target.value })}
                  className="input font-mono"
                  placeholder="ep123456789"
                  required
                />
              </div>
              
              <div>
                <label className="label">Ürün Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Roblox 100 USD"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Satış Fiyatı</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.default_sale_price}
                    onChange={(e) => setFormData({ ...formData, default_sale_price: e.target.value })}
                    className="input"
                    placeholder="0.00"
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
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Ürün açıklaması..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Güncelle' : 'Oluştur'}
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

