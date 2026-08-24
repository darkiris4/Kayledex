import { useEffect, useMemo, useState } from "react"
import { api, type AssessmentType, type Course, type Subject } from "@/lib/api"
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
import { toDateString } from "@/lib/dates"

const ASSESSMENT_TYPES: AssessmentType[] = ["assignment", "quiz", "test", "project", "oral", "other"]

interface AddAssessmentDialogProps {
  studentId: string
  subjects: Subject[]
  courses: Course[]
  onAdded: () => void
  defaultDate?: string
  trigger?: React.ReactNode
}

export function AddAssessmentDialog({
  studentId,
  subjects,
  courses,
  onAdded,
  defaultDate,
  trigger,
}: AddAssessmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState("")
  const [courseId, setCourseId] = useState("")
  const [name, setName] = useState("")
  const [date, setDate] = useState(() => defaultDate ?? toDateString(new Date()))
  const [type, setType] = useState<AssessmentType>("test")
  const [pointsEarned, setPointsEarned] = useState("")
  const [pointsPossible, setPointsPossible] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDate(defaultDate ?? toDateString(new Date()))
  }, [open, defaultDate])

  // Courses are nested under a subject but graded independently, so the assessment has
  // to be tied to a specific course (not just its subject) for the report card to find it.
  const coursesForSubject = useMemo(
    () => courses.filter((c) => c.subject_id === subjectId),
    [courses, subjectId],
  )

  useEffect(() => {
    setCourseId("")
  }, [subjectId])

  async function handleSave() {
    if (!subjectId || !name) return
    setSaving(true)
    try {
      await api.assessments.create({
        student_id: studentId,
        subject_id: subjectId,
        course_id: courseId || null,
        name,
        date,
        type,
        points_earned: pointsEarned ? Number(pointsEarned) : undefined,
        points_possible: pointsPossible ? Number(pointsPossible) : undefined,
      })
      setName("")
      setPointsEarned("")
      setPointsPossible("")
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">+ Add Assessment</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Assessment</DialogTitle>
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
            <Label>Course</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={!subjectId || coursesForSubject.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !subjectId
                      ? "Select a subject first"
                      : coursesForSubject.length === 0
                        ? "No courses yet for this subject"
                        : "Select a course"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {coursesForSubject.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjectId && coursesForSubject.length === 0 && (
              <p className="text-xs text-muted-foreground">
                This won't show up on the report card until you add a course for this subject.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Chapter 3 Test"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AssessmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Points Earned</Label>
              <Input
                type="number"
                value={pointsEarned}
                onChange={(e) => setPointsEarned(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Points Possible</Label>
              <Input
                type="number"
                value={pointsPossible}
                onChange={(e) => setPointsPossible(e.target.value)}
              />
            </div>
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
