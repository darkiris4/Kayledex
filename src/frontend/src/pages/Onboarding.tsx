import { useEffect, useState } from "react"
import { api, type ComplianceProfileSummary, type Subject } from "@/lib/api"
import { deriveSchoolYearName } from "@/lib/dates"
import { GRADE_LEVELS } from "@/lib/gradeLevels"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DurationInput } from "@/components/DurationInput"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Step = "welcome" | "setup" | "compliance" | "student" | "subjects" | "catchup" | "done"

const STEP_NUMBERS: Partial<Record<Step, number>> = {
  setup: 1,
  compliance: 2,
  student: 3,
  subjects: 4,
  catchup: 5,
}
const TOTAL_STEPS = 5

const WEEKDAYS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
]

interface OnboardingProps {
  onComplete: () => void
}

function StepHeader({ step, title }: { step: Step; title: string }) {
  const n = STEP_NUMBERS[step]
  return (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {n && <p className="text-sm text-muted-foreground">Step {n} of {TOTAL_STEPS}</p>}
    </CardHeader>
  )
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome")
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(true)

  const [familyName, setFamilyName] = useState("")
  const [yearStart, setYearStart] = useState("")
  const [yearEnd, setYearEnd] = useState("")

  const [profiles, setProfiles] = useState<ComplianceProfileSummary[]>([])
  const [profileId, setProfileId] = useState<string>("")
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([])

  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")

  const [checkedSubjects, setCheckedSubjects] = useState<Set<string>>(new Set())
  const [customSubject, setCustomSubject] = useState("")
  const [addedSubjects, setAddedSubjects] = useState<string[]>([])
  const [createdSubjects, setCreatedSubjects] = useState<Subject[]>([])

  const [wantsCatchUp, setWantsCatchUp] = useState<boolean | null>(null)
  const [catchUpSubjectId, setCatchUpSubjectId] = useState("")
  const [catchUpActivity, setCatchUpActivity] = useState("")
  const [catchUpDuration, setCatchUpDuration] = useState("")
  const [catchUpStart, setCatchUpStart] = useState("")
  const [catchUpEnd, setCatchUpEnd] = useState("")
  const [catchUpWeekdays, setCatchUpWeekdays] = useState<number[]>([0, 1, 2, 3, 4])
  const [catchUpResult, setCatchUpResult] = useState<{ created_count: number; skipped_dates: string[] } | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A family created earlier (e.g. an interrupted setup) should let a returning user
  // skip re-entering household info, not create a duplicate family.
  useEffect(() => {
    api.families.list().then((families) => {
      if (families.length > 0) {
        setFamilyId(families[0].id)
      }
      setCheckingExisting(false)
    })
  }, [])

  async function handleSetupSubmit() {
    if (!yearStart || !yearEnd) return
    if (!familyId && !familyName) return
    setSaving(true)
    setError(null)
    try {
      let fid = familyId
      if (!fid) {
        const family = await api.families.create({ name: familyName })
        fid = family.id
        setFamilyId(fid)
      }
      const list = await api.compliance.listProfiles()
      setProfiles(list)
      setStep("compliance")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleComplianceSubmit() {
    setSaving(true)
    setError(null)
    try {
      if (profileId) {
        const detail = await api.compliance.getProfile(profileId)
        setSuggestedSubjects(
          detail.requirements.filter((r) => r.type === "required_subject").map((r) => r.label),
        )
      } else {
        setSuggestedSubjects([])
      }
      setStep("student")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requirements")
    } finally {
      setSaving(false)
    }
  }

  async function handleStudentSubmit() {
    if (!familyId || !studentName) return
    setSaving(true)
    setError(null)
    try {
      const student = await api.students.create({
        family_id: familyId,
        name: studentName,
        grade_level: gradeLevel || undefined,
        date_of_birth: dateOfBirth || undefined,
      })
      setStudentId(student.id)
      await api.schoolYears.create({
        student_id: student.id,
        name: deriveSchoolYearName(yearStart, yearEnd),
        start_date: yearStart,
        end_date: yearEnd,
        grade: gradeLevel || undefined,
        compliance_profile_id: profileId || undefined,
      })
      setCheckedSubjects(new Set(suggestedSubjects))
      setStep("subjects")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function toggleSuggested(name: string) {
    setCheckedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustomSubject() {
    if (!customSubject.trim()) return
    setAddedSubjects((prev) => [...prev, customSubject.trim()])
    setCustomSubject("")
  }

  function removeAddedSubject(name: string) {
    setAddedSubjects((prev) => prev.filter((s) => s !== name))
  }

  async function handleSubjectsSubmit() {
    if (!familyId) return
    setSaving(true)
    setError(null)
    try {
      const names = [...checkedSubjects, ...addedSubjects]
      const created = await Promise.all(
        names.map((name) => api.subjects.create({ family_id: familyId, name })),
      )
      setCreatedSubjects(created)
      setStep("catchup")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save subjects")
    } finally {
      setSaving(false)
    }
  }

  function toggleCatchUpWeekday(day: number) {
    setCatchUpWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleCatchUpSubmit() {
    if (!studentId || !catchUpSubjectId || !catchUpStart || !catchUpEnd || catchUpWeekdays.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.quickLog.bulkCreate({
        student_id: studentId,
        subject_id: catchUpSubjectId,
        start_date: catchUpStart,
        end_date: catchUpEnd,
        weekdays: catchUpWeekdays,
        activity_description: catchUpActivity || undefined,
        duration_minutes: catchUpDuration ? Number(catchUpDuration) : undefined,
      })
      setCatchUpResult(res)
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log activities")
    } finally {
      setSaving(false)
    }
  }

  if (checkingExisting) return null

  return (
    <div className="mx-auto max-w-md">
      {step === "welcome" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <img src="/logo.png" alt="Kayledex" className="h-16 w-16" />
            <h1 className="text-2xl font-semibold">Welcome to Kayledex</h1>
            <p className="text-muted-foreground">
              A self-hosted homeschool recordkeeping app. Let's get your household set up —
              it only takes a few minutes.
            </p>
            <Button onClick={() => setStep("setup")} className="mt-2">
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "setup" && (
        <Card>
          <StepHeader step="setup" title="Household & School Year" />
          <CardContent className="flex flex-col gap-4">
            {!familyId && (
              <div className="flex flex-col gap-2">
                <Label>Family Name</Label>
                <Input
                  autoFocus
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g. The Smith Family"
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>School Year Starts</Label>
                <Input type="date" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>School Year Ends</Label>
                <Input type="date" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleSetupSubmit}
              disabled={saving || !yearStart || !yearEnd || (!familyId && !familyName)}
            >
              {saving ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "compliance" && (
        <Card>
          <StepHeader step="compliance" title="State Requirements" />
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              If your state has published homeschool requirements we track, choosing it here will
              suggest the subjects you need and set up the State Requirements checklist for you.
            </p>
            <div className="flex flex-col gap-2">
              <Label>State</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Not sure / set this up later" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profiles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No state profiles are available yet — you can skip this and configure it later.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleComplianceSubmit} disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "student" && (
        <Card>
          <StepHeader step="student" title="Add a Student" />
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Student Name</Label>
              <Input autoFocus value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Grade Level</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date of Birth (optional)</Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleStudentSubmit} disabled={saving || !studentName}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "subjects" && (
        <Card>
          <StepHeader step="subjects" title="Add Subjects" />
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Subjects are what you'll log activities against. You can always add or remove more
              later on the Students page.
            </p>

            {suggestedSubjects.length > 0 && (
              <div className="flex flex-col gap-2">
                {suggestedSubjects.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checkedSubjects.has(name)}
                      onCheckedChange={() => toggleSuggested(name)}
                    />
                    {name}
                  </label>
                ))}
              </div>
            )}

            {addedSubjects.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {addedSubjects.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeAddedSubject(name)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add another subject"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomSubject()}
              />
              <Button type="button" variant="outline" onClick={addCustomSubject} disabled={!customSubject.trim()}>
                Add
              </Button>
            </div>

            {checkedSubjects.size === 0 && addedSubjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                You can skip this, but you'll need at least one subject before you can log any
                activity.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleSubjectsSubmit} disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "catchup" && (
        <Card>
          <StepHeader step="catchup" title="Catch Up on Past Activity" />
          <CardContent className="flex flex-col gap-4">
            {wantsCatchUp === null && (
              <>
                <p className="text-sm text-muted-foreground">
                  If you've already been homeschooling and have activity from before today, you can
                  log it now for a whole date range at once, instead of one day at a time.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setWantsCatchUp(true)}>Yes, let's catch up</Button>
                  <Button variant="outline" onClick={() => setStep("done")}>
                    No, I'll start from today
                  </Button>
                </div>
              </>
            )}

            {wantsCatchUp && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Subject</Label>
                  <Select value={catchUpSubjectId} onValueChange={setCatchUpSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {createdSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Activity (optional)</Label>
                  <Input
                    placeholder="e.g. Saxon Math"
                    value={catchUpActivity}
                    onChange={(e) => setCatchUpActivity(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Duration (optional)</Label>
                  <DurationInput
                    valueMinutes={catchUpDuration}
                    onChange={setCatchUpDuration}
                    idPrefix="onboarding-catchup-duration"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>From</Label>
                    <Input type="date" value={catchUpStart} onChange={(e) => setCatchUpStart(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>To</Label>
                    <Input type="date" value={catchUpEnd} onChange={(e) => setCatchUpEnd(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Days of the Week</Label>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAYS.map((day) => (
                      <label key={day.value} className="flex items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={catchUpWeekdays.includes(day.value)}
                          onCheckedChange={() => toggleCatchUpWeekday(day.value)}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                {createdSubjects.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    You didn't add any subjects, so there's nothing to catch up yet — go back and
                    add one, or skip for now.
                  </p>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("done")}>
                    Skip
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCatchUpSubmit}
                    disabled={
                      saving ||
                      !catchUpSubjectId ||
                      !catchUpStart ||
                      !catchUpEnd ||
                      catchUpWeekdays.length === 0
                    }
                  >
                    {saving ? "Logging…" : "Log Activities"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <h1 className="text-2xl font-semibold">You're all set!</h1>
            <div className="flex w-full flex-col gap-2 rounded-lg border p-4 text-left text-sm">
              <p>
                <span className="text-muted-foreground">Student:</span> {studentName}
                {gradeLevel && ` (${gradeLevel})`}
              </p>
              <p>
                <span className="text-muted-foreground">School Year:</span>{" "}
                {deriveSchoolYearName(yearStart, yearEnd)}
              </p>
              <p className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground">Subjects:</span>{" "}
                {createdSubjects.length > 0 ? (
                  createdSubjects.map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-xs">
                      {s.name}
                    </Badge>
                  ))
                ) : (
                  <span>none yet — add some on the Students page</span>
                )}
              </p>
              <p>
                <span className="text-muted-foreground">State Requirements:</span>{" "}
                {profileId
                  ? profiles.find((p) => p.id === profileId)?.name
                  : "not set — configure anytime on the State Requirements page"}
              </p>
              {catchUpResult && (
                <p>
                  <span className="text-muted-foreground">Catch-up:</span> logged{" "}
                  {catchUpResult.created_count} day{catchUpResult.created_count === 1 ? "" : "s"}
                </p>
              )}
            </div>
            <Button onClick={onComplete} className="mt-2">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
