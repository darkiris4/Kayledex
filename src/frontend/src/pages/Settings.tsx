import { useCallback, useEffect, useState } from "react"
import { useStudents } from "@/context/StudentContext"
import { useTheme, type Accent, type Background } from "@/context/ThemeContext"
import {
  api,
  type ComplianceProfileSummary,
  type Family,
  type GradeScale,
  type SchoolYear,
  type Settings as SettingsType,
  type TimeTrackingMode,
} from "@/lib/api"
import { toDateString } from "@/lib/dates"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AddGradeScaleDialog } from "@/components/AddGradeScaleDialog"
import { HelpTooltip } from "@/components/HelpTooltip"
import { SCHOOL_DAY_STATUSES, STATUS_LABELS, DEFAULT_STATUS_COLORS } from "@/lib/schoolDayStatus"

function FieldLabel({ children, help }: { children: React.ReactNode; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{children}</Label>
      <HelpTooltip text={help} />
    </div>
  )
}

// Swatch shades are picked to track the actual light/dark oklch values in index.css
// (dark accents there are much lighter, L≈0.75, to pair with near-black button text) —
// so the picker preview always matches what the currently active mode will apply.
const ACCENT_OPTIONS: { value: Accent; label: string; swatch: string }[] = [
  { value: "default", label: "Kayledex", swatch: "bg-[#0080A2] dark:bg-[#25C0E6]" },
  { value: "blue", label: "Blue", swatch: "bg-blue-600 dark:bg-blue-400" },
  { value: "green", label: "Green", swatch: "bg-emerald-600 dark:bg-emerald-400" },
  { value: "purple", label: "Purple", swatch: "bg-purple-600 dark:bg-purple-400" },
  { value: "rose", label: "Rose", swatch: "bg-rose-600 dark:bg-rose-400" },
]

const BACKGROUND_OPTIONS: { value: Background; label: string; swatch: string }[] = [
  { value: "none", label: "None", swatch: "bg-background" },
  {
    value: "warm",
    label: "Warm",
    swatch: "bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-950 dark:to-orange-900",
  },
  {
    value: "cool",
    label: "Cool",
    swatch: "bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-sky-950 dark:to-indigo-900",
  },
]

export function Settings() {
  const { activeStudent, students, loading: studentsLoading } = useStudents()
  const { accent, setAccent, background, setBackground } = useTheme()
  const [family, setFamily] = useState<Family | null>(null)
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null)
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([])
  const [profiles, setProfiles] = useState<ComplianceProfileSummary[]>([])

  const [familyForm, setFamilyForm] = useState({ name: "", address: "", contact_info: "" })
  const [savingFamily, setSavingFamily] = useState(false)

  const [attendanceForm, setAttendanceForm] = useState({
    track_instructional_days: true,
    track_instructional_hours: true,
    min_instructional_days: "",
    min_hours_per_day: "",
  })
  const [savingAttendance, setSavingAttendance] = useState(false)

  const [preferencesForm, setPreferencesForm] = useState({
    time_tracking_mode: "duration" as TimeTrackingMode,
    curriculum_tracking_enabled: true,
  })
  const [savingPreferences, setSavingPreferences] = useState(false)

  const [brandingForm, setBrandingForm] = useState({
    parent_educator_name: "",
    report_footer_text: "",
  })
  const [savingBranding, setSavingBranding] = useState(false)

  const [colorForm, setColorForm] = useState<Record<string, string>>(DEFAULT_STATUS_COLORS)
  const [savingColors, setSavingColors] = useState(false)

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    if (!activeStudent) return
    const families = await api.families.list()
    const fam = families.find((f) => f.id === activeStudent.family_id) ?? null
    setFamily(fam)
    if (fam) {
      setFamilyForm({ name: fam.name, address: fam.address ?? "", contact_info: fam.contact_info ?? "" })
    }

    const s = await api.settings.get(activeStudent.family_id)
    setSettings(s)
    setPreferencesForm({
      time_tracking_mode: s.time_tracking_mode,
      curriculum_tracking_enabled: s.curriculum_tracking_enabled,
    })
    setBrandingForm({
      parent_educator_name: s.parent_educator_name ?? "",
      report_footer_text: s.report_footer_text ?? "",
    })
    setColorForm({ ...DEFAULT_STATUS_COLORS, ...(s.calendar_status_colors ?? {}) })

    const years = await api.schoolYears.list(activeStudent.id)
    const today = toDateString(new Date())
    const activeYear = years.find((y) => y.start_date <= today && y.end_date >= today) ?? null
    setSchoolYear(activeYear)
    if (activeYear) {
      setAttendanceForm({
        track_instructional_days: activeYear.track_instructional_days,
        track_instructional_hours: activeYear.track_instructional_hours,
        min_instructional_days: activeYear.min_instructional_days?.toString() ?? "",
        min_hours_per_day: activeYear.min_hours_per_day?.toString() ?? "",
      })
    }

    setGradeScales(await api.gradeScales.list(activeStudent.family_id))
    setProfiles(await api.compliance.listProfiles())
  }, [activeStudent])

  useEffect(() => {
    load()
  }, [load])

  async function saveFamily() {
    if (!family) return
    setSavingFamily(true)
    try {
      await api.families.update(family.id, familyForm)
      load()
    } finally {
      setSavingFamily(false)
    }
  }

  async function saveAttendance() {
    if (!schoolYear) return
    setSavingAttendance(true)
    try {
      await api.schoolYears.update(schoolYear.id, {
        track_instructional_days: attendanceForm.track_instructional_days,
        track_instructional_hours: attendanceForm.track_instructional_hours,
        min_instructional_days: attendanceForm.min_instructional_days
          ? Number(attendanceForm.min_instructional_days)
          : undefined,
        min_hours_per_day: attendanceForm.min_hours_per_day
          ? Number(attendanceForm.min_hours_per_day)
          : undefined,
      })
      load()
    } finally {
      setSavingAttendance(false)
    }
  }

  async function savePreferences() {
    if (!activeStudent) return
    setSavingPreferences(true)
    try {
      await api.settings.update(activeStudent.family_id, preferencesForm)
      load()
    } finally {
      setSavingPreferences(false)
    }
  }

  async function saveBranding() {
    if (!activeStudent) return
    setSavingBranding(true)
    try {
      await api.settings.update(activeStudent.family_id, brandingForm)
      load()
    } finally {
      setSavingBranding(false)
    }
  }

  async function setActiveGradeScale(gradeScaleId: string) {
    if (!activeStudent) return
    await api.settings.update(activeStudent.family_id, { active_grade_scale_id: gradeScaleId })
    load()
  }

  async function toggleReportBranding(enabled: boolean) {
    if (!activeStudent) return
    await api.settings.update(activeStudent.family_id, { report_branding_enabled: enabled })
    load()
  }

  async function uploadReportLogo(file: File) {
    if (!activeStudent) return
    await api.settings.uploadReportLogo(activeStudent.family_id, file)
    load()
  }

  async function removeReportLogo() {
    if (!activeStudent) return
    await api.settings.deleteReportLogo(activeStudent.family_id)
    load()
  }

  async function saveColors() {
    if (!activeStudent) return
    setSavingColors(true)
    try {
      await api.settings.update(activeStudent.family_id, { calendar_status_colors: colorForm })
      load()
    } finally {
      setSavingColors(false)
    }
  }

  async function handleFactoryReset() {
    const finalWarning = window.confirm(
      "Final check: this permanently deletes every family, student, and record in this installation. There is no undo. Continue?",
    )
    if (!finalWarning) return
    setResetting(true)
    try {
      await api.admin.factoryReset()
      window.location.href = "/"
    } catch {
      setResetting(false)
    }
  }

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

  if (!activeStudent || !family || !settings) return null

  const activeProfileName = schoolYear?.compliance_profile_id
    ? profiles.find((p) => p.id === schoolYear.compliance_profile_id)?.name
    : null

  const activeScale = gradeScales.find((gs) => gs.id === settings.active_grade_scale_id)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <FieldLabel help="Changes the color of buttons, links, focus rings, and badges throughout the app. Purely cosmetic, stored on this device/browser only — dark mode itself is toggled from the header.">
              Accent Color
            </FieldLabel>
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => setAccent(opt.value)}
                  className={`h-8 w-8 rounded-full ${opt.swatch} ${
                    accent === opt.value ? "ring-2 ring-offset-2 ring-ring" : ""
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="A subtle background tint behind the app content. Cards stay opaque, so this never affects readability.">
              Background
            </FieldLabel>
            <div className="flex gap-2">
              {BACKGROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => setBackground(opt.value)}
                  className={`h-8 w-14 rounded-md border ${opt.swatch} ${
                    background === opt.value ? "ring-2 ring-offset-2 ring-ring" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Family Name</Label>
            <Input
              value={familyForm.name}
              onChange={(e) => setFamilyForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Address</Label>
            <Input
              value={familyForm.address}
              onChange={(e) => setFamilyForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Contact Info</Label>
            <Input
              value={familyForm.contact_info}
              onChange={(e) => setFamilyForm((f) => ({ ...f, contact_info: e.target.value }))}
            />
          </div>
          <Button size="sm" className="self-start" onClick={saveFamily} disabled={savingFamily}>
            {savingFamily ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance ({schoolYear?.name ?? "no active school year"})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!schoolYear ? (
            <p className="text-sm text-muted-foreground">No school year covers today's date yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={attendanceForm.track_instructional_days}
                  onCheckedChange={(c) =>
                    setAttendanceForm((f) => ({ ...f, track_instructional_days: c === true }))
                  }
                />
                <FieldLabel help="Counts this school year's days toward a school-day total, shown on the Dashboard and checked against your state's minimum (if any) on the State Requirements page.">
                  Track school days
                </FieldLabel>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={attendanceForm.track_instructional_hours}
                  onCheckedChange={(c) =>
                    setAttendanceForm((f) => ({ ...f, track_instructional_hours: c === true }))
                  }
                />
                <FieldLabel help="Sums logged activity durations into an hours-logged total, used the same way as school days.">
                  Track hours logged
                </FieldLabel>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel help="Only set this if your state requires a minimum number of school days — leave blank otherwise (Illinois sets no minimum).">
                    Minimum school days
                  </FieldLabel>
                  <Input
                    type="number"
                    placeholder="No minimum"
                    value={attendanceForm.min_instructional_days}
                    onChange={(e) =>
                      setAttendanceForm((f) => ({ ...f, min_instructional_days: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel help="Only set this if your state requires a minimum number of hours per day — leave blank otherwise.">
                    Minimum hours/day
                  </FieldLabel>
                  <Input
                    type="number"
                    placeholder="No minimum"
                    value={attendanceForm.min_hours_per_day}
                    onChange={(e) =>
                      setAttendanceForm((f) => ({ ...f, min_hours_per_day: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button size="sm" className="self-start" onClick={saveAttendance} disabled={savingAttendance}>
                {savingAttendance ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <FieldLabel help="How activities record time: exact duration in minutes, a start/end time range, or no time tracking at all.">
              Time Tracking
            </FieldLabel>
            <Select
              value={preferencesForm.time_tracking_mode}
              onValueChange={(v) =>
                setPreferencesForm((f) => ({ ...f, time_tracking_mode: v as TimeTrackingMode }))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="start_end">Start/End Time</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={preferencesForm.curriculum_tracking_enabled}
              onCheckedChange={(c) =>
                setPreferencesForm((f) => ({ ...f, curriculum_tracking_enabled: c === true }))
              }
            />
            <FieldLabel help="Turn off if you don't want to track curricula and lessons — activities can still be logged either way.">
              Curriculum tracking enabled
            </FieldLabel>
          </div>
          <Button size="sm" className="self-start" onClick={savePreferences} disabled={savingPreferences}>
            {savingPreferences ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Grading</CardTitle>
          <AddGradeScaleDialog familyId={activeStudent.family_id} onAdded={load} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gradeScales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grade scales yet.</p>
          ) : (
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex flex-col gap-2">
                <FieldLabel help="Which letter-grade scale is used to grade assessments and report cards. Change it any time — every past assessment's displayed grade updates immediately, since grades are computed on the fly rather than stored.">
                  Active Grade Scale
                </FieldLabel>
                <Select value={settings.active_grade_scale_id ?? ""} onValueChange={setActiveGradeScale}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="None selected" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeScales.map((gs) => (
                      <SelectItem key={gs.id} value={gs.id}>
                        {gs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeScale && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">
                    {activeScale.name} bands
                  </span>
                  {activeScale.bands
                    .slice()
                    .sort((a, b) => b.min_percentage - a.min_percentage)
                    .map((band) => (
                      <span key={band.id}>
                        {band.letter}: {band.min_percentage}&ndash;{band.max_percentage}%
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">State Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {activeProfileName
              ? `Active requirements for ${schoolYear?.name}: ${activeProfileName}`
              : "No state requirements set for the active school year yet."}{" "}
            Set per school year on the{" "}
            <a href="/compliance" className="underline">
              State Requirements
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Branding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={settings.report_branding_enabled}
              onCheckedChange={(c) => toggleReportBranding(c === true)}
            />
            <FieldLabel help="Shows a small logo mark in the corner of every generated PDF report — the Kayledex mark by default, or your own logo if you upload one below.">
              Show logo on reports
            </FieldLabel>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="Replaces the default Kayledex mark on reports with your own family or co-op logo. Remove it to go back to the Kayledex default.">
              Report Logo
            </FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              {settings.report_branding_logo_path ? (
                <>
                  <span className="text-sm text-muted-foreground">Custom logo uploaded</span>
                  <Button size="sm" variant="outline" onClick={removeReportLogo}>
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">Using the Kayledex default</span>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    capture="environment"
                    className="max-w-64"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadReportLogo(file)
                      e.target.value = ""
                    }}
                  />
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="Shown on every generated PDF report.">Parent/Educator Name</FieldLabel>
            <Input
              value={brandingForm.parent_educator_name}
              onChange={(e) =>
                setBrandingForm((f) => ({ ...f, parent_educator_name: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="Printed at the bottom of every generated PDF report.">
              Report Footer Text
            </FieldLabel>
            <Input
              value={brandingForm.report_footer_text}
              onChange={(e) => setBrandingForm((f) => ({ ...f, report_footer_text: e.target.value }))}
            />
          </div>
          <Button size="sm" className="self-start" onClick={saveBranding} disabled={savingBranding}>
            {savingBranding ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <FieldLabel help="The genuinely complete backup: every record (students, school years, subjects, courses, curricula, lessons, school days, logged activities, assessments, grade scales, settings) plus the real files behind every attachment — a photo of a worksheet, a scanned test. Use this one to actually back up or move installations.">
              Full Backup (ZIP)
            </FieldLabel>
            <Button asChild size="sm" className="self-start">
              <a href={`/api/export/backup?family_id=${activeStudent.family_id}`}>Download Backup</a>
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="The same structured data as the Full Backup, but data only — attachment files (worksheet photos, scanned tests) are listed by name, not included. Useful for inspecting or re-importing the data itself; use the ZIP above if you need the attachments too.">
              Data Only (JSON)
            </FieldLabel>
            <Button asChild size="sm" variant="outline" className="self-start">
              <a href={`/api/export/json?family_id=${activeStudent.family_id}`}>Download JSON</a>
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel help="One CSV file per entity type, for opening in a spreadsheet or importing elsewhere. Same data-only caveat as JSON — no attachment files.">
              Export by Entity (CSV)
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {[
                { entity: "subjects", label: "Subjects" },
                { entity: "students", label: "Students" },
                { entity: "school_years", label: "School Years" },
                { entity: "assessments", label: "Assessments" },
                { entity: "instruction_records", label: "Activities" },
                { entity: "school_days", label: "Attendance" },
              ].map(({ entity, label }) => (
                <Button key={entity} asChild size="sm" variant="outline">
                  <a href={`/api/export/csv/${entity}?family_id=${activeStudent.family_id}`}>
                    {label}
                  </a>
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            For a whole-server backup (every family, via <code>pg_dump</code>) rather than
            just this family, run <code>scripts/backup.sh</code> on the server. See the README
            for restore steps.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar Colors</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Customize the color shown on the Calendar for each day status.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SCHOOL_DAY_STATUSES.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${STATUS_LABELS[status]} color`}
                  value={colorForm[status] ?? DEFAULT_STATUS_COLORS[status]}
                  onChange={(e) =>
                    setColorForm((f) => ({ ...f, [status]: e.target.value }))
                  }
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <span className="text-sm">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveColors} disabled={savingColors}>
              {savingColors ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setColorForm(DEFAULT_STATUS_COLORS)}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <FieldLabel help="Permanently deletes every family, student, school year, subject, and logged record in this installation. There is no undo — this is meant for wiping test data or truly starting over.">
              Delete Everything
            </FieldLabel>
            <p className="text-sm text-muted-foreground">
              Erases all data in this installation and returns it to a fresh-install
              state. This cannot be undone.
            </p>
          </div>
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="self-start">
                Delete Everything
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will permanently delete every family, student, school year,
                subject, activity, assessment, and setting stored in this
                installation — <strong>there is no undo</strong>. You'll be asked to
                confirm one more time before it actually runs.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={resetting}
                  onClick={() => {
                    setResetDialogOpen(false)
                    handleFactoryReset()
                  }}
                >
                  {resetting ? "Deleting…" : "Yes, I understand — Continue"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
