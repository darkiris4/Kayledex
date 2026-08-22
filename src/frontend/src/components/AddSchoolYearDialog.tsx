import { useState } from "react"
import { api } from "@/lib/api"
import { deriveSchoolYearName } from "@/lib/dates"
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

interface AddSchoolYearDialogProps {
  studentId: string
  onAdded: () => void
}

export function AddSchoolYearDialog({ studentId, onAdded }: AddSchoolYearDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [grade, setGrade] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!startDate || !endDate) return
    setSaving(true)
    try {
      await api.schoolYears.create({
        student_id: studentId,
        name: deriveSchoolYearName(startDate, endDate),
        start_date: startDate,
        end_date: endDate,
        grade: grade || undefined,
      })
      setStartDate("")
      setEndDate("")
      setGrade("")
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
          + Add School Year
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add School Year</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-muted-foreground">
              Will be named "{deriveSchoolYearName(startDate, endDate)}"
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label>Grade (optional)</Label>
            <Select value={grade} onValueChange={setGrade}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!startDate || !endDate || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
