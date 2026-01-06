import { useState, useEffect } from 'react'
import { transactionsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlineShoppingCart, 
  HiOutlineTruck,
  HiOutlineEye
} from 'react-icons/hi'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  
  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = {}
      if (typeFilter) params.transaction_type = typeFilter
      const response = await transactionsAPI.list(params)
      setTransactions(response.data)
    } catch (error) {
      toast.error('İşlemler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchTransactions()
  }, [typeFilter])
  
  const getTypeBadge = (type) => {
    switch (type) {
      case 'sale': return <span className="badge-success">Satış</span>
      case 'purchase': return <span className="badge-warning">Alım</span>
      case 'sale_return': return <span className="badge-danger">İade (Satış)</span>
      case 'purchase_return': return <span className="badge-info">İade (Alım)</span>
      default: return <span className="badge-info">{type}</span>
    }
  }
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'sale':
      case 'sale_return':
        return <HiOutlineShoppingCart className="w-5 h-5" />
      default:
        return <HiOutlineTruck className="w-5 h-5" />
    }
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">İşlemler</h1>
          <p className="text-dark-400 mt-1">Satış ve alım işlemleri</p>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tüm İşlemler</option>
          <option value="sale">Satışlar</option>
          <option value="purchase">Alımlar</option>
        </select>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Toplam İşlem</p>
          <p className="text-2xl font-bold text-dark-50 mt-1">{transactions.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Toplam Satış</p>
          <p className="text-2xl font-bold text-nox-400 mt-1">
            {formatCurrency(
              transactions
                .filter(t => t.transaction_type === 'sale')
                .reduce((sum, t) => sum + parseFloat(t.total_amount), 0)
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Toplam Alım</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">
            {formatCurrency(
              transactions
                .filter(t => t.transaction_type === 'purchase')
                .reduce((sum, t) => sum + parseFloat(t.total_amount), 0)
            )}
          </p>
        </div>
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
                <th>İşlem No</th>
                <th>Tip</th>
                <th>Tarih</th>
                <th>Kalem Sayısı</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="font-mono text-nox-400">{transaction.transaction_no}</td>
                  <td>{getTypeBadge(transaction.transaction_type)}</td>
                  <td className="text-dark-400">
                    {transaction.transaction_date && format(
                      new Date(transaction.transaction_date),
                      'dd MMM yyyy HH:mm',
                      { locale: tr }
                    )}
                  </td>
                  <td className="text-dark-300">{transaction.items?.length || 0} kalem</td>
                  <td className="font-mono font-medium text-dark-100">
                    {formatCurrency(transaction.total_amount, transaction.currency)}
                  </td>
                  <td>
                    {transaction.is_paid ? (
                      <span className="badge-success">Ödendi</span>
                    ) : (
                      <span className="badge-warning">Bekliyor</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedTransaction(transaction)}
                      className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-dark-500">
                    İşlem bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-dark-50">İşlem Detayı</h2>
                <p className="text-dark-400 font-mono">{selectedTransaction.transaction_no}</p>
              </div>
              {getTypeBadge(selectedTransaction.transaction_type)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-dark-500">Tarih</p>
                <p className="text-dark-200">
                  {selectedTransaction.transaction_date && format(
                    new Date(selectedTransaction.transaction_date),
                    'dd MMMM yyyy HH:mm',
                    { locale: tr }
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Durum</p>
                <p className="text-dark-200">
                  {selectedTransaction.is_paid ? 'Ödendi' : 'Ödeme Bekliyor'}
                </p>
              </div>
            </div>
            
            {/* Items */}
            <div className="border border-dark-800 rounded-xl overflow-hidden mb-6">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Birim Fiyat</th>
                    <th>Maliyet</th>
                    <th>Kar</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="text-dark-200">{item.description || `Ürün #${item.product_id}`}</td>
                      <td className="text-dark-400">{item.quantity}</td>
                      <td className="font-mono text-dark-200">
                        {formatCurrency(item.unit_price, selectedTransaction.currency)}
                      </td>
                      <td className="font-mono text-dark-400">
                        {formatCurrency(item.cost_price, selectedTransaction.currency)}
                      </td>
                      <td className={`font-mono ${parseFloat(item.profit) >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                        {formatCurrency(item.profit, selectedTransaction.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-dark-400">
                  <span>Ara Toplam:</span>
                  <span className="font-mono">{formatCurrency(selectedTransaction.subtotal, selectedTransaction.currency)}</span>
                </div>
                {parseFloat(selectedTransaction.discount_amount) > 0 && (
                  <div className="flex justify-between text-dark-400">
                    <span>İndirim:</span>
                    <span className="font-mono text-red-400">-{formatCurrency(selectedTransaction.discount_amount, selectedTransaction.currency)}</span>
                  </div>
                )}
                {parseFloat(selectedTransaction.tax_amount) > 0 && (
                  <div className="flex justify-between text-dark-400">
                    <span>Vergi:</span>
                    <span className="font-mono">{formatCurrency(selectedTransaction.tax_amount, selectedTransaction.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-dark-100 pt-2 border-t border-dark-700">
                  <span>Toplam:</span>
                  <span className="font-mono">{formatCurrency(selectedTransaction.total_amount, selectedTransaction.currency)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="btn-secondary"
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

