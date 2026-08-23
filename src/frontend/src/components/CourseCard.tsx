import { useCallback, useEffect, useState } from "react"
import { api, type Course, type Curriculum, type Subject } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddCourseDialog } from "@/components/AddCourseDialog"
import { AddCurriculumDialog } from "@/components/AddCurriculumDialog"
import { CurriculumCard } from "@/components/CurriculumCard"

interface CourseCardProps {
  course: Course
  subjects: Subject[]
  onChanged: () => void
}

export function CourseCard({ course, subjects, onChanged }: CourseCardProps) {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const subjectName = subjects.find((s) => s.id === course.subject_id)?.name

  const reloadCurricula = useCallback(() => {
    api.curricula.list(course.id).then(setCurricula)
  }, [course.id])

  useEffect(() => {
    reloadCurricula()
  }, [reloadCurricula])

  async function handleDelete() {
    if (!window.confirm(`Delete "${course.name}"? This also removes its curricula and lessons.`)) {
      return
    }
    await api.courses.delete(course.id)
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{course.name}</CardTitle>
          {subjectName && <p className="text-sm text-muted-foreground">{subjectName}</p>}
        </div>
        <div className="flex gap-2">
          <AddCourseDialog
            schoolYearId={course.school_year_id}
            subjects={subjects}
            course={course}
            onAdded={onChanged}
            trigger={
              <Button size="sm" variant="outline">
                Edit
              </Button>
            }
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
          <AddCurriculumDialog courseId={course.id} onAdded={reloadCurricula} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {curricula.length === 0 ? (
          <p className="text-sm text-muted-foreground">No curriculum added yet.</p>
        ) : (
          curricula.map((curriculum) => (
            <CurriculumCard
              key={curriculum.id}
              curriculum={curriculum}
              onProgressChanged={reloadCurricula}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
