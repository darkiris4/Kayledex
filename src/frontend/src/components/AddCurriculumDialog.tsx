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

interface AddCurriculumDialogProps {
  courseId: string
  onAdded: () => void
}

export function AddCurriculumDialog({ courseId, onAdded }: AddCurriculumDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [publisher, setPublisher] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      await api.curricula.create({ course_id: courseId, name, publisher: publisher || undefined })
      setName("")
      setPublisher("")
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
          + Add Curriculum
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Curriculum</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Saxon Math 4"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Publisher</Label>
            <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
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
