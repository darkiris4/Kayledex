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
import { AddGradeScaleDialog } from "@/components/AddGradeScaleDialog"
import { HelpTooltip } from "@/components/HelpTooltip"

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
  const { activeStudent } = useStudents()
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Grading</CardTitle>
          <AddGradeScaleDialog familyId={activeStudent.family_id} onAdded={load} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gradeScales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grade scales yet.</p>
          ) : (
            <div className="flex items-start gap-6">
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
    </div>
  )
}
