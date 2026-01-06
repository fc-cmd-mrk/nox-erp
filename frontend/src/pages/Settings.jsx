import { useState, useRef } from 'react'
import { dataAPI, settingsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlineUpload,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineDocumentText,
  HiOutlineExclamation
} from 'react-icons/hi'

export default function Settings() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef(null)
  const [importType, setImportType] = useState('')
  
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

