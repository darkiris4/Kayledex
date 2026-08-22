import { useCallback, useEffect, useState } from "react"
import { api, type Course, type Curriculum, type Subject } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddCurriculumDialog } from "@/components/AddCurriculumDialog"
import { CurriculumCard } from "@/components/CurriculumCard"

interface CourseCardProps {
  course: Course
  subjects: Subject[]
}

export function CourseCard({ course, subjects }: CourseCardProps) {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const subjectName = subjects.find((s) => s.id === course.subject_id)?.name

  const reloadCurricula = useCallback(() => {
    api.curricula.list(course.id).then(setCurricula)
  }, [course.id])

  useEffect(() => {
    reloadCurricula()
  }, [reloadCurricula])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{course.name}</CardTitle>
          {subjectName && <p className="text-sm text-muted-foreground">{subjectName}</p>}
        </div>
        <AddCurriculumDialog courseId={course.id} onAdded={reloadCurricula} />
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
