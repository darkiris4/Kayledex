import { useCallback, useEffect, useMemo, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type Settings as SettingsType, type SchoolDaySummary, type SchoolYear } from "@/lib/api"
import { addMonths, endOfMonth, startOfMonth, toDateString } from "@/lib/dates"
import {
  SCHOOL_DAY_STATUSES,
  STATUS_LABELS,
  getStatusColor,
  hexToRgba,
} from "@/lib/schoolDayStatus"
import { formatMinutes } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DayDetailDialog } from "@/components/DayDetailDialog"
import { CatchUpDialog } from "@/components/CatchUpDialog"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function Calendar() {
  const { students, activeStudent, setActiveStudentId } = useStudents()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [schoolDays, setSchoolDays] = useState<SchoolDaySummary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [settings, setSettings] = useState<SettingsType | null>(null)

  useEffect(() => {
    if (!activeStudent) return
    api.schoolYears.list(activeStudent.id).then(setSchoolYears)
    api.settings.get(activeStudent.family_id).then(setSettings)
  }, [activeStudent])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const activeSchoolYear = useMemo(
    () =>
      schoolYears.find(
        (sy) => sy.start_date <= toDateString(monthEnd) && sy.end_date >= toDateString(monthStart),
      ),
    [schoolYears, monthStart, monthEnd],
  )

  const reloadSchoolDays = useCallback(() => {
    if (!activeSchoolYear) {
      setSchoolDays([])
      return
    }
    api.schoolDays
      .summary({
        school_year_id: activeSchoolYear.id,
        start: toDateString(monthStart),
        end: toDateString(monthEnd),
      })
      .then(setSchoolDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolYear, month])

  useEffect(() => {
    reloadSchoolDays()
  }, [reloadSchoolDays])

  const daysInMonth = monthEnd.getDate()
  const leadingBlanks = monthStart.getDay()
  const cells: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]

  const schoolDayByDate = new Map(schoolDays.map((d) => [d.date, d]))
  const selectedSchoolDay = selectedDate ? schoolDayByDate.get(selectedDate) : undefined

  if (!activeStudent) return null

  const colorOverrides = settings?.calendar_status_colors

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          {students.length > 1 && (
            <Select value={activeStudent.id} onValueChange={setActiveStudentId}>
              <SelectTrigger aria-label="Filter by student" className="w-[110px] sm:w-[180px]">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CatchUpDialog onLogged={reloadSchoolDays} />
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
            ← Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            Next →
          </Button>
        </div>
      </div>

      {!activeSchoolYear ? (
        <p className="text-muted-foreground">No school year covers this month.</p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} />
                const dateStr = toDateString(date)
                const schoolDay = schoolDayByDate.get(dateStr)
                const color = schoolDay ? getStatusColor(schoolDay.status, colorOverrides) : null
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={color ? { backgroundColor: hexToRgba(color, 0.15) } : undefined}
                    className={`flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-transparent text-sm hover:border-border ${!color ? "hover:bg-muted" : ""}`}
                  >
                    <span>{date.getDate()}</span>
                    {schoolDay &&
                      (schoolDay.total_minutes > 0 ? (
                        <span
                          style={{ backgroundColor: color ?? undefined }}
                          className="rounded px-1 text-[10px] font-medium text-white"
                        >
                          {formatMinutes(schoolDay.total_minutes)}
                        </span>
                      ) : (
                        <span
                          style={{ backgroundColor: color ?? undefined }}
                          className="h-2.5 w-2.5 rounded-full"
                        />
                      ))}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {SCHOOL_DAY_STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getStatusColor(status, colorOverrides) }}
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {selectedDate && activeSchoolYear && (
        <DayDetailDialog
          date={selectedDate}
          schoolYearId={activeSchoolYear.id}
          schoolDay={selectedSchoolDay}
          open={selectedDate !== null}
          onOpenChange={(open) => !open && setSelectedDate(null)}
          onChanged={reloadSchoolDays}
        />
      )}
    </div>
  )
}
