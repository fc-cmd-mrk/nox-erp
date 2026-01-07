import { useState, useEffect } from 'react'
import { accountsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { 
  HiOutlinePlus,
  HiOutlineCash,
  HiOutlineLibrary,
  HiOutlineCurrencyDollar,
  HiOutlineCreditCard,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineX,
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineSwitchHorizontal
} from 'react-icons/hi'

const typeIcons = {
  cash: HiOutlineCash,
  bank: HiOutlineLibrary,
  crypto: HiOutlineCurrencyDollar,
  payment_gateway: HiOutlineCreditCard
}

const typeLabels = {
  cash: 'Kasa',
  bank: 'Banka',
  crypto: 'Kripto',
  payment_gateway: 'Ödeme Sistemi'
}

const transactionTypeLabels = {
  deposit: { label: 'Giriş', icon: HiOutlineArrowDown, color: 'text-nox-400' },
  withdrawal: { label: 'Çıkış', icon: HiOutlineArrowUp, color: 'text-red-400' },
  transfer_in: { label: 'Transfer (Gelen)', icon: HiOutlineSwitchHorizontal, color: 'text-blue-400' },
  transfer_out: { label: 'Transfer (Giden)', icon: HiOutlineSwitchHorizontal, color: 'text-orange-400' }
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: 'bank',
    currency: 'TRY',
    company_id: 1,
    bank_name: '',
    iban: ''
  })
  
  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const response = await accountsAPI.list()
      setAccounts(response.data)
    } catch (error) {
      toast.error('Hesaplar yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchAccounts()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAccount) {
        await accountsAPI.update(editingAccount.id, formData)
        toast.success('Hesap güncellendi')
      } else {
        await accountsAPI.create(formData)
        toast.success('Hesap oluşturuldu')
      }
      setShowModal(false)
      resetForm()
      fetchAccounts()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (account) => {
    setEditingAccount(account)
    setFormData({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      currency: account.currency,
      company_id: account.company_id,
      bank_name: account.bank_name || '',
      iban: account.iban || ''
    })
    setShowModal(true)
  }
  
  const handleDelete = async (account) => {
    if (!confirm(`${account.name} hesabını silmek istediğinize emin misiniz?`)) return
    
    try {
      await accountsAPI.delete(account.id)
      toast.success('Hesap silindi')
      fetchAccounts()
    } catch (error) {
      toast.error('Hesap silinemedi')
    }
  }
  
  const resetForm = () => {
    setEditingAccount(null)
    setFormData({
      code: '',
      name: '',
      account_type: 'bank',
      currency: 'TRY',
      company_id: 1,
      bank_name: '',
      iban: ''
    })
  }
  
  const fetchAccountDetail = async (accountId) => {
    setDetailLoading(true)
    try {
      const response = await accountsAPI.get(accountId)
      setSelectedAccount(response.data)
      setShowDetailModal(true)
    } catch (error) {
      toast.error('Hesap detayları yüklenemedi')
    }
    setDetailLoading(false)
  }
  
  const formatCurrency = (value, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: 2
    }).format(value)
  }
  
  // Group accounts by type
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.account_type
    if (!groups[type]) groups[type] = []
    groups[type].push(account)
    return groups
  }, {})
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Hesaplar</h1>
          <p className="text-dark-400 mt-1">Kasa, banka ve kripto hesapları</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Hesap</span>
        </button>
      </div>
      
      {/* Accounts by Type */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAccounts).map(([type, typeAccounts]) => {
            const Icon = typeIcons[type] || HiOutlineCash
            const totalBalance = typeAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)
            
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-dark-800">
                      <Icon className="w-5 h-5 text-nox-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-dark-100">
                      {typeLabels[type] || type}
                    </h2>
                    <span className="text-sm text-dark-500">({typeAccounts.length})</span>
                  </div>
                  <p className="text-lg font-mono font-semibold text-dark-200">
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeAccounts.map((account) => (
                    <div 
                      key={account.id} 
                      className="card group cursor-pointer hover:border-nox-500/30 transition-colors"
                      onClick={() => fetchAccountDetail(account.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-dark-100">{account.name}</p>
                          <p className="text-sm text-dark-500 font-mono">{account.code}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => fetchAccountDetail(account.id)}
                            className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-nox-400"
                            title="Detay"
                          >
                            <HiOutlineEye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEdit(account)}
                            className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                            title="Düzenle"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(account)}
                            className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                            title="Sil"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className={`text-2xl font-bold font-mono ${
                          parseFloat(account.balance) >= 0 ? 'text-nox-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                        <p className="text-sm text-dark-500 mt-1">{account.currency}</p>
                      </div>
                      
                      {account.bank_name && (
                        <p className="text-sm text-dark-400 mt-3">{account.bank_name}</p>
                      )}
                      {account.iban && (
                        <p className="text-xs text-dark-500 font-mono mt-1">{account.iban}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          
          {Object.keys(groupedAccounts).length === 0 && (
            <div className="text-center py-12 text-dark-500">
              Henüz hesap tanımlanmamış
            </div>
          )}
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingAccount ? 'Hesap Düzenle' : 'Yeni Hesap'}
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
                    required
                  />
                </div>
                <div>
                  <label className="label">Tip</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="input"
                  >
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="label">Hesap Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
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
                  <option value="TRY">TRY - Türk Lirası</option>
                  <option value="USD">USD - Dolar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USDT">USDT - Tether</option>
                </select>
              </div>
              
              {formData.account_type === 'bank' && (
                <>
                  <div>
                    <label className="label">Banka Adı</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">IBAN</label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      className="input font-mono"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingAccount ? 'Güncelle' : 'Oluştur'}
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
      
      {/* Detail Modal - Full Screen Resizable */}
      {showDetailModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="card w-[95vw] h-[90vh] min-w-[600px] min-h-[400px] overflow-auto animate-fade-in resize relative" style={{ resize: 'both', maxWidth: '95vw', maxHeight: '95vh' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = typeIcons[selectedAccount.account_type] || HiOutlineCash
                  return (
                    <div className="p-2 rounded-lg bg-dark-800">
                      <Icon className="w-5 h-5 text-nox-400" />
                    </div>
                  )
                })()}
                <div>
                  <h2 className="text-xl font-semibold text-dark-50">{selectedAccount.name}</h2>
                  <p className="text-sm text-dark-400">{selectedAccount.code} • {typeLabels[selectedAccount.account_type]}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            {/* Balance */}
            <div className="p-4 bg-dark-800/30 rounded-xl mb-6">
              <p className="text-sm text-dark-500 mb-1">Mevcut Bakiye</p>
              <p className={`text-3xl font-bold font-mono ${
                parseFloat(selectedAccount.balance) >= 0 ? 'text-nox-400' : 'text-red-400'
              }`}>
                {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </p>
              <p className="text-sm text-dark-500 mt-2">{selectedAccount.currency}</p>
            </div>
            
            {/* Account Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-dark-800/30 rounded-xl">
              <div>
                <p className="text-xs text-dark-500">Tip</p>
                <p className="text-dark-200">{typeLabels[selectedAccount.account_type]}</p>
              </div>
              {selectedAccount.bank_name && (
                <div>
                  <p className="text-xs text-dark-500">Banka</p>
                  <p className="text-dark-200">{selectedAccount.bank_name}</p>
                </div>
              )}
              {selectedAccount.iban && (
                <div className="col-span-2">
                  <p className="text-xs text-dark-500">IBAN</p>
                  <p className="text-dark-200 font-mono text-sm">{selectedAccount.iban}</p>
                </div>
              )}
              {selectedAccount.wallet_address && (
                <div className="col-span-2">
                  <p className="text-xs text-dark-500">Cüzdan Adresi</p>
                  <p className="text-dark-200 font-mono text-xs truncate">{selectedAccount.wallet_address}</p>
                </div>
              )}
            </div>
            
            {/* Transactions */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                <HiOutlineSwitchHorizontal className="w-4 h-4" />
                Hesap Hareketleri ({selectedAccount.transactions?.length || 0})
              </h3>
              {selectedAccount.transactions && selectedAccount.transactions.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Tip</th>
                        <th>Tutar</th>
                        <th>Bakiye Sonrası</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.transactions.map((trans) => {
                        const typeInfo = transactionTypeLabels[trans.transaction_type] || { 
                          label: trans.transaction_type, 
                          icon: HiOutlineSwitchHorizontal, 
                          color: 'text-dark-300' 
                        }
                        const TypeIcon = typeInfo.icon
                        return (
                          <tr key={trans.id}>
                            <td className="text-dark-400">
                              {trans.transaction_date && format(new Date(trans.transaction_date), 'dd MMM yyyy HH:mm', { locale: tr })}
                            </td>
                            <td>
                              <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                                <TypeIcon className="w-3 h-3" />
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className={`font-mono ${
                              trans.transaction_type === 'deposit' || trans.transaction_type === 'transfer_in' 
                                ? 'text-nox-400' 
                                : 'text-red-400'
                            }`}>
                              {trans.transaction_type === 'deposit' || trans.transaction_type === 'transfer_in' ? '+' : '-'}
                              {formatCurrency(trans.amount, selectedAccount.currency)}
                            </td>
                            <td className="font-mono text-dark-300">
                              {formatCurrency(trans.balance_after, selectedAccount.currency)}
                            </td>
                            <td className="text-dark-500 max-w-xs truncate">{trans.description || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-dark-500 text-sm p-4 bg-dark-800/30 rounded-lg">Bu hesaba ait hareket kaydı bulunamadı.</p>
              )}
            </div>
            
            <div className="flex gap-3 pt-6 mt-6 border-t border-dark-700">
              <button 
                onClick={() => {
                  setShowDetailModal(false)
                  handleEdit(selectedAccount)
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

