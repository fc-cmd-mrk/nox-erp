import { useState, useEffect } from 'react'
import { productsAPI, companiesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineSearch,
  HiOutlineCube,
  HiOutlineEye,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineFilter,
  HiOutlineOfficeBuilding,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown
} from 'react-icons/hi'

export default function Products() {
  const [products, setProducts] = useState([])
  const [productStats, setProductStats] = useState([])
  const [companies, setCompanies] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Filters
  const [filter, setFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
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
  
  const fetchProductStats = async () => {
    try {
      const params = {}
      if (companyFilter) params.company_id = companyFilter
      if (warehouseFilter) params.warehouse_id = warehouseFilter
      const response = await productsAPI.statistics(params)
      setProductStats(response.data)
    } catch (error) {
      console.error('Ürün istatistikleri yüklenemedi', error)
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
  
  const fetchWarehouses = async () => {
    try {
      const params = {}
      if (companyFilter) params.company_id = companyFilter
      const response = await productsAPI.warehouses(params)
      setWarehouses(response.data)
    } catch (error) {
      console.error('Depolar yüklenemedi', error)
    }
  }
  
  useEffect(() => {
    fetchProducts()
    fetchCompanies()
  }, [filter])
  
  useEffect(() => {
    fetchProductStats()
    fetchWarehouses()
  }, [companyFilter, warehouseFilter])
  
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
      fetchProductStats()
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
      fetchProductStats()
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
  
  const fetchProductDetail = async (productId) => {
    setDetailLoading(true)
    try {
      const response = await productsAPI.get(productId)
      setSelectedProduct(response.data)
      setShowDetailModal(true)
    } catch (error) {
      toast.error('Ürün detayları yüklenemedi')
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
  
  // Merge products with stats
  const productsWithStats = products.map(product => {
    const stats = productStats.find(s => s.id === product.id) || {}
    return { ...product, ...stats }
  })
  
  // Calculate totals
  const totalProfitUSD = productStats.reduce((sum, p) => sum + (p.total_profit_usd || 0), 0)
  const totalRevenue = productStats.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
  
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
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-nox-900/30">
              <HiOutlineCube className="w-5 h-5 text-nox-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Ürün</p>
              <p className="text-xl font-bold text-dark-100">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-900/30">
              <HiOutlineTrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Kar (USD)</p>
              <p className={`text-xl font-bold font-mono ${totalProfitUSD >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                ${totalProfitUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-900/30">
              <HiOutlineCurrencyDollar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Ciro</p>
              <p className="text-xl font-bold text-dark-100 font-mono">
                {formatCurrency(totalRevenue, 'TRY')}
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
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ürün ara (ad veya model kodu)..."
              className="input !pl-11"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-nox-900/50 border-nox-500' : ''}`}
          >
            <HiOutlineFilter className="w-5 h-5" />
            <span>Filtreler</span>
          </button>
        </div>
        
        {showFilters && (
          <div className="card !p-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Şirket</label>
                <select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value)
                    setWarehouseFilter('')
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
                <label className="label">Depo</label>
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="input"
                  disabled={!companyFilter}
                >
                  <option value="">Tüm Depolar</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setCompanyFilter('')
                    setWarehouseFilter('')
                  }}
                  className="btn-secondary w-full"
                >
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
                <th>Model Kodu</th>
                <th>Ürün Adı</th>
                <th>Son Alış Fiyatı</th>
                <th>Son Satış Fiyatı</th>
                <th>Stok</th>
                <th>Kar (USD)</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {productsWithStats.map((product) => (
                <tr 
                  key={product.id}
                  className="cursor-pointer hover:bg-dark-800/50"
                  onClick={() => fetchProductDetail(product.id)}
                >
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
                    {product.last_purchase_price ? (
                      <div>
                        <p>{formatCurrency(product.last_purchase_price, product.last_purchase_currency || product.default_currency)}</p>
                        {product.last_purchase_date && (
                          <p className="text-xs text-dark-500">
                            {format(new Date(product.last_purchase_date), 'dd MMM', { locale: tr })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-dark-500">-</span>
                    )}
                  </td>
                  <td className="font-mono text-dark-200">
                    {product.last_sale_price ? (
                      <div>
                        <p>{formatCurrency(product.last_sale_price, product.last_sale_currency || product.default_currency)}</p>
                        {product.last_sale_date && (
                          <p className="text-xs text-dark-500">
                            {format(new Date(product.last_sale_date), 'dd MMM', { locale: tr })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-dark-500">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`font-mono ${product.current_stock > 0 ? 'text-nox-400' : 'text-dark-500'}`}>
                      {product.current_stock || 0}
                    </span>
                  </td>
                  <td>
                    <span className={`font-mono font-medium ${
                      (product.total_profit_usd || 0) >= 0 ? 'text-nox-400' : 'text-red-400'
                    }`}>
                      ${(product.total_profit_usd || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => fetchProductDetail(product.id)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-nox-400"
                        title="Detay"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                        title="Düzenle"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                        title="Sil"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-dark-500">
                    Ürün bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Model Kodu *</label>
                <input
                  type="text"
                  value={formData.model_code}
                  onChange={(e) => setFormData({ ...formData, model_code: e.target.value })}
                  className="input font-mono"
                  placeholder="Örn: EP123456789"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">Ürünü tanımlayan benzersiz kod</p>
              </div>
              
              <div>
                <label className="label">Ürün Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Örn: Roblox 100 USD"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">Ürünün görünen adı</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Varsayılan Satış Fiyatı</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.default_sale_price}
                    onChange={(e) => setFormData({ ...formData, default_sale_price: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-dark-500 mt-1">Önerilen satış fiyatı</p>
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
                    <option value="USDT">USDT - Tether</option>
                  </select>
                  <p className="text-xs text-dark-500 mt-1">Varsayılan para birimi</p>
                </div>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Ürün hakkında ek bilgiler..."
                />
                <p className="text-xs text-dark-500 mt-1">Opsiyonel açıklama</p>
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
      
      {/* Detail Modal - Enlarged */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-dark-800 flex items-center justify-center">
                  <HiOutlineCube className="w-6 h-6 text-nox-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-dark-50">{selectedProduct.name}</h2>
                  <p className="text-sm text-dark-400 font-mono">{selectedProduct.model_code}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            {/* Product Info */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-dark-800/30 rounded-xl">
              <div>
                <p className="text-xs text-dark-500">Varsayılan Satış Fiyatı</p>
                <p className="text-dark-200 font-mono">
                  {formatCurrency(selectedProduct.default_sale_price, selectedProduct.default_currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Para Birimi</p>
                <p className="text-dark-200">{selectedProduct.default_currency}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Stok Takibi</p>
                <p className="text-dark-200">{selectedProduct.track_stock ? 'Aktif' : 'Pasif'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Mevcut Stok</p>
                <p className="text-dark-200">{selectedProduct.current_stock} {selectedProduct.unit}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Toplam Satış</p>
                <p className="text-dark-200">{selectedProduct.transaction_items?.length || 0} işlem</p>
              </div>
              {selectedProduct.description && (
                <div className="col-span-5">
                  <p className="text-xs text-dark-500">Açıklama</p>
                  <p className="text-dark-300">{selectedProduct.description}</p>
                </div>
              )}
            </div>
            
            {/* Product Costs */}
            {selectedProduct.costs && selectedProduct.costs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                  <HiOutlineCurrencyDollar className="w-4 h-4" />
                  Maliyet Bilgileri ({selectedProduct.costs.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedProduct.costs.map((cost) => (
                    <div key={cost.id} className="p-3 bg-dark-800/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-300">
                          {cost.is_default && <span className="text-xs text-nox-400 mr-2">(Varsayılan)</span>}
                          Maliyet
                        </span>
                        <span className="font-mono text-dark-100">
                          {formatCurrency(cost.cost, cost.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Transaction Items */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                <HiOutlineDocumentText className="w-4 h-4" />
                İşlem Kayıtları ({selectedProduct.transaction_items?.length || 0})
              </h3>
              {selectedProduct.transaction_items && selectedProduct.transaction_items.length > 0 ? (
                <div className="overflow-x-auto max-h-80">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>İşlem ID</th>
                        <th>Miktar</th>
                        <th>Birim Fiyat</th>
                        <th>Toplam</th>
                        <th>Kar</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.transaction_items.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono text-nox-400">#{item.transaction_id}</td>
                          <td className="text-dark-300">{parseFloat(item.quantity).toLocaleString('tr-TR')}</td>
                          <td className="font-mono text-dark-300">
                            {formatCurrency(item.unit_price, selectedProduct.default_currency)}
                          </td>
                          <td className="font-mono text-dark-200">
                            {formatCurrency(item.total_amount, selectedProduct.default_currency)}
                          </td>
                          <td className={`font-mono ${parseFloat(item.profit) >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                            {formatCurrency(item.profit, selectedProduct.default_currency)}
                          </td>
                          <td className="text-dark-400">
                            {item.created_at && format(new Date(item.created_at), 'dd MMM yyyy', { locale: tr })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-lg">Bu ürüne ait işlem kaydı bulunamadı.</p>
              )}
            </div>
            
            <div className="flex gap-3 pt-6 mt-6 border-t border-dark-700">
              <button 
                onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedProduct)
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
