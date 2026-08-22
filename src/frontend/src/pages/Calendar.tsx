import { useCallback, useEffect, useMemo, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type SchoolDaySummary, type SchoolYear } from "@/lib/api"
import { addMonths, endOfMonth, startOfMonth, toDateString } from "@/lib/dates"
import { STATUS_BG_COLORS, STATUS_DOT_COLORS } from "@/lib/schoolDayStatus"
import { formatMinutes } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DayDetailDialog } from "@/components/DayDetailDialog"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function Calendar() {
  const { activeStudent } = useStudents()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [schoolDays, setSchoolDays] = useState<SchoolDaySummary[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    if (!activeStudent) return
    api.schoolYears.list(activeStudent.id).then(setSchoolYears)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-2">
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
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-transparent text-sm hover:border-border ${schoolDay ? STATUS_BG_COLORS[schoolDay.status] : "hover:bg-muted"}`}
                  >
                    <span>{date.getDate()}</span>
                    {schoolDay &&
                      (schoolDay.total_minutes > 0 ? (
                        <span
                          className={`rounded px-1 text-[10px] font-medium text-white ${STATUS_DOT_COLORS[schoolDay.status]}`}
                        >
                          {formatMinutes(schoolDay.total_minutes)}
                        </span>
                      ) : (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[schoolDay.status]}`}
                        />
                      ))}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
