import { useEffect, useState } from "react"
import {
  api,
  type Assessment,
  type Course,
  type InstructionRecord,
  type SchoolDay,
  type SchoolDayStatus,
  type Subject,
} from "@/lib/api"
import { STATUS_LABELS, SCHOOL_DAY_STATUSES } from "@/lib/schoolDayStatus"
import { formatMinutes } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
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
import { AddAssessmentDialog } from "@/components/AddAssessmentDialog"
import { AttachmentManager } from "@/components/AttachmentManager"

interface DayDetailDialogProps {
  date: string
  studentId: string
  familyId: string
  schoolYearId: string
  schoolDay: SchoolDay | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export function DayDetailDialog({
  date,
  studentId,
  familyId,
  schoolYearId,
  schoolDay,
  open,
  onOpenChange,
  onChanged,
}: DayDetailDialogProps) {
  const [records, setRecords] = useState<InstructionRecord[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [savingStatus, setSavingStatus] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  useEffect(() => {
    if (!open || !schoolDay) {
      setRecords([])
      return
    }
    api.instructionRecords.list(schoolDay.id).then(setRecords)
  }, [open, schoolDay])

  // Assessments are keyed by student + date, not by SchoolDay, so a test logged on a
  // day with no SchoolDay row yet (e.g. a weekend never marked instructional) still
  // needs to show up here.
  const reloadAssessments = () => {
    if (!open) return
    api.assessments.list(studentId, date).then(setAssessments)
  }

  useEffect(() => {
    reloadAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId, date])

  useEffect(() => {
    if (!open) return
    api.subjects.list(familyId).then(setSubjects)
  }, [open, familyId])

  useEffect(() => {
    if (!open) return
    api.courses.list(schoolYearId).then(setCourses)
  }, [open, schoolYearId])

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

  async function handleDeleteAssessment(id: string) {
    if (!window.confirm("Remove this assessment?")) return
    await api.assessments.delete(id)
    setAssessments((prev) => prev.filter((a) => a.id !== id))
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
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

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">Assessments</span>
                <AddAssessmentDialog
                  studentId={studentId}
                  subjects={subjects}
                  courses={courses}
                  defaultDate={date}
                  onAdded={reloadAssessments}
                  trigger={
                    <Button size="sm" variant="outline">
                      + Log Assessment
                    </Button>
                  }
                />
              </div>
              {assessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assessments logged.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {assessments.map((assessment) => {
                    const subjectName = subjects.find((s) => s.id === assessment.subject_id)?.name
                    return (
                      <li key={assessment.id} className="flex flex-col gap-1 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {subjectName ? `${subjectName}: ` : ""}
                            {assessment.name}
                            {assessment.points_earned != null && assessment.points_possible != null
                              ? ` (${assessment.points_earned}/${assessment.points_possible})`
                              : ""}
                          </span>
                          <div className="flex items-center gap-2">
                            {assessment.percentage != null && (
                              <Badge variant="secondary">
                                {assessment.percentage}%
                                {assessment.letter_grade ? ` · ${assessment.letter_grade}` : ""}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssessment(assessment.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <AttachmentManager associatedType="assessment" associatedId={assessment.id} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
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
