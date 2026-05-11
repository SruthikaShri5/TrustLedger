import { clearAPICache } from '@/lib/api'

export const logout = () => {
  clearAPICache()
  localStorage.clear()
  window.location.href = '/'
}
