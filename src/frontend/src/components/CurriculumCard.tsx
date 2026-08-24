import { useCallback, useEffect, useState } from "react"
import { api, type Curriculum, type Lesson } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { AddLessonDialog } from "@/components/AddLessonDialog"

interface CurriculumCardProps {
  curriculum: Curriculum
  onProgressChanged: () => void
}

export function CurriculumCard({ curriculum, onProgressChanged }: CurriculumCardProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])

  const reloadLessons = useCallback(() => {
    api.lessons.list(curriculum.id).then(setLessons)
  }, [curriculum.id])

  useEffect(() => {
    reloadLessons()
  }, [reloadLessons])

  async function toggleLesson(lesson: Lesson) {
    const nextStatus = lesson.completion_status === "complete" ? "not_started" : "complete"
    await api.lessons.update(lesson.id, { completion_status: nextStatus })
    reloadLessons()
    onProgressChanged()
  }

  async function deleteLesson(lesson: Lesson) {
    if (!window.confirm(`Delete "${lesson.name}"?`)) return
    await api.lessons.delete(lesson.id)
    reloadLessons()
    onProgressChanged()
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{curriculum.name}</p>
          {curriculum.publisher && (
            <p className="text-xs text-muted-foreground">{curriculum.publisher}</p>
          )}
        </div>
        <AddLessonDialog
          curriculumId={curriculum.id}
          nextNumber={lessons.length + 1}
          onAdded={() => {
            reloadLessons()
            onProgressChanged()
          }}
        />
      </div>

      {curriculum.lessons_total > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Progress value={curriculum.completion_percentage} className="h-2" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {curriculum.lessons_completed}/{curriculum.lessons_total} ·{" "}
            {curriculum.completion_percentage}%
          </span>
        </div>
      )}

      {lessons.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Checkbox
                checked={lesson.completion_status === "complete"}
                onCheckedChange={() => toggleLesson(lesson)}
              />
              <span className={lesson.completion_status === "complete" ? "text-muted-foreground line-through" : ""}>
                {lesson.number != null ? `${lesson.number}. ` : ""}
                {lesson.name}
              </span>
              {lesson.completion_status === "complete" && lesson.completed_date && (
                <span className="text-xs text-muted-foreground">
                  (completed {lesson.completed_date})
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <AddLessonDialog
                  curriculumId={curriculum.id}
                  nextNumber={lessons.length + 1}
                  lesson={lesson}
                  onAdded={() => {
                    reloadLessons()
                    onProgressChanged()
                  }}
                  trigger={
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                      Edit
                    </Button>
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => deleteLesson(lesson)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
