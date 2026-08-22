import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { api, type Student } from "@/lib/api"

const STORAGE_KEY = "homeschool.activeStudentId"

interface StudentContextValue {
  students: Student[]
  activeStudent: Student | null
  setActiveStudentId: (id: string) => void
  loading: boolean
  reload: () => void
}

const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([])
  const [activeStudentId, setActiveStudentIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.students
      .list()
      .then((list) => {
        if (cancelled) return
        setStudents(list)
        const stillValid = list.some((s) => s.id === activeStudentId)
        if (!stillValid && list.length > 0) {
          setActiveStudentIdState(list[0].id)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken])

  function setActiveStudentId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setActiveStudentIdState(id)
  }

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null

  return (
    <StudentContext.Provider
      value={{
        students,
        activeStudent,
        setActiveStudentId,
        loading,
        reload: () => setReloadToken((t) => t + 1),
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudents() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error("useStudents must be used within a StudentProvider")
  return ctx
}
