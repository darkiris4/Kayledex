import { useState } from "react"
import { api } from "@/lib/api"
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

interface AddLessonDialogProps {
  curriculumId: string
  nextNumber: number
  onAdded: () => void
}

export function AddLessonDialog({ curriculumId, nextNumber, onAdded }: AddLessonDialogProps) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState(String(nextNumber))
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      await api.lessons.create({
        curriculum_id: curriculumId,
        number: number ? Number(number) : undefined,
        name,
      })
      setName("")
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          + Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lesson</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Number</Label>
            <Input type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Lesson 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
