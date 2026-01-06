import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineShieldCheck
} from 'react-icons/hi'

export default function Users() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_id: ''
  })
  
  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersAPI.list(),
        usersAPI.roles()
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch (error) {
      toast.error('Veriler yüklenemedi')
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchData()
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData, role_id: parseInt(formData.role_id) }
      if (editingUser) {
        if (!data.password) delete data.password
        await usersAPI.update(editingUser.id, data)
        toast.success('Kullanıcı güncellendi')
      } else {
        await usersAPI.create(data)
        toast.success('Kullanıcı oluşturuldu')
      }
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız')
    }
  }
  
  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      password: '',
      role_id: user.role_id.toString()
    })
    setShowModal(true)
  }
  
  const handleDelete = async (user) => {
    if (!confirm(`${user.full_name} kullanıcısını silmek istediğinize emin misiniz?`)) return
    
    try {
      await usersAPI.delete(user.id)
      toast.success('Kullanıcı silindi')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı silinemedi')
    }
  }
  
  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role_id: ''
    })
  }
  
  const getRoleBadge = (roleId) => {
    const role = roles.find(r => r.id === roleId)
    if (!role) return null
    
    const colors = {
      super_admin: 'badge-danger',
      admin: 'badge-warning',
      accountant: 'badge-info',
      sales: 'badge-success',
      purchasing: 'bg-purple-900/50 text-purple-400 border border-purple-800',
      viewer: 'bg-dark-700 text-dark-300 border border-dark-600'
    }
    
    return (
      <span className={`badge ${colors[role.name] || 'badge-info'}`}>
        {role.display_name}
      </span>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Kullanıcılar</h1>
          <p className="text-dark-400 mt-1">Kullanıcı ve yetki yönetimi</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary"
        >
          <HiOutlinePlus className="w-5 h-5" />
          <span>Yeni Kullanıcı</span>
        </button>
      </div>
      
      {/* Roles Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="card !p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-nox-400" />
              <span className="text-sm font-medium text-dark-200">{role.display_name}</span>
            </div>
            <p className="text-2xl font-bold text-dark-100">
              {users.filter(u => u.role_id === role.id).length}
            </p>
          </div>
        ))}
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
                <th>Kullanıcı</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son Giriş</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-nox-900 flex items-center justify-center">
                        <span className="text-nox-400 font-semibold">
                          {user.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">{user.full_name}</p>
                        <p className="text-sm text-dark-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-dark-400">{user.email}</td>
                  <td>{getRoleBadge(user.role_id)}</td>
                  <td>
                    {user.is_active ? (
                      <span className="badge-success">Aktif</span>
                    ) : (
                      <span className="badge-danger">Pasif</span>
                    )}
                  </td>
                  <td className="text-dark-500 text-sm">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-dark-200"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user)}
                        className="p-2 hover:bg-dark-800 rounded-lg text-dark-400 hover:text-red-400"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-semibold text-dark-50 mb-6">
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="label">Ad Soyad</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="label">
                  Şifre {editingUser && <span className="text-dark-500">(boş bırakılırsa değişmez)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>
              
              <div>
                <label className="label">Rol</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Rol seçin</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.display_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'Güncelle' : 'Oluştur'}
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

