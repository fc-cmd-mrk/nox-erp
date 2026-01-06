import { useState, useEffect } from 'react'
import { reportsAPI, companiesAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlineTrendingUp,
  HiOutlineDownload,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineCube,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar
} from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function Reports() {
  const [profitData, setProfitData] = useState([])
  const [profitLossData, setProfitLossData] = useState(null)
  const [companyProfitLoss, setCompanyProfitLoss] = useState(null)
  const [currencySummary, setCurrencySummary] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profit-loss')
  
  // Filters
  const [filters, setFilters] = useState({
    company_id: '',
    currency: '',
    group_by: 'product',
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  })
  
  const fetchData = async () => {
    setLoading(true)
    try {
      const [companiesRes] = await Promise.all([
        companiesAPI.list()
      ])
      setCompanies(companiesRes.data)
      
      if (activeTab === 'profit') {
        const response = await reportsAPI.profitAnalysis(filters)
        setProfitData(response.data)
      } else if (activeTab === 'profit-loss') {
        const response = await reportsAPI.profitLoss(filters)
        setProfitLossData(response.data)
      } else if (activeTab === 'company') {
        const response = await reportsAPI.companyProfitLoss(filters)
        setCompanyProfitLoss(response.data)
      } else if (activeTab === 'currency') {
        const response = await reportsAPI.currencySummary(filters)
        setCurrencySummary(response.data)
      }
    } catch (error) {
      console.error('Report fetch error:', error)
      toast.error('Veriler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchData()
  }, [activeTab, filters])
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 0
    }).format(value)
  }
  
  const tabs = [
    { id: 'profit-loss', label: 'Kar/Zarar Analizi', icon: HiOutlineTrendingUp },
    { id: 'company', label: 'Şirket Bazlı', icon: HiOutlineOfficeBuilding },
    { id: 'currency', label: 'Döviz Bazlı', icon: HiOutlineCurrencyDollar },
    { id: 'profit', label: 'Ürün Karlılığı', icon: HiOutlineCube }
  ]
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Kar/Zarar Raporları</h1>
          <p className="text-dark-400 mt-1">Şirket, cari, ürün ve döviz bazlı analizler</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-dark-800 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-nox-900/50 text-nox-400' 
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-dark-500 mb-1">Başlangıç</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="input !py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-500 mb-1">Bitiş</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="input !py-1.5 text-sm"
            />
          </div>
          {activeTab === 'profit-loss' && (
            <>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Şirket</label>
                <select
                  value={filters.company_id}
                  onChange={(e) => setFilters(prev => ({ ...prev, company_id: e.target.value }))}
                  className="input !py-1.5 text-sm"
                >
                  <option value="">Tümü</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Para Birimi</label>
                <select
                  value={filters.currency}
                  onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                  className="input !py-1.5 text-sm"
                >
                  <option value="">Tümü</option>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Grupla</label>
                <select
                  value={filters.group_by}
                  onChange={(e) => setFilters(prev => ({ ...prev, group_by: e.target.value }))}
                  className="input !py-1.5 text-sm"
                >
                  <option value="product">Ürün</option>
                  <option value="contact">Cari</option>
                  <option value="company">Şirket</option>
                  <option value="date">Tarih</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Profit/Loss Tab */}
          {activeTab === 'profit-loss' && profitLossData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Gelir (TRY)</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {formatCurrency(profitLossData.summary.total_revenue_try)}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Maliyet (TRY)</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">
                    {formatCurrency(profitLossData.summary.total_cost_try)}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Kar (TRY)</p>
                  <p className={`text-2xl font-bold mt-1 ${profitLossData.summary.total_profit_try >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                    {formatCurrency(profitLossData.summary.total_profit_try)}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-dark-400">Kar Marjı</p>
                  <p className={`text-2xl font-bold mt-1 ${profitLossData.summary.profit_margin >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                    %{profitLossData.summary.profit_margin.toFixed(1)}
                  </p>
                </div>
              </div>
              
              {/* By Currency */}
              {Object.keys(profitLossData.by_currency).length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-dark-100 mb-4">Para Birimi Bazlı</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(profitLossData.by_currency).map(([currency, data]) => (
                      <div key={currency} className="p-4 bg-dark-800/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-dark-200">{currency}</span>
                          <span className="text-sm text-dark-500">{data.count} işlem</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-dark-400">Gelir:</span>
                            <span className="text-blue-400 font-mono">{formatCurrency(data.revenue, currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-400">Maliyet:</span>
                            <span className="text-orange-400 font-mono">{formatCurrency(data.cost, currency)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-dark-700">
                            <span className="text-dark-400">Kar:</span>
                            <span className={`font-mono font-semibold ${data.profit >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                              {formatCurrency(data.profit, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Details Table */}
              <div className="card">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">
                  Detaylı Analiz ({
                    filters.group_by === 'product' ? 'Ürün' :
                    filters.group_by === 'contact' ? 'Cari' :
                    filters.group_by === 'company' ? 'Şirket' : 'Tarih'
                  } Bazlı)
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{filters.group_by === 'date' ? 'Tarih' : 'Ad'}</th>
                        {filters.group_by !== 'date' && <th>Kod</th>}
                        <th className="text-right">Gelir (TRY)</th>
                        <th className="text-right">Maliyet (TRY)</th>
                        <th className="text-right">Kar (TRY)</th>
                        <th className="text-right">Marj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitLossData.details.map((item, index) => (
                        <tr key={index}>
                          <td className="text-dark-200">
                            {filters.group_by === 'date' ? item.date : item.name}
                          </td>
                          {filters.group_by !== 'date' && (
                            <td className="font-mono text-nox-400">{item.code || '-'}</td>
                          )}
                          <td className="text-right font-mono text-dark-300">{formatCurrency(item.revenue)}</td>
                          <td className="text-right font-mono text-dark-400">{formatCurrency(item.cost)}</td>
                          <td className={`text-right font-mono font-medium ${item.profit >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                            {formatCurrency(item.profit)}
                          </td>
                          <td className={`text-right font-mono ${item.profit_margin >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                            %{item.profit_margin.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      {profitLossData.details.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-dark-500">
                            Veri bulunamadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Company Tab */}
          {activeTab === 'company' && companyProfitLoss && (
            <div className="space-y-6">
              {/* Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {formatCurrency(companyProfitLoss.totals.total_revenue_try)}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Maliyet</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">
                    {formatCurrency(companyProfitLoss.totals.total_cost_try)}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-dark-400">Toplam Kar</p>
                  <p className={`text-2xl font-bold mt-1 ${companyProfitLoss.totals.total_profit_try >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                    {formatCurrency(companyProfitLoss.totals.total_profit_try)}
                  </p>
                </div>
              </div>
              
              {/* Chart */}
              {companyProfitLoss.companies.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-dark-100 mb-4">Şirket Karlılık Grafiği</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={companyProfitLoss.companies}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="company_name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue_try" name="Gelir" fill="#3b82f6" />
                        <Bar dataKey="profit_try" name="Kar" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {/* Table */}
              <div className="card">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Şirket Detayları</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Şirket</th>
                        <th>Ülke</th>
                        <th className="text-right">Satış</th>
                        <th className="text-right">Alım</th>
                        <th className="text-right">Gelir (TRY)</th>
                        <th className="text-right">Kar (TRY)</th>
                        <th className="text-right">Marj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyProfitLoss.companies.map(company => (
                        <tr key={company.company_id}>
                          <td>
                            <div>
                              <span className="font-medium text-dark-200">{company.company_name}</span>
                              <span className="text-dark-500 ml-2">({company.company_code})</span>
                            </div>
                          </td>
                          <td className="text-dark-400">{company.country}</td>
                          <td className="text-right text-dark-300">{company.sales_count}</td>
                          <td className="text-right text-dark-300">{company.purchase_count}</td>
                          <td className="text-right font-mono text-dark-200">{formatCurrency(company.revenue_try)}</td>
                          <td className={`text-right font-mono font-medium ${company.profit_try >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                            {formatCurrency(company.profit_try)}
                          </td>
                          <td className={`text-right font-mono ${company.profit_margin >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                            %{company.profit_margin.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Currency Tab */}
          {activeTab === 'currency' && currencySummary && (
            <div className="space-y-6">
              {/* Currency Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {currencySummary.currencies.map((curr, index) => (
                  <div key={curr.currency} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-dark-100">{curr.currency}</span>
                      {curr.rate_to_try && (
                        <span className="text-sm text-dark-500">1 = {curr.rate_to_try.toFixed(4)} TRY</span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">Satış:</span>
                        <span className="text-nox-400 font-mono">{formatCurrency(curr.sales, curr.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Alım:</span>
                        <span className="text-orange-400 font-mono">{formatCurrency(curr.purchases, curr.currency)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-dark-700">
                        <span className="text-dark-400">Net (TRY):</span>
                        <span className={`font-mono font-semibold ${curr.net_try >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                          {formatCurrency(curr.net_try)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Exchange Rates */}
              <div className="card">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Güncel Kurlar</h3>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(currencySummary.exchange_rates)
                    .filter(([curr]) => curr !== 'TRY')
                    .map(([curr, rate]) => (
                      <div key={curr} className="px-4 py-2 bg-dark-800/50 rounded-lg">
                        <span className="text-dark-400">{curr}/TRY:</span>
                        <span className="text-nox-400 font-mono ml-2">{rate.toFixed(4)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Product Tab */}
          {activeTab === 'profit' && (
            <>
              {/* Chart */}
              <div className="card">
                <h2 className="text-lg font-semibold text-dark-100 mb-4">En Karlı Ürünler (Top 10)</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitData.slice(0, 10)} layout="vertical">
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
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
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
          )}
        </>
      )}
    </div>
  )
}
