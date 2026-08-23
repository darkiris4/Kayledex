import { useCallback, useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { api, type SchoolYear, type Student, type Subject } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AddStudentDialog } from "@/components/AddStudentDialog"
import { AddSchoolYearDialog } from "@/components/AddSchoolYearDialog"
import { compressImage } from "@/lib/imageCompression"

function StudentSchoolYears({ student }: { student: Student }) {
  const [years, setYears] = useState<SchoolYear[]>([])

  const reload = useCallback(() => {
    api.schoolYears.list(student.id).then(setYears)
  }, [student.id])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleDelete(year: SchoolYear) {
    if (!window.confirm(`Delete school year "${year.name}"? This also removes its courses, curricula, and logged activities.`)) {
      return
    }
    try {
      await api.schoolYears.delete(year.id)
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">School Years</span>
        <AddSchoolYearDialog studentId={student.id} onAdded={reload} />
      </div>
      {years.length === 0 ? (
        <p className="text-sm text-muted-foreground">No school years yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {years.map((y) => (
            <li key={y.id} className="flex items-center justify-between text-sm">
              <span>
                {y.name} ({y.start_date} &ndash; {y.end_date})
              </span>
              <span className="flex items-center gap-2">
                {y.active && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
                <AddSchoolYearDialog
                  studentId={student.id}
                  schoolYear={y}
                  onAdded={reload}
                  trigger={
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                      Edit
                    </Button>
                  }
                />
                {years.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(y)}
                  >
                    Delete
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StudentPhoto({ student, onChanged }: { student: Student; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false)
  const inputId = `student-photo-${student.id}`

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const compressed = await compressImage(file, 800, 0.85)
      await api.students.uploadPhoto(student.id, compressed)
      onChanged()
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    await api.students.deletePhoto(student.id)
    onChanged()
  }

  return (
    <div className="relative shrink-0">
      <label
        htmlFor={inputId}
        className="block h-14 w-14 cursor-pointer overflow-hidden rounded-full border bg-muted"
        title="Change photo"
      >
        {student.photo_path ? (
          <img
            src={`${api.students.photoUrl(student.id)}?v=${student.photo_path}`}
            alt={student.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-medium text-muted-foreground">
            {student.name.charAt(0).toUpperCase()}
          </div>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        capture="environment"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ""
        }}
      />
      {student.photo_path && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove photo"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background text-xs text-muted-foreground shadow hover:text-destructive"
        >
          ×
        </button>
      )}
    </div>
  )
}

function StudentCard({ family_id, student, onChanged }: { family_id: string; student: Student; onChanged: () => void }) {
  async function toggleActive() {
    await api.students.update(student.id, { active: !student.active })
    onChanged()
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Permanently delete ${student.name} and everything tied to them — school years, courses, curricula, logged activities, assessments, and attachments? This cannot be undone.`,
      )
    ) {
      return
    }
    await api.students.delete(student.id)
    onChanged()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <StudentPhoto student={student} onChanged={onChanged} />
          <div>
            <CardTitle className="flex items-center gap-2">
              {student.name}
              {!student.active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </CardTitle>
            {student.grade_level && <p className="text-sm text-muted-foreground">{student.grade_level}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <AddStudentDialog
            familyId={family_id}
            student={student}
            onSaved={onChanged}
            trigger={
              <Button size="sm" variant="outline">
                Edit
              </Button>
            }
          />
          <Button size="sm" variant="ghost" onClick={toggleActive}>
            {student.active ? "Deactivate" : "Reactivate"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <StudentSchoolYears student={student} />
      </CardContent>
    </Card>
  )
}

function SubjectsCard({ familyId }: { familyId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSubjectName, setNewSubjectName] = useState("")
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => {
    api.subjects.list(familyId).then(setSubjects)
  }, [familyId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleAdd() {
    if (!newSubjectName) return
    setSaving(true)
    try {
      await api.subjects.create({ family_id: familyId, name: newSubjectName })
      setNewSubjectName("")
      reload()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this subject?")) return
    await api.subjects.delete(id)
    reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subjects</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm"
              >
                {s.name}
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${s.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Mathematics"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="max-w-64"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={!newSubjectName || saving}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function Students() {
  const { activeStudent, reload: reloadContext } = useStudents()
  const [students, setStudents] = useState<Student[]>([])

  // Local-only refresh: safe to call on mount and whenever the family changes.
  // Must NOT also call reloadContext() here — that flips the global `loading`
  // flag, which previously caused the whole app shell to unmount/remount on
  // every load, re-triggering this same effect and looping forever.
  const refresh = useCallback(() => {
    if (!activeStudent) return
    api.students.list(activeStudent.family_id).then(setStudents)
  }, [activeStudent])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudent?.family_id])

  // Used after an actual edit (add/update/toggle), so the global active-student
  // switcher picks up the change too — but only once per user action, not on mount.
  const handleChanged = useCallback(() => {
    refresh()
    reloadContext()
  }, [refresh, reloadContext])

  if (!activeStudent) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Students</h2>
        <AddStudentDialog familyId={activeStudent.family_id} onSaved={handleChanged} />
      </div>

      <div className="flex flex-col gap-4">
        {students.map((student) => (
          <StudentCard
            key={student.id}
            family_id={activeStudent.family_id}
            student={student}
            onChanged={handleChanged}
          />
        ))}
      </div>

      <SubjectsCard familyId={activeStudent.family_id} />
    </div>
  )
}
