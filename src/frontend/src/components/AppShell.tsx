import { useState, type ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { StudentSwitcher } from "@/components/StudentSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calendar", label: "Calendar", end: false },
  { to: "/academics", label: "Academics", end: false },
  { to: "/compliance", label: "State Requirements", end: false },
  { to: "/reports", label: "Reports", end: false },
  { to: "/students", label: "Students", end: false },
  { to: "/settings", label: "Settings", end: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="relative border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="shrink-0 text-foreground md:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <img src="/logo.png" alt="" className="h-9 w-9 shrink-0" />
              <h1 className="truncate text-lg font-bold text-primary">KAYLEDEX</h1>
            </Link>
            <nav className="hidden gap-4 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive
                      ? "text-sm font-medium text-foreground"
                      : "text-sm font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StudentSwitcher />
            <ThemeToggle />
          </div>
        </div>

        {menuOpen && (
          <nav className="absolute left-0 top-full z-40 flex w-56 flex-col gap-1 border-b border-r bg-background p-2 shadow-lg md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
