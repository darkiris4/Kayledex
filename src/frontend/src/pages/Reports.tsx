import { useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type SchoolYear } from "@/lib/api"
import { toDateString } from "@/lib/dates"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const REPORTS = [
  { slug: "attendance", label: "Attendance Report" },
  { slug: "subject-activity", label: "Subject Activity Report" },
  { slug: "report-card", label: "Academic Report Card" },
  { slug: "curriculum-progress", label: "Curriculum Progress Report" },
  { slug: "daily-activity-log", label: "Daily Activity Log" },
] as const

export function Reports() {
  const { activeStudent } = useStudents()
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)

  useEffect(() => {
    if (!activeStudent) return
    api.schoolYears.list(activeStudent.id).then((years) => {
      const today = toDateString(new Date())
      setSchoolYear(years.find((y) => y.start_date <= today && y.end_date >= today) ?? null)
    })
  }, [activeStudent])

  if (!activeStudent) return null

  if (!schoolYear) {
    return <p className="text-muted-foreground">No school year covers today's date yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Reports — {schoolYear.name}</h2>
      <div className="flex flex-col gap-3">
        {REPORTS.map((report) => (
          <Card key={report.slug}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{report.label}</CardTitle>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/reports/${report.slug}?school_year_id=${schoolYear.id}&format=pdf`}>
                    Download PDF
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/reports/${report.slug}?school_year_id=${schoolYear.id}&format=csv`}>
                    Download CSV
                  </a>
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
