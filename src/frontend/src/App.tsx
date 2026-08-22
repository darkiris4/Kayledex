import { BrowserRouter, Routes, Route } from "react-router-dom"
import { StudentProvider, useStudents } from "@/context/StudentContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/components/AppShell"
import { Onboarding } from "@/pages/Onboarding"
import { Dashboard } from "@/pages/Dashboard"
import { Calendar } from "@/pages/Calendar"
import { Academics } from "@/pages/Academics"
import { Compliance } from "@/pages/Compliance"
import { Reports } from "@/pages/Reports"
import { Students } from "@/pages/Students"
import { Settings } from "@/pages/Settings"

function AppContent() {
  const { students, loading, reload } = useStudents()

  // Only blank the screen on the true initial load. Once students have loaded once,
  // a background reloadContext() (e.g. from the Students page) must not unmount/remount
  // the whole app shell just because `loading` flips true again — that caused an actual
  // infinite mount->reload->unmount loop on the Students page.
  if (loading && students.length === 0) return null

  if (students.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Onboarding onComplete={reload} />
      </div>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/students" element={<Students />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <StudentProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </StudentProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
