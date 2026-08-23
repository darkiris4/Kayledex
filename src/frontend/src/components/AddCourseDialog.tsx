import { useEffect, useState } from "react"
import { api, type Course, type Subject } from "@/lib/api"
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

interface AddCourseDialogProps {
  schoolYearId: string
  subjects: Subject[]
  onAdded: () => void
  course?: Course
  trigger?: React.ReactNode
}

export function AddCourseDialog({ schoolYearId, subjects, onAdded, course, trigger }: AddCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState(course?.subject_id ?? "")
  const [name, setName] = useState(course?.name ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSubjectId(course?.subject_id ?? "")
      setName(course?.name ?? "")
    }
  }, [open, course])

  async function handleSave() {
    if (!subjectId || !name) return
    setSaving(true)
    try {
      if (course) {
        await api.courses.update(course.id, { subject_id: subjectId, name })
      } else {
        await api.courses.create({ school_year_id: schoolYearId, subject_id: subjectId, name })
      }
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            + Add Course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course ? "Edit Course" : "Add Course"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Course Name</Label>
            <Input
              placeholder="e.g. 4th Grade Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!subjectId || !name || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
