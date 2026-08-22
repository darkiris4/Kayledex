import { useCallback, useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import {
  api,
  type ComplianceProfileSummary,
  type ComplianceReport,
  type SchoolYear,
  type Subject,
} from "@/lib/api"
import { toDateString } from "@/lib/dates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapSubjectPicker } from "@/components/MapSubjectPicker"

export function Compliance() {
  const { activeStudent } = useStudents()
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [profiles, setProfiles] = useState<ComplianceProfileSummary[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [report, setReport] = useState<ComplianceReport | null>(null)

  useEffect(() => {
    if (!activeStudent) return
    api.subjects.list(activeStudent.family_id).then(setSubjects)
    api.compliance.listProfiles().then(setProfiles)
    api.schoolYears.list(activeStudent.id).then((years) => {
      const today = toDateString(new Date())
      setSchoolYear(years.find((y) => y.start_date <= today && y.end_date >= today) ?? null)
    })
  }, [activeStudent])

  const reloadReport = useCallback(() => {
    if (!schoolYear) return
    api.compliance.getReport(schoolYear.id).then(setReport)
  }, [schoolYear])

  useEffect(() => {
    reloadReport()
  }, [reloadReport])

  async function handleSetProfile() {
    if (!schoolYear || !selectedProfileId) return
    const updated = await api.schoolYears.update(schoolYear.id, {
      compliance_profile_id: selectedProfileId,
    })
    setSchoolYear(updated)
  }

  if (!activeStudent) return null

  if (!schoolYear) {
    return <p className="text-muted-foreground">No school year covers today's date yet.</p>
  }

  if (!schoolYear.compliance_profile_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a Compliance Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a state profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selectedProfileId} onClick={handleSetProfile}>
            Set
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!report) return <p className="text-muted-foreground">Loading…</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{report.profile?.name}</h2>
        <p className="text-xs text-muted-foreground">
          Profile version {report.profile?.version} · last verified {report.profile?.last_verified}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ul className="flex flex-col gap-3">
            {report.results.map((result) => (
              <li key={result.requirement_id} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className={result.satisfied ? "text-emerald-600" : "text-muted-foreground"}>
                    {result.satisfied ? "✓" : "○"}
                  </span>
                  <span>
                    {result.label}
                    <span className="ml-2 text-xs text-muted-foreground">{result.detail}</span>
                  </span>
                </span>
                {result.type === "required_subject" && result.detail.startsWith("No subject mapped") && (
                  <MapSubjectPicker
                    requirementId={result.requirement_id}
                    subjects={subjects}
                    onMapped={reloadReport}
                  />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {report.disclaimer && (
        <p className="text-xs text-muted-foreground">{report.disclaimer}</p>
      )}
    </div>
  )
}
