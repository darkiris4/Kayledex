import { useEffect, useState } from "react"
import { api, type Lesson } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AddLessonDialogProps {
  curriculumId: string
  nextNumber: number
  onAdded: () => void
  lesson?: Lesson
  trigger?: React.ReactNode
}

export function AddLessonDialog({
  curriculumId,
  nextNumber,
  onAdded,
  lesson,
  trigger,
}: AddLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState(String(lesson?.number ?? nextNumber))
  const [name, setName] = useState(lesson?.name ?? "")
  const [description, setDescription] = useState(lesson?.description ?? "")
  const [expectedDuration, setExpectedDuration] = useState(
    lesson?.expected_duration_minutes != null ? String(lesson.expected_duration_minutes) : "",
  )
  const [notes, setNotes] = useState(lesson?.notes ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNumber(String(lesson?.number ?? nextNumber))
      setName(lesson?.name ?? "")
      setDescription(lesson?.description ?? "")
      setExpectedDuration(lesson?.expected_duration_minutes != null ? String(lesson.expected_duration_minutes) : "")
      setNotes(lesson?.notes ?? "")
    }
  }, [open, lesson, nextNumber])

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      const payload = {
        number: number ? Number(number) : undefined,
        name,
        description: description || undefined,
        expected_duration_minutes: expectedDuration ? Number(expectedDuration) : undefined,
        notes: notes || undefined,
      }
      if (lesson) {
        await api.lessons.update(lesson.id, payload)
      } else {
        await api.lessons.create({ curriculum_id: curriculumId, ...payload })
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
          <Button size="sm" variant="ghost">
            + Add Lesson
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Number</Label>
              <Input type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Expected Duration (min)</Label>
              <Input
                type="number"
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Lesson 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
