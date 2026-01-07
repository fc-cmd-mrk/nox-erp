import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { 
  HiOutlineHome, 
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineCollection,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineUserGroup,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX
} from 'react-icons/hi'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HiOutlineHome },
  { name: 'Şirketler', href: '/companies', icon: HiOutlineOfficeBuilding },
  { name: 'Cariler', href: '/contacts', icon: HiOutlineUsers },
  { name: 'Ürün Grupları', href: '/product-groups', icon: HiOutlineCollection },
  { name: 'Ürünler', href: '/products', icon: HiOutlineCube },
  { name: 'İşlemler', href: '/transactions', icon: HiOutlineDocumentText },
  { name: 'Ödemeler', href: '/payments', icon: HiOutlineCreditCard },
  { name: 'Hesaplar', href: '/accounts', icon: HiOutlineCash },
  { name: 'Raporlar', href: '/reports', icon: HiOutlineChartBar },
  { name: 'Kullanıcılar', href: '/users', icon: HiOutlineUserGroup },
  { name: 'Ayarlar', href: '/settings', icon: HiOutlineCog },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }
  
  return (
    <div className="flex h-screen bg-dark-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 flex flex-col
        bg-dark-900/95 backdrop-blur-xl border-r border-dark-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nox-900 flex items-center justify-center">
              <span className="text-nox-400 font-bold text-xl">N</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-dark-50">NOX ERP</h1>
              <p className="text-xs text-dark-500">v1.0.0</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-dark-400 hover:text-dark-200"
            onClick={() => setSidebarOpen(false)}
          >
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* User section */}
        <div className="p-4 border-t border-dark-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50">
            <div className="w-10 h-10 rounded-full bg-nox-900 flex items-center justify-center">
              <span className="text-nox-400 font-semibold">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-100 truncate">
                {user?.full_name || 'Kullanıcı'}
              </p>
              <p className="text-xs text-dark-500 truncate">
                {user?.email || ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-dark-400 hover:text-red-400 transition-colors"
              title="Çıkış Yap"
            >
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 bg-dark-900/95 border-b border-dark-800">
          <button 
            className="p-2 text-dark-400 hover:text-dark-200"
            onClick={() => setSidebarOpen(true)}
          >
            <HiOutlineMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-nox-900 flex items-center justify-center">
              <span className="text-nox-400 font-bold">N</span>
            </div>
            <span className="font-semibold text-dark-100">NOX ERP</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

