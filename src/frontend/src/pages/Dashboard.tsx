import { useCallback, useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type DashboardSummary } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { LogActivityDialog } from "@/components/LogActivityDialog"
import { formatMinutes } from "@/lib/format"

export function Dashboard() {
  const { students, activeStudent, loading: studentsLoading } = useStudents()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  const loadSummary = useCallback(() => {
    if (!activeStudent) {
      setSummary(null)
      return
    }
    setLoading(true)
    return api.dashboard
      .get(activeStudent.id)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [activeStudent])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  if (studentsLoading) return null

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No students yet</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Add a family and a student to get started.
        </CardContent>
      </Card>
    )
  }

  if (loading || !summary) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (!summary.active_school_year) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active school year</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {summary.student.name} doesn't have a school year covering today's date yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">{summary.active_school_year.name} School Year</h2>
        <p className="text-muted-foreground">
          {summary.student.name}
          {summary.student.grade_level ? ` · ${summary.student.grade_level}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today</CardTitle>
          <Button size="sm" onClick={() => setLogDialogOpen(true)}>
            + Add Subject
          </Button>
        </CardHeader>
        <CardContent>
          {summary.today.records.length === 0 ? (
            <p className="text-muted-foreground">Nothing logged yet today.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.today.records.map((record) => (
                <li key={record.id} className="flex items-center justify-between">
                  <span>
                    {record.completed ? "✓" : "○"} {record.subject_name}
                    {record.activity_description ? ` — ${record.activity_description}` : ""}
                  </span>
                  {record.duration_minutes != null && (
                    <Badge variant="secondary">{formatMinutes(record.duration_minutes)}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            {formatMinutes(summary.today.total_minutes)} instructional time today
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{summary.this_week.school_days} school days</p>
            <p>{formatMinutes(summary.this_week.total_minutes)} instructional time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{summary.this_year.instructional_days} instructional days</p>
          </CardContent>
        </Card>
      </div>

      <LogActivityDialog
        date={summary.today.date}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onLogged={() => loadSummary()}
      />
    </div>
  )
}
