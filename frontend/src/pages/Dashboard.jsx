import { useState, useEffect } from 'react'
import { reportsAPI, companiesAPI } from '../services/api'
import { 
  HiOutlineCash, 
  HiOutlineShoppingCart, 
  HiOutlineTrendingUp,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineRefresh,
  HiOutlineOfficeBuilding
} from 'react-icons/hi'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  
  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.list()
      setCompanies(response.data || [])
    } catch (error) {
      console.error('Companies fetch error:', error)
    }
  }
  
  const fetchData = async (companyId = selectedCompany) => {
    setLoading(true)
    try {
      const params = companyId ? { company_id: companyId } : {}
      const response = await reportsAPI.dashboard(params)
      setData(response.data)
    } catch (error) {
      console.error('Dashboard data error:', error)
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchCompanies()
    fetchData()
  }, [])
  
  useEffect(() => {
    fetchData(selectedCompany)
  }, [selectedCompany])
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  // Mock chart data
  const chartData = [
    { name: 'Pzt', sales: 4500, profit: 1200 },
    { name: 'Sal', sales: 5200, profit: 1400 },
    { name: 'Çar', sales: 4800, profit: 1100 },
    { name: 'Per', sales: 6100, profit: 1800 },
    { name: 'Cum', sales: 7200, profit: 2100 },
    { name: 'Cmt', sales: 8500, profit: 2400 },
    { name: 'Paz', sales: 6800, profit: 1900 },
  ]
  
  const pieData = [
    { name: 'PayTR', value: 40 },
    { name: 'GPay', value: 30 },
    { name: 'Havale', value: 20 },
    { name: 'Kripto', value: 10 },
  ]
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-dark-400 mt-1">
            {selectedCompany ? (
              <>
                <HiOutlineOfficeBuilding className="inline-block w-4 h-4 mr-1" />
                {companies.find(c => c.id === parseInt(selectedCompany))?.name || 'Şirket'} için özet
              </>
            ) : (
              'İşletmenizin genel görünümü'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="input h-11 min-w-[200px]"
          >
            <option value="">Tüm Şirketler</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))}
          </select>
          <button onClick={() => fetchData(selectedCompany)} className="btn-secondary h-11">
            <HiOutlineRefresh className="w-5 h-5" />
            <span>Yenile</span>
          </button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card animate-fade-in stagger-1">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-nox-900/30">
              <HiOutlineCash className="w-6 h-6 text-nox-400" />
            </div>
            <span className="badge-success">Bugün</span>
          </div>
          <div className="mt-4">
            <p className="stat-value">{formatCurrency(data?.sales?.today || 0)}</p>
            <p className="stat-label">Bugünkü Satış</p>
          </div>
        </div>
        
        <div className="stat-card animate-fade-in stagger-2">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-blue-900/30">
              <HiOutlineShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
            <span className="badge-info">{data?.sales?.today_count || 0} işlem</span>
          </div>
          <div className="mt-4">
            <p className="stat-value">{formatCurrency(data?.sales?.month || 0)}</p>
            <p className="stat-label">Aylık Satış</p>
          </div>
        </div>
        
        <div className="stat-card animate-fade-in stagger-3">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-purple-900/30">
              <HiOutlineTrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <span className="badge-success">+12.5%</span>
          </div>
          <div className="mt-4">
            <p className="stat-value">{formatCurrency(data?.profit?.month || 0)}</p>
            <p className="stat-label">Aylık Kar</p>
          </div>
        </div>
        
        <div className="stat-card animate-fade-in stagger-4">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-orange-900/30">
              <HiOutlineUsers className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-xs text-dark-500">{data?.counts?.suppliers || 0} tedarikçi</span>
          </div>
          <div className="mt-4">
            <p className="stat-value">{data?.counts?.customers || 0}</p>
            <p className="stat-label">Aktif Müşteri</p>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-dark-100">Haftalık Satış</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-nox-500" />
                <span className="text-dark-400">Satış</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-dark-400">Kar</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Payment Channels */}
        <div className="card">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Ödeme Kanalları</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-dark-400">{item.name}</span>
                <span className="text-sm text-dark-200 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Account Balances */}
      <div className="card">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Hesap Bakiyeleri</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.account_balances && Object.entries(data.account_balances).map(([currency, balance]) => (
            <div key={currency} className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
              <p className="text-sm text-dark-400">{currency}</p>
              <p className="text-xl font-semibold text-dark-100 mt-1">
                {formatCurrency(balance, currency)}
              </p>
            </div>
          ))}
          {(!data?.account_balances || Object.keys(data.account_balances).length === 0) && (
            <div className="col-span-4 text-center py-8 text-dark-500">
              Henüz hesap bakiyesi yok
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

