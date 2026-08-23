import { useEffect, useState } from "react"
import { api, type InstructionRecord, type SchoolDay, type SchoolDayStatus } from "@/lib/api"
import { STATUS_LABELS, SCHOOL_DAY_STATUSES } from "@/lib/schoolDayStatus"
import { formatMinutes } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogActivityDialog } from "@/components/LogActivityDialog"
import { AttachmentManager } from "@/components/AttachmentManager"

interface DayDetailDialogProps {
  date: string
  schoolYearId: string
  schoolDay: SchoolDay | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export function DayDetailDialog({
  date,
  schoolYearId,
  schoolDay,
  open,
  onOpenChange,
  onChanged,
}: DayDetailDialogProps) {
  const [records, setRecords] = useState<InstructionRecord[]>([])
  const [savingStatus, setSavingStatus] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  useEffect(() => {
    if (!open || !schoolDay) {
      setRecords([])
      return
    }
    api.instructionRecords.list(schoolDay.id).then(setRecords)
  }, [open, schoolDay])

  async function handleStatusChange(status: SchoolDayStatus) {
    setSavingStatus(true)
    try {
      if (schoolDay) {
        await api.schoolDays.update(schoolDay.id, { status })
      } else {
        await api.schoolDays.create({ school_year_id: schoolYearId, date, status })
      }
      onChanged()
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDeleteRecord(id: string) {
    if (!window.confirm("Remove this activity?")) return
    await api.instructionRecords.delete(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    onChanged()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{date}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Select
              value={schoolDay?.status ?? ""}
              onValueChange={(value) => handleStatusChange(value as SchoolDayStatus)}
              disabled={savingStatus}
            >
              <SelectTrigger aria-label="Day status">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_DAY_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {schoolDay ? (
              records.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities logged.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {records.map((record) => (
                    <li key={record.id} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>
                          {record.completed ? "✓" : "○"} {record.activity_description ?? "Activity"}
                          {record.duration_minutes != null ? ` (${formatMinutes(record.duration_minutes)})` : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      <AttachmentManager associatedType="instruction_record" associatedId={record.id} />
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing recorded for this day yet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setLogDialogOpen(true)}>+ Log Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogActivityDialog
        date={date}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onLogged={() => {
          onChanged()
          if (schoolDay) api.instructionRecords.list(schoolDay.id).then(setRecords)
        }}
      />
    </>
  )
}
