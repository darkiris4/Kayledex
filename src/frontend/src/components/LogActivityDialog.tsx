import { useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type Subject } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LogActivityDialogProps {
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogged: () => void
}

export function LogActivityDialog({ date, open, onOpenChange, onLogged }: LogActivityDialogProps) {
  const { activeStudent } = useStudents()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState<string>("")
  const [activityDescription, setActivityDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [completed, setCompleted] = useState(true)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !activeStudent) return
    setSubjectId("")
    setActivityDescription("")
    setDurationMinutes("")
    setCompleted(true)
    setNotes("")
    setError(null)
    api.subjects.list(activeStudent.family_id).then(setSubjects)
  }, [open, activeStudent])

  async function handleSave() {
    if (!activeStudent || !subjectId) return
    setSaving(true)
    setError(null)
    try {
      await api.quickLog.create({
        student_id: activeStudent.id,
        subject_id: subjectId,
        date,
        activity_description: activityDescription || undefined,
        duration_minutes: durationMinutes ? Number(durationMinutes) : undefined,
        completed,
        notes: notes || undefined,
      })
      onLogged()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log School — {date}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="activity">Activity</Label>
            <Input
              id="activity"
              placeholder="e.g. Saxon Math Lesson 38"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="completed"
              checked={completed}
              onCheckedChange={(checked) => setCompleted(checked === true)}
            />
            <Label htmlFor="completed">Completed</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!subjectId || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
