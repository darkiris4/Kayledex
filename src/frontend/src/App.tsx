import { BrowserRouter, Routes, Route } from "react-router-dom"
import { StudentProvider } from "@/context/StudentContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { Calendar } from "@/pages/Calendar"
import { Academics } from "@/pages/Academics"
import { Compliance } from "@/pages/Compliance"
import { Reports } from "@/pages/Reports"
import { Settings } from "@/pages/Settings"

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <StudentProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </StudentProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
