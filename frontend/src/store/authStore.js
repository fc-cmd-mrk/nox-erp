import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (username, password) => {
        try {
          const response = await api.post('/auth/login', { username, password })
          const { access_token, user } = response.data
          
          set({
            user,
            token: access_token,
            isAuthenticated: true
          })
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            error: error.response?.data?.detail || 'Giriş başarısız' 
          }
        }
      },
      
      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (e) {
          // Ignore errors on logout
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
        
        delete api.defaults.headers.common['Authorization']
      },
      
      checkAuth: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          return true
        }
        return false
      },
      
      hasPermission: (module, action) => {
        const { user } = get()
        if (!user) return false
        if (user.is_superuser) return true
        
        // In a real app, check user permissions
        // For now, return true for authenticated users
        return true
      }
    }),
    {
      name: 'nox-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

