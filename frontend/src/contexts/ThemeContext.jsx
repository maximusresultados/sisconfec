/**
 * ThemeContext — Alternância de tema claro/escuro
 *
 * Uso: const { isDark, toggle } = useTheme()
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { darkTheme } from '@/styles/stitches.config'

const ThemeCtx = createContext(null)
export const useTheme = () => useContext(ThemeCtx)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('sc-theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add(darkTheme.toString())
      localStorage.setItem('sc-theme', 'dark')
    } else {
      root.classList.remove(darkTheme.toString())
      localStorage.setItem('sc-theme', 'light')
    }
  }, [isDark])

  return (
    <ThemeCtx.Provider value={{ isDark, toggle: () => setIsDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  )
}
