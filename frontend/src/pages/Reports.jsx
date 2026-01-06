import { useState, useEffect } from 'react'
import { reportsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlineTrendingUp,
  HiOutlineDownload
} from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Reports() {
  const [profitData, setProfitData] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profit')
  
  const fetchProfitAnalysis = async () => {
    setLoading(true)
    try {
      const response = await reportsAPI.profitAnalysis()
      setProfitData(response.data)
    } catch (error) {
      toast.error('Veriler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchProfitAnalysis()
  }, [])
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(value)
  }
  
  const topProducts = profitData.slice(0, 10)
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Raporlar</h1>
          <p className="text-dark-400 mt-1">Kar-zarar ve analiz raporları</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-800 pb-4">
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'profit' 
              ? 'bg-nox-900/50 text-nox-400' 
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Ürün Kar Analizi
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'summary' 
              ? 'bg-nox-900/50 text-nox-400' 
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Özet Rapor
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'profit' ? (
        <>
          {/* Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">En Karlı Ürünler (Top 10)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11}
                    width={150}
                    tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="total_profit" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Table */}
          <div className="card">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Detaylı Kar Analizi</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Model Kodu</th>
                    <th>Ürün Adı</th>
                    <th className="text-right">Satış Adedi</th>
                    <th className="text-right">Gelir</th>
                    <th className="text-right">Maliyet</th>
                    <th className="text-right">Kar</th>
                    <th className="text-right">Kar Marjı</th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.map((product) => (
                    <tr key={product.product_id}>
                      <td className="font-mono text-nox-400">{product.model_code}</td>
                      <td className="max-w-xs truncate">{product.name}</td>
                      <td className="text-right text-dark-300">{product.total_quantity}</td>
                      <td className="text-right font-mono text-dark-200">{formatCurrency(product.total_revenue)}</td>
                      <td className="text-right font-mono text-dark-400">{formatCurrency(product.total_cost)}</td>
                      <td className={`text-right font-mono font-medium ${product.total_profit >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                        {formatCurrency(product.total_profit)}
                      </td>
                      <td className={`text-right font-mono ${product.profit_margin >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                        %{product.profit_margin.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  {profitData.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-dark-500">
                        Henüz veri yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Toplam Kar</h3>
            <p className="text-4xl font-bold text-nox-400">
              {formatCurrency(profitData.reduce((sum, p) => sum + p.total_profit, 0))}
            </p>
            <p className="text-sm text-dark-500 mt-2">Bu dönem</p>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Toplam Gelir</h3>
            <p className="text-4xl font-bold text-blue-400">
              {formatCurrency(profitData.reduce((sum, p) => sum + p.total_revenue, 0))}
            </p>
            <p className="text-sm text-dark-500 mt-2">Bu dönem</p>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Toplam Maliyet</h3>
            <p className="text-4xl font-bold text-orange-400">
              {formatCurrency(profitData.reduce((sum, p) => sum + p.total_cost, 0))}
            </p>
            <p className="text-sm text-dark-500 mt-2">Bu dönem</p>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Ortalama Kar Marjı</h3>
            <p className="text-4xl font-bold text-purple-400">
              %{(profitData.reduce((sum, p) => sum + p.profit_margin, 0) / (profitData.length || 1)).toFixed(1)}
            </p>
            <p className="text-sm text-dark-500 mt-2">Bu dönem</p>
          </div>
        </div>
      )}
    </div>
  )
}

