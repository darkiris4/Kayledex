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

interface BandRow {
  letter: string
  min_percentage: string
  max_percentage: string
}

const DEFAULT_ROW: BandRow = { letter: "", min_percentage: "", max_percentage: "" }

interface AddGradeScaleDialogProps {
  familyId: string
  onAdded: () => void
}

export function AddGradeScaleDialog({ familyId, onAdded }: AddGradeScaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [rows, setRows] = useState<BandRow[]>([{ ...DEFAULT_ROW }])
  const [saving, setSaving] = useState(false)

  function updateRow(index: number, field: keyof BandRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  async function handleSave() {
    const bands = rows
      .filter((r) => r.letter && r.min_percentage && r.max_percentage)
      .map((r) => ({
        letter: r.letter,
        min_percentage: Number(r.min_percentage),
        max_percentage: Number(r.max_percentage),
      }))
    if (!name || bands.length === 0) return
    setSaving(true)
    try {
      await api.gradeScales.create({ family_id: familyId, name, bands })
      setName("")
      setRows([{ ...DEFAULT_ROW }])
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          + New Grade Scale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Grade Scale</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Standard A-F"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Letter Bands</Label>
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="A"
                  className="w-16"
                  value={row.letter}
                  onChange={(e) => updateRow(i, "letter", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Min %"
                  value={row.min_percentage}
                  onChange={(e) => updateRow(i, "min_percentage", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max %"
                  value={row.max_percentage}
                  onChange={(e) => updateRow(i, "max_percentage", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setRows((prev) => [...prev, { ...DEFAULT_ROW }])}
            >
              + Add Band
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
