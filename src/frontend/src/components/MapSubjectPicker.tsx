import { useState } from "react"
import { api, type Subject } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MapSubjectPickerProps {
  requirementId: string
  subjects: Subject[]
  onMapped: () => void
}

export function MapSubjectPicker({ requirementId, subjects, onMapped }: MapSubjectPickerProps) {
  const [subjectId, setSubjectId] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleMap() {
    if (!subjectId) return
    setSaving(true)
    try {
      await api.compliance.mapSubject(requirementId, subjectId)
      onMapped()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger size="sm" className="h-8 w-[160px]">
          <SelectValue placeholder="Map a subject…" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!subjectId || saving} onClick={handleMap}>
        Map
      </Button>
    </div>
  )
}
