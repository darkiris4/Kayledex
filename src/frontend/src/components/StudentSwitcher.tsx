import { useStudents } from "@/context/StudentContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function StudentSwitcher() {
  const { students, activeStudent, setActiveStudentId, loading } = useStudents()

  if (loading) return null
  if (students.length === 0) return null

  return (
    <Select value={activeStudent?.id} onValueChange={setActiveStudentId}>
      <SelectTrigger aria-label="Active student" className="w-[180px]">
        <SelectValue placeholder="Select student" />
      </SelectTrigger>
      <SelectContent>
        {students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.name}
            {student.grade_level ? ` — ${student.grade_level}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
