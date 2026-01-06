import { useState, useRef, useEffect } from 'react'
import { dataAPI, settingsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlineUpload,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineExclamation,
  HiOutlineCurrencyDollar,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineSearch
} from 'react-icons/hi'

export default function Settings() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [updatingRates, setUpdatingRates] = useState(false)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [currentRates, setCurrentRates] = useState({})
  const [allRates, setAllRates] = useState([])
  const [rateStats, setRateStats] = useState(null)
  const [showAllRates, setShowAllRates] = useState(false)
  const [availableDates, setAvailableDates] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [historicalRates, setHistoricalRates] = useState({})
  const [loadingDateRates, setLoadingDateRates] = useState(false)
  const fileInputRef = useRef(null)
  const [importType, setImportType] = useState('')
  
  useEffect(() => {
    loadCurrentRates()
    loadAllExchangeRates()
    loadRateStats()
    loadAvailableDates()
  }, [])
  
  const loadCurrentRates = async () => {
    try {
      const response = await settingsAPI.getTCMBRates()
      setCurrentRates(response.data)
    } catch (error) {
      console.log('Kur bilgisi yok')
    }
  }
  
  const loadAllExchangeRates = async () => {
    try {
      const response = await settingsAPI.exchangeRates()
      setAllRates(response.data || [])
    } catch (error) {
      console.log('Tüm kur bilgisi yüklenemedi')
    }
  }
  
  const loadRateStats = async () => {
    try {
      const response = await settingsAPI.getTCMBStats()
      setRateStats(response.data)
    } catch (error) {
      console.log('Kur istatistikleri yüklenemedi')
    }
  }
  
  const loadAvailableDates = async () => {
    try {
      const response = await settingsAPI.getAvailableDates()
      setAvailableDates(response.data || [])
    } catch (error) {
      console.log('Tarih listesi yüklenemedi')
    }
  }
  
  const loadRatesByDate = async (date) => {
    if (!date) {
      setHistoricalRates({})
      return
    }
    
    setLoadingDateRates(true)
    try {
      const response = await settingsAPI.getRatesByDate(date)
      setHistoricalRates(response.data || {})
    } catch (error) {
      toast.error('Seçilen tarihe ait kur bulunamadı')
      setHistoricalRates({})
    }
    setLoadingDateRates(false)
  }
  
  const handleDateChange = (date) => {
    setSelectedDate(date)
    loadRatesByDate(date)
  }
  
  const fetchHistoricalRates = async () => {
    setFetchingHistory(true)
    try {
      // Yıl başından bugüne kadar
      const startDate = `${new Date().getFullYear()}-01-01`
      const endDate = new Date().toISOString().split('T')[0]
      
      const response = await settingsAPI.fetchTCMBHistory(startDate, endDate)
      toast.success(
        `${response.data.total_days} gün, ${response.data.total_records} kayıt çekildi` +
        (response.data.skipped_days > 0 ? ` (${response.data.skipped_days} gün atlandı)` : '')
      )
      
      // Verileri yenile
      loadCurrentRates()
      loadAllExchangeRates()
      loadRateStats()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Geçmiş kurlar çekilemedi')
    }
    setFetchingHistory(false)
  }
  
  const updateTCMBRates = async () => {
    setUpdatingRates(true)
    try {
      const response = await settingsAPI.updateTCMBRates()
      toast.success(`TCMB kurları güncellendi (${response.data.count} para birimi)`)
      loadCurrentRates()
      loadAllExchangeRates()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'TCMB kurları güncellenemedi')
    }
    setUpdatingRates(false)
  }
  
  const updateCryptoRates = async () => {
    setUpdatingRates(true)
    try {
      await settingsAPI.updateCryptoRates()
      toast.success('Kripto kurları güncellendi')
      loadCurrentRates()
      loadAllExchangeRates()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kripto kurları güncellenemedi')
    }
    setUpdatingRates(false)
  }
  
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImporting(true)
    try {
      let response
      switch (importType) {
        case 'contacts':
          response = await dataAPI.importContacts(file)
          break
        case 'products':
          response = await dataAPI.importProducts(file)
          break
        case 'transactions':
          response = await dataAPI.importTransactions(file, 'sale', 1)
          break
        case 'payments':
          response = await dataAPI.importPayments(file)
          break
        default:
          throw new Error('Import tipi seçin')
      }
      
      toast.success(`${response.data.imported} kayıt import edildi`)
      if (response.data.errors?.length > 0) {
        toast.error(`${response.data.errors.length} hata oluştu`)
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import başarısız')
    }
    setImporting(false)
    e.target.value = ''
  }
  
  const handleExport = async (model, format) => {
    setExporting(true)
    try {
      const response = await dataAPI.export(model, format)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${model}_export.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('Export başarılı')
    } catch (error) {
      toast.error('Export başarısız')
    }
    setExporting(false)
  }
  
  const handleClearAll = async () => {
    const confirmed = prompt('Tüm verileri silmek için "CONFIRM_DELETE_ALL" yazın:')
    if (confirmed !== 'CONFIRM_DELETE_ALL') {
      toast.error('İşlem iptal edildi')
      return
    }
    
    try {
      await dataAPI.clearAll()
      toast.success('Tüm veriler silindi')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const triggerImport = (type) => {
    setImportType(type)
    fileInputRef.current.click()
  }
  
  const importOptions = [
    { type: 'contacts', label: 'Cariler', icon: '👥' },
    { type: 'products', label: 'Ürünler', icon: '📦' },
    { type: 'transactions', label: 'İşlemler (stok.csv)', icon: '📄' },
    { type: 'payments', label: 'Ödemeler (odeme.csv)', icon: '💳' }
  ]
  
  const exportOptions = [
    { model: 'contacts', label: 'Cariler' },
    { model: 'products', label: 'Ürünler' },
    { model: 'transactions', label: 'İşlemler' },
    { model: 'payments', label: 'Ödemeler' }
  ]
  
  // Main currencies to display first
  const mainCurrencies = ['USD', 'EUR', 'GBP', 'USDT']
  const rateEntries = Object.entries(currentRates)
  const mainRates = rateEntries.filter(([c]) => mainCurrencies.includes(c))
  const otherRates = rateEntries.filter(([c]) => !mainCurrencies.includes(c))
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Ayarlar</h1>
        <p className="text-dark-400 mt-1">Sistem ayarları ve veri yönetimi</p>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.xml"
        onChange={handleImport}
        className="hidden"
      />
      
      {/* Exchange Rates Section - Moved to top */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-900/30">
              <HiOutlineCurrencyDollar className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Döviz Kurları</h2>
              <p className="text-sm text-dark-500">TCMB günlük döviz alış kurları</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchHistoricalRates}
              disabled={fetchingHistory || updatingRates}
              className="btn-secondary !px-3 !py-1.5 text-sm"
              title="Yıl başından bugüne kadar kurları çek"
            >
              {fetchingHistory ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCalendar className="w-4 h-4" />
              )}
              Geçmiş Kurlar
            </button>
            <button
              onClick={updateCryptoRates}
              disabled={updatingRates || fetchingHistory}
              className="btn-secondary !px-3 !py-1.5 text-sm"
            >
              {updatingRates ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineRefresh className="w-4 h-4" />
              )}
              Kripto
            </button>
            <button
              onClick={updateTCMBRates}
              disabled={updatingRates || fetchingHistory}
              className="btn-primary !px-3 !py-1.5 text-sm"
            >
              {updatingRates ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineRefresh className="w-4 h-4" />
              )}
              TCMB Güncelle
            </button>
          </div>
        </div>
        
        {/* Kur İstatistikleri */}
        {rateStats && (
          <div className="mb-6 p-4 bg-dark-800/30 rounded-xl border border-dark-700/50">
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineChartBar className="w-5 h-5 text-nox-400" />
              <span className="text-sm font-medium text-dark-200">Kur Veritabanı</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-dark-500">Toplam Kayıt</p>
                <p className="text-lg font-semibold text-dark-100">{rateStats.total_records?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">Gün Sayısı</p>
                <p className="text-lg font-semibold text-dark-100">{rateStats.day_count?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">En Eski Tarih</p>
                <p className="text-lg font-semibold text-dark-100">{rateStats.oldest_date || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500">En Yeni Tarih</p>
                <p className="text-lg font-semibold text-dark-100">{rateStats.newest_date || '-'}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tarih Seçici - Geçmiş Kurlar */}
        {availableDates.length > 0 && (
          <div className="mb-6 p-4 bg-dark-800/30 rounded-xl border border-dark-700/50">
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineSearch className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-dark-200">Belirli Tarihe Göre Kur Sorgula</span>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="label">Tarih Seçin</label>
                <select
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="input"
                >
                  <option value="">-- Tarih seçin --</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>
              {selectedDate && (
                <button
                  onClick={() => { setSelectedDate(''); setHistoricalRates({}); }}
                  className="btn-secondary !px-3 !py-2"
                >
                  Temizle
                </button>
              )}
            </div>
            
            {/* Seçilen Tarih Kurları */}
            {loadingDateRates ? (
              <div className="mt-4 flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
              </div>
            ) : Object.keys(historicalRates).length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-dark-400 mb-3">
                  <span className="font-medium text-dark-200">{selectedDate}</span> tarihli kurlar:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(historicalRates)
                    .sort((a, b) => {
                      const priority = ['USD', 'EUR', 'GBP', 'USDT']
                      const aIdx = priority.indexOf(a[0])
                      const bIdx = priority.indexOf(b[0])
                      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
                      if (aIdx >= 0) return -1
                      if (bIdx >= 0) return 1
                      return a[0].localeCompare(b[0])
                    })
                    .map(([currency, data]) => (
                    <div key={currency} className="p-3 bg-dark-900/50 rounded-lg border border-dark-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-dark-100">{currency}</span>
                        <span className="text-xs text-dark-600">/ TRY</span>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-500">Alış:</span>
                          <span className="text-nox-400 font-medium">{data.buying?.toFixed(4)}</span>
                        </div>
                        {data.selling && (
                          <div className="flex justify-between">
                            <span className="text-dark-500">Satış:</span>
                            <span className="text-dark-300">{data.selling?.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {rateEntries.length > 0 ? (
          <div className="space-y-4">
            {/* Main Currencies Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mainRates.map(([currency, data]) => (
                <div key={currency} className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-dark-100">{currency}</span>
                    <span className="text-xs text-dark-500">/ TRY</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-500 flex items-center gap-1">
                        <HiOutlineArrowDown className="w-3 h-3 text-green-400" />
                        Alış
                      </span>
                      <span className="text-nox-400 font-semibold">
                        {data.buying?.toFixed(4) || data.rate?.toFixed(4)}
                      </span>
                    </div>
                    {data.selling && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <HiOutlineArrowUp className="w-3 h-3 text-red-400" />
                          Satış
                        </span>
                        <span className="text-dark-300">
                          {data.selling?.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-dark-600 mt-2">{data.date}</p>
                </div>
              ))}
            </div>
            
            {/* Other Currencies */}
            {otherRates.length > 0 && (
              <>
                <button
                  onClick={() => setShowAllRates(!showAllRates)}
                  className="text-sm text-nox-400 hover:text-nox-300 flex items-center gap-1"
                >
                  {showAllRates ? 'Daha az göster' : `Tüm kurlar (${otherRates.length} para birimi)`}
                </button>
                
                {showAllRates && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {otherRates.map(([currency, data]) => (
                      <div key={currency} className="p-3 bg-dark-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-dark-300">{currency}</span>
                          <span className="text-nox-400 font-semibold text-sm">
                            {data.buying?.toFixed(4) || data.rate?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <HiOutlineCurrencyDollar className="w-12 h-12 mx-auto text-dark-600 mb-3" />
            <p className="text-dark-400">Henüz kur bilgisi yok</p>
            <p className="text-dark-500 text-sm mt-1">TCMB'den güncel kurları çekmek için "TCMB Güncelle" butonuna tıklayın</p>
          </div>
        )}
      </div>
      
      {/* Import Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-nox-900/30">
            <HiOutlineUpload className="w-6 h-6 text-nox-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Veri Import</h2>
            <p className="text-sm text-dark-500">CSV, Excel veya XML dosyasından veri aktarın</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {importOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => triggerImport(option.type)}
              disabled={importing}
              className="p-4 rounded-xl border border-dark-700 hover:border-nox-700 hover:bg-dark-800/50 transition-all text-left group"
            >
              <span className="text-2xl">{option.icon}</span>
              <p className="font-medium text-dark-200 mt-2 group-hover:text-dark-50">{option.label}</p>
              <p className="text-xs text-dark-500 mt-1">CSV, XLSX, XML</p>
            </button>
          ))}
        </div>
        
        {importing && (
          <div className="flex items-center gap-3 mt-4 p-4 bg-dark-800/50 rounded-xl">
            <div className="w-5 h-5 border-2 border-nox-500/30 border-t-nox-500 rounded-full animate-spin" />
            <span className="text-dark-300">Import işlemi devam ediyor...</span>
          </div>
        )}
      </div>
      
      {/* Export Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-blue-900/30">
            <HiOutlineDownload className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Veri Export</h2>
            <p className="text-sm text-dark-500">Verileri dosya olarak indirin</p>
          </div>
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Veri Tipi</th>
                <th>CSV</th>
                <th>Excel</th>
                <th>XML</th>
              </tr>
            </thead>
            <tbody>
              {exportOptions.map((option) => (
                <tr key={option.model}>
                  <td className="font-medium text-dark-200">{option.label}</td>
                  <td>
                    <button
                      onClick={() => handleExport(option.model, 'csv')}
                      disabled={exporting}
                      className="btn-ghost !px-3 !py-1.5 text-sm"
                    >
                      <HiOutlineDocumentText className="w-4 h-4" />
                      CSV
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleExport(option.model, 'xlsx')}
                      disabled={exporting}
                      className="btn-ghost !px-3 !py-1.5 text-sm"
                    >
                      <HiOutlineDocumentText className="w-4 h-4" />
                      Excel
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleExport(option.model, 'xml')}
                      disabled={exporting}
                      className="btn-ghost !px-3 !py-1.5 text-sm"
                    >
                      <HiOutlineDocumentText className="w-4 h-4" />
                      XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Danger Zone */}
      <div className="card !border-red-900/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-red-900/30">
            <HiOutlineExclamation className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-400">Tehlikeli Bölge</h2>
            <p className="text-sm text-dark-500">Bu işlemler geri alınamaz</p>
          </div>
        </div>
        
        <div className="p-4 bg-red-900/10 rounded-xl border border-red-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-dark-200">Tüm Verileri Sil (Test)</p>
              <p className="text-sm text-dark-500">Cariler, ürünler, işlemler ve ödemeler silinir. Kullanıcılar ve şirketler kalır.</p>
            </div>
            <button
              onClick={handleClearAll}
              className="btn-danger whitespace-nowrap"
            >
              <HiOutlineTrash className="w-5 h-5" />
              Tüm Verileri Sil
            </button>
          </div>
        </div>
      </div>
      
      {/* System Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Sistem Bilgisi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-500">Versiyon</p>
            <p className="text-lg font-semibold text-dark-100">1.0.0</p>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-500">Veritabanı</p>
            <p className="text-lg font-semibold text-dark-100">SQLite</p>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-500">Backend</p>
            <p className="text-lg font-semibold text-dark-100">FastAPI</p>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-500">Frontend</p>
            <p className="text-lg font-semibold text-dark-100">React</p>
          </div>
        </div>
      </div>
    </div>
  )
}
