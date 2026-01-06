import { useState, useEffect } from 'react'
import { paymentsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus,
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineCreditCard
} from 'react-icons/hi'

const channelLabels = {
  cash: 'Nakit',
  bank_transfer: 'Havale/EFT',
  credit_card: 'Kredi Kartı',
  paytr: 'PayTR',
  gpay: 'GPay',
  crypto: 'Kripto',
  advance: 'Avans',
  other: 'Diğer'
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    payment_type: 'incoming',
    payment_channel: 'bank_transfer',
    currency: 'TRY',
    amount: '',
    description: ''
  })
  
  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = {}
      if (typeFilter) params.payment_type = typeFilter
      if (channelFilter) params.payment_channel = channelFilter
      const response = await paymentsAPI.list(params)
      setPayments(response.data)
    } catch (error) {
      toast.error('Ödemeler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchPayments()
  }, [typeFilter, channelFilter])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData, amount: parseFloat(formData.amount) }
      await paymentsAPI.create(data)
      toast.success('Ödeme kaydedildi')
      setShowModal(false)
      setFormData({
        payment_type: 'incoming',
        payment_channel: 'bank_transfer',
        currency: 'TRY',
        amount: '',
        description: ''
      })
      fetchPayments()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  const totalIncoming = payments
    .filter(p => p.payment_type === 'incoming')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  const totalOutgoing = payments
    .filter(p => p.payment_type === 'outgoing')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Ödemeler</h1>
          <p className="text-dark-400 mt-1">Tahsilat ve ödeme takibi</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Ödeme</span>
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-nox-900/30">
              <HiOutlineArrowDown className="w-5 h-5 text-nox-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Tahsilat</p>
              <p className="text-xl font-bold text-nox-400">{formatCurrency(totalIncoming)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-900/30">
              <HiOutlineArrowUp className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Toplam Ödeme</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalOutgoing)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-900/30">
              <HiOutlineCreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Net Akış</p>
              <p className={`text-xl font-bold ${totalIncoming - totalOutgoing >= 0 ? 'text-nox-400' : 'text-red-400'}`}>
                {formatCurrency(totalIncoming - totalOutgoing)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tüm Tipler</option>
          <option value="incoming">Tahsilat</option>
          <option value="outgoing">Ödeme</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="">Tüm Kanallar</option>
          {Object.entries(channelLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
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
                <th>Ödeme No</th>
                <th>Tip</th>
                <th>Kanal</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-mono text-nox-400">{payment.payment_no}</td>
                  <td>
                    {payment.payment_type === 'incoming' ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        <HiOutlineArrowDown className="w-3 h-3" />
                        Tahsilat
                      </span>
                    ) : (
                      <span className="badge-danger flex items-center gap-1 w-fit">
                        <HiOutlineArrowUp className="w-3 h-3" />
                        Ödeme
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge-info">{channelLabels[payment.payment_channel] || payment.payment_channel}</span>
                  </td>
                  <td className="text-dark-400">
                    {payment.payment_date && format(
                      new Date(payment.payment_date),
                      'dd MMM yyyy HH:mm',
                      { locale: tr }
                    )}
                  </td>
                  <td className={`font-mono font-medium ${payment.payment_type === 'incoming' ? 'text-nox-400' : 'text-red-400'}`}>
                    {payment.payment_type === 'incoming' ? '+' : '-'}
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="text-dark-400 max-w-xs truncate">{payment.description || '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-dark-500">
                    Ödeme bulunamadı
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
            <h2 className="text-xl font-semibold text-dark-50 mb-6">Yeni Ödeme</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tip</label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                    className="input"
                  >
                    <option value="incoming">Tahsilat</option>
                    <option value="outgoing">Ödeme</option>
                  </select>
                </div>
                <div>
                  <label className="label">Kanal</label>
                  <select
                    value={formData.payment_channel}
                    onChange={(e) => setFormData({ ...formData, payment_channel: e.target.value })}
                    className="input"
                  >
                    {Object.entries(channelLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tutar</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="label">Para Birimi</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="label">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="2"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Kaydet
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

