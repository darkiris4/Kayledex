import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "light" | "dark"
export type Accent = "default" | "blue" | "green" | "purple" | "rose"
export type Background = "none" | "warm" | "cool" | "pink" | "sky" | "purple" | "orange"

const THEME_KEY = "homeschool.theme"
const ACCENT_KEY = "homeschool.accent"
const BACKGROUND_KEY = "homeschool.background"

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getInitialAccent(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY)
  return stored === "blue" || stored === "green" || stored === "purple" || stored === "rose"
    ? stored
    : "default"
}

const BACKGROUND_VALUES: Background[] = ["warm", "cool", "pink", "sky", "purple", "orange"]

function getInitialBackground(): Background {
  const stored = localStorage.getItem(BACKGROUND_KEY)
  return (BACKGROUND_VALUES as string[]).includes(stored ?? "") ? (stored as Background) : "none"
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  accent: Accent
  setAccent: (accent: Accent) => void
  background: Background
  setBackground: (background: Background) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [accent, setAccent] = useState<Accent>(getInitialAccent)
  const [background, setBackground] = useState<Background>(getInitialBackground)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (accent === "default") {
      document.documentElement.removeAttribute("data-accent")
    } else {
      document.documentElement.setAttribute("data-accent", accent)
    }
    localStorage.setItem(ACCENT_KEY, accent)
  }, [accent])

  useEffect(() => {
    if (background === "none") {
      document.body.removeAttribute("data-bg")
    } else {
      document.body.setAttribute("data-bg", background)
    }
    localStorage.setItem(BACKGROUND_KEY, background)
  }, [background])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        accent,
        setAccent,
        background,
        setBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
