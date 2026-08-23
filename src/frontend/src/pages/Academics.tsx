import { useCallback, useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type Assessment, type Course, type SchoolYear, type Subject } from "@/lib/api"
import { toDateString } from "@/lib/dates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddCourseDialog } from "@/components/AddCourseDialog"
import { AddAssessmentDialog } from "@/components/AddAssessmentDialog"
import { CourseCard } from "@/components/CourseCard"
import { AttachmentManager } from "@/components/AttachmentManager"

export function Academics() {
  const { activeStudent } = useStudents()
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])

  useEffect(() => {
    if (!activeStudent) return
    api.subjects.list(activeStudent.family_id).then(setSubjects)
    api.schoolYears.list(activeStudent.id).then((years) => {
      const today = toDateString(new Date())
      setSchoolYear(years.find((y) => y.start_date <= today && y.end_date >= today) ?? null)
    })
  }, [activeStudent])

  const reloadCourses = useCallback(() => {
    if (!schoolYear) return
    api.courses.list(schoolYear.id).then(setCourses)
  }, [schoolYear])

  const reloadAssessments = useCallback(() => {
    if (!activeStudent) return
    api.assessments.list(activeStudent.id).then(setAssessments)
  }, [activeStudent])

  useEffect(() => {
    reloadCourses()
  }, [reloadCourses])

  useEffect(() => {
    reloadAssessments()
  }, [reloadAssessments])

  if (!activeStudent) return null

  if (!schoolYear) {
    return <p className="text-muted-foreground">No school year covers today's date yet.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Courses</h2>
        <AddCourseDialog schoolYearId={schoolYear.id} subjects={subjects} onAdded={reloadCourses} />
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No courses yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} subjects={subjects} onChanged={reloadCourses} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Assessments</h2>
        <AddAssessmentDialog
          studentId={activeStudent.id}
          subjects={subjects}
          onAdded={reloadAssessments}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {assessments.map((a) => {
                const subjectName = subjects.find((s) => s.id === a.subject_id)?.name
                return (
                  <li key={a.id} className="flex flex-col gap-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {a.date} — {subjectName ? `${subjectName}: ` : ""}
                        {a.name}
                        {a.points_earned != null && a.points_possible != null
                          ? ` (${a.points_earned}/${a.points_possible})`
                          : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        {a.percentage != null && (
                          <Badge variant="secondary">
                            {a.percentage}%{a.letter_grade ? ` · ${a.letter_grade}` : ""}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm("Remove this assessment?")) return
                            await api.assessments.delete(a.id)
                            reloadAssessments()
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <AttachmentManager associatedType="assessment" associatedId={a.id} />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
