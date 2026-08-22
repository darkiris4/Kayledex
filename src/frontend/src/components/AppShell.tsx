import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
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
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="h-9 w-9" />
              <h1 className="text-lg font-bold text-primary">KAYLEDEX</h1>
            </div>
            <nav className="flex gap-4">
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
          <div className="flex items-center gap-2">
            <StudentSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
