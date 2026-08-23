import { useEffect, useState } from "react"
import { api, type SchoolYear } from "@/lib/api"
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
  schoolYear?: SchoolYear
  onAdded: () => void
  trigger?: React.ReactNode
}

export function AddSchoolYearDialog({ studentId, schoolYear, onAdded, trigger }: AddSchoolYearDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(schoolYear?.start_date ?? "")
  const [endDate, setEndDate] = useState(schoolYear?.end_date ?? "")
  const [grade, setGrade] = useState(schoolYear?.grade ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStartDate(schoolYear?.start_date ?? "")
      setEndDate(schoolYear?.end_date ?? "")
      setGrade(schoolYear?.grade ?? "")
      setError(null)
    }
  }, [open, schoolYear])

  async function handleSave() {
    if (!startDate || !endDate) return
    setSaving(true)
    setError(null)
    try {
      const data = {
        name: deriveSchoolYearName(startDate, endDate),
        start_date: startDate,
        end_date: endDate,
        grade: grade || undefined,
      }
      if (schoolYear) {
        await api.schoolYears.update(schoolYear.id, data)
      } else {
        await api.schoolYears.create({ student_id: studentId, ...data })
      }
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            + Add School Year
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schoolYear ? "Edit School Year" : "Add School Year"}</DialogTitle>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
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
