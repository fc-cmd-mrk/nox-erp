import { useState, useEffect } from 'react'
import { accountsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus,
  HiOutlineCash,
  HiOutlineLibrary,
  HiOutlineCurrencyDollar,
  HiOutlineCreditCard,
  HiOutlinePencil,
  HiOutlineTrash
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

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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
                    <div key={account.id} className="card group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-dark-100">{account.name}</p>
                          <p className="text-sm text-dark-500 font-mono">{account.code}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(account)}
                            className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(account)}
                            className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
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
    </div>
  )
}

