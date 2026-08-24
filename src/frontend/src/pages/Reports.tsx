import { useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type SchoolYear } from "@/lib/api"
import { toDateString } from "@/lib/dates"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const REPORTS = [
  { slug: "attendance", label: "Attendance Report" },
  { slug: "subject-activity", label: "Subject Activity Report" },
  { slug: "report-card", label: "Academic Report Card" },
  { slug: "curriculum-progress", label: "Curriculum Progress Report" },
  { slug: "daily-activity-log", label: "Daily Activity Log" },
] as const

export function Reports() {
  const { activeStudent } = useStudents()
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([])
  const [schoolYearId, setSchoolYearId] = useState("")

  useEffect(() => {
    if (!activeStudent) return
    api.schoolYears.list(activeStudent.id).then((years) => {
      setSchoolYears(years)
      const today = toDateString(new Date())
      const current = years.find((y) => y.start_date <= today && y.end_date >= today)
      setSchoolYearId(current?.id ?? years[0]?.id ?? "")
    })
  }, [activeStudent])

  if (!activeStudent) return null

  if (schoolYears.length === 0) {
    return <p className="text-muted-foreground">No school year set up yet.</p>
  }

  const schoolYear = schoolYears.find((y) => y.id === schoolYearId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Reports</h2>
          <Select value={schoolYearId} onValueChange={setSchoolYearId}>
            <SelectTrigger aria-label="School year" className="w-[160px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {schoolYears.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {schoolYear && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={`/api/reports/all?school_year_id=${schoolYear.id}&format=pdf`}>
                Download All (PDF)
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/reports/all?school_year_id=${schoolYear.id}&format=csv`}>
                Download All (CSV)
              </a>
            </Button>
          </div>
        )}
      </div>

      {schoolYear && (
        <div className="flex flex-col gap-3">
          {REPORTS.map((report) => (
            <Card key={report.slug}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{report.label}</CardTitle>
                <div className="flex flex-wrap gap-2">
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
      )}
    </div>
  )
}
