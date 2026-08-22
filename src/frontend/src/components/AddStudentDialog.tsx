import { useEffect, useState } from "react"
import { api, type Student } from "@/lib/api"
import { GRADE_LEVELS } from "@/lib/gradeLevels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddStudentDialogProps {
  familyId: string
  student?: Student
  onSaved: () => void
  trigger?: React.ReactNode
}

export function AddStudentDialog({ familyId, student, onSaved, trigger }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(student?.name ?? "")
  const [gradeLevel, setGradeLevel] = useState(student?.grade_level ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(student?.date_of_birth ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(student?.name ?? "")
      setGradeLevel(student?.grade_level ?? "")
      setDateOfBirth(student?.date_of_birth ?? "")
    }
  }, [open, student])

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      const data = {
        name,
        grade_level: gradeLevel || undefined,
        date_of_birth: dateOfBirth || undefined,
      }
      if (student) {
        await api.students.update(student.id, data)
      } else {
        await api.students.create({ family_id: familyId, ...data })
      }
      setOpen(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            + Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Add Student"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Grade Level</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
