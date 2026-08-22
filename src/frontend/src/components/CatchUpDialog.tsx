import { useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type Subject } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const WEEKDAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
]

interface CatchUpDialogProps {
  onLogged: () => void
}

export function CatchUpDialog({ onLogged }: CatchUpDialogProps) {
  const { activeStudent } = useStudents()
  const [open, setOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectId, setSubjectId] = useState("")
  const [activityDescription, setActivityDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created_count: number; skipped_dates: string[] } | null>(null)

  useEffect(() => {
    if (!open || !activeStudent) return
    setResult(null)
    setError(null)
    api.subjects.list(activeStudent.family_id).then(setSubjects)
  }, [open, activeStudent])

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSave() {
    if (!activeStudent || !subjectId || !startDate || !endDate || weekdays.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.quickLog.bulkCreate({
        student_id: activeStudent.id,
        subject_id: subjectId,
        start_date: startDate,
        end_date: endDate,
        weekdays,
        activity_description: activityDescription || undefined,
        duration_minutes: durationMinutes ? Number(durationMinutes) : undefined,
      })
      setResult(res)
      onLogged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSubjectId("")
          setActivityDescription("")
          setDurationMinutes("")
          setStartDate("")
          setEndDate("")
          setResult(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Catch Up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catch Up on Past Activity</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4">
            <p>
              Logged <strong>{result.created_count}</strong> day
              {result.created_count === 1 ? "" : "s"}.
            </p>
            {result.skipped_dates.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Skipped {result.skipped_dates.length} date(s) outside any school year — add the
                school year first if you need those covered too.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Backfill the same subject and activity across a whole date range at once — for
              logging everything done before you started using this app.
            </p>

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
              <Label>Activity (optional)</Label>
              <Input
                placeholder="e.g. Saxon Math"
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Duration (minutes, optional)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Days of the Week</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((day) => (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={weekdays.includes(day.value)}
                      onCheckedChange={() => toggleWeekday(day.value)}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!subjectId || !startDate || !endDate || weekdays.length === 0 || saving}
              >
                {saving ? "Logging…" : "Log Activities"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
