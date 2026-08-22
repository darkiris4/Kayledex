export interface Family {
  id: string
  name: string
  address: string | null
  contact_info: string | null
}

export interface Student {
  id: string
  family_id: string
  name: string
  date_of_birth: string | null
  grade_level: string | null
  student_identifier: string | null
  start_date: string | null
  active: boolean
}

export interface SchoolYear {
  id: string
  student_id: string
  name: string
  start_date: string
  end_date: string
  grade: string | null
  active: boolean
  track_instructional_days: boolean
  track_instructional_hours: boolean
  min_instructional_days: number | null
  min_hours_per_day: number | null
  compliance_profile_id: string | null
}

export interface Subject {
  id: string
  family_id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  active: boolean
}

export type SchoolDayStatus =
  | "instructional"
  | "partial"
  | "non_instructional"
  | "holiday"
  | "vacation"
  | "sick"
  | "field_trip"
  | "other"

export interface SchoolDay {
  id: string
  school_year_id: string
  date: string
  status: SchoolDayStatus
  notes: string | null
}

export interface SchoolDaySummary extends SchoolDay {
  total_minutes: number
}

export interface InstructionRecord {
  id: string
  school_day_id: string
  subject_id: string
  course_id: string | null
  curriculum_id: string | null
  lesson_id: string | null
  activity_description: string | null
  duration_minutes: number | null
  start_time: string | null
  end_time: string | null
  completed: boolean
  notes: string | null
}

export interface DashboardTodayRecord {
  id: string
  subject_name: string
  activity_description: string | null
  duration_minutes: number | null
  completed: boolean
}

export interface DashboardSummary {
  student: Student
  active_school_year: SchoolYear | null
  today: {
    date: string
    records: DashboardTodayRecord[]
    total_minutes: number
  }
  this_week: {
    start: string
    end: string
    school_days: number
    total_minutes: number
  }
  this_year: {
    instructional_days: number
  }
}

export interface Course {
  id: string
  school_year_id: string
  subject_id: string
  name: string
}

export interface Curriculum {
  id: string
  course_id: string
  name: string
  publisher: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  lessons_total: number
  lessons_completed: number
  completion_percentage: number
}

export type LessonStatus = "not_started" | "in_progress" | "complete"

export interface Lesson {
  id: string
  curriculum_id: string
  number: number | null
  name: string
  description: string | null
  expected_duration_minutes: number | null
  completion_status: LessonStatus
  notes: string | null
}

export interface GradeScaleBand {
  id: string
  letter: string
  min_percentage: number
  max_percentage: number
}

export interface GradeCategoryWeight {
  id: string
  category: string
  weight_percent: number
}

export interface GradeScale {
  id: string
  family_id: string
  name: string
  weighted: boolean
  bands: GradeScaleBand[]
  category_weights: GradeCategoryWeight[]
}

export type AssessmentType = "assignment" | "quiz" | "test" | "project" | "oral" | "other"

export interface Assessment {
  id: string
  student_id: string
  subject_id: string
  course_id: string | null
  curriculum_id: string | null
  lesson_id: string | null
  name: string
  date: string
  type: AssessmentType
  points_earned: number | null
  points_possible: number | null
  weight: number | null
  notes: string | null
  percentage: number | null
  letter_grade: string | null
}

export type TimeTrackingMode = "duration" | "start_end" | "disabled"

export interface Settings {
  id: string
  family_id: string
  time_tracking_mode: TimeTrackingMode
  curriculum_tracking_enabled: boolean
  active_grade_scale_id: string | null
  report_branding_logo_path: string | null
  report_branding_enabled: boolean
  report_footer_text: string | null
  parent_educator_name: string | null
}

export interface ComplianceProfileSummary {
  id: string
  state_code: string
  name: string
  version: string
  last_verified: string
}

export interface ComplianceRequirement {
  id: string
  type: string
  label: string
  description: string | null
  numeric_value: number | null
  notes: string | null
  mapped_subject_ids: string[]
}

export interface ComplianceProfileDetail extends ComplianceProfileSummary {
  source_urls: string[]
  disclaimer: string
  notes: string | null
  requirements: ComplianceRequirement[]
}

export interface ComplianceRequirementResult {
  requirement_id: string
  type: string
  label: string
  satisfied: boolean
  detail: string
}

export interface ComplianceReport {
  school_year_id: string
  profile: ComplianceProfileSummary | null
  results: ComplianceRequirementResult[]
  disclaimer: string | null
}

export type AttachmentAssociationType = "instruction_record" | "assessment"

export interface Attachment {
  id: string
  filename: string
  content_type: string
  associated_type: AttachmentAssociationType
  associated_id: string
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, body.detail ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  families: {
    list: () => request<Family[]>("/families"),
    create: (data: Partial<Family>) =>
      request<Family>("/families", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Family>) =>
      request<Family>(`/families/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  students: {
    list: (familyId?: string) =>
      request<Student[]>(`/students${familyId ? `?family_id=${familyId}` : ""}`),
    create: (data: Partial<Student>) =>
      request<Student>("/students", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Student>) =>
      request<Student>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  schoolYears: {
    list: (studentId?: string) =>
      request<SchoolYear[]>(`/school-years${studentId ? `?student_id=${studentId}` : ""}`),
    create: (data: Partial<SchoolYear>) =>
      request<SchoolYear>("/school-years", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SchoolYear>) =>
      request<SchoolYear>(`/school-years/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  subjects: {
    list: (familyId?: string) =>
      request<Subject[]>(`/subjects${familyId ? `?family_id=${familyId}` : ""}`),
    create: (data: Partial<Subject>) =>
      request<Subject>("/subjects", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/subjects/${id}`, { method: "DELETE" }),
  },
  quickLog: {
    create: (data: {
      student_id: string
      subject_id: string
      date: string
      activity_description?: string
      duration_minutes?: number
      completed?: boolean
      notes?: string
    }) => request<InstructionRecord>("/quick-log", { method: "POST", body: JSON.stringify(data) }),
    bulkCreate: (data: {
      student_id: string
      subject_id: string
      start_date: string
      end_date: string
      weekdays: number[]
      activity_description?: string
      duration_minutes?: number
      completed?: boolean
      notes?: string
    }) =>
      request<{ created_count: number; skipped_dates: string[] }>("/quick-log/bulk", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  schoolDays: {
    list: (params: { school_year_id?: string; start?: string; end?: string }) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null) as [string, string][],
      )
      return request<SchoolDay[]>(`/school-days?${qs.toString()}`)
    },
    create: (data: Partial<SchoolDay>) =>
      request<SchoolDay>("/school-days", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SchoolDay>) =>
      request<SchoolDay>(`/school-days/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    summary: (params: { school_year_id: string; start: string; end: string }) =>
      request<SchoolDaySummary[]>(`/school-days/summary?${new URLSearchParams(params).toString()}`),
  },
  instructionRecords: {
    list: (schoolDayId: string) =>
      request<InstructionRecord[]>(`/instruction-records?school_day_id=${schoolDayId}`),
    update: (id: string, data: Partial<InstructionRecord>) =>
      request<InstructionRecord>(`/instruction-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/instruction-records/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    get: (studentId: string) => request<DashboardSummary>(`/dashboard?student_id=${studentId}`),
  },
  courses: {
    list: (schoolYearId: string) => request<Course[]>(`/courses?school_year_id=${schoolYearId}`),
    create: (data: Partial<Course>) =>
      request<Course>("/courses", { method: "POST", body: JSON.stringify(data) }),
  },
  curricula: {
    list: (courseId: string) => request<Curriculum[]>(`/curricula?course_id=${courseId}`),
    create: (data: Partial<Curriculum>) =>
      request<Curriculum>("/curricula", { method: "POST", body: JSON.stringify(data) }),
  },
  lessons: {
    list: (curriculumId: string) => request<Lesson[]>(`/lessons?curriculum_id=${curriculumId}`),
    create: (data: Partial<Lesson>) =>
      request<Lesson>("/lessons", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Lesson>) =>
      request<Lesson>(`/lessons/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  gradeScales: {
    list: (familyId: string) => request<GradeScale[]>(`/grade-scales?family_id=${familyId}`),
    create: (data: {
      family_id: string
      name: string
      weighted?: boolean
      bands?: Omit<GradeScaleBand, "id">[]
      category_weights?: Omit<GradeCategoryWeight, "id">[]
    }) => request<GradeScale>("/grade-scales", { method: "POST", body: JSON.stringify(data) }),
  },
  assessments: {
    list: (studentId: string) => request<Assessment[]>(`/assessments?student_id=${studentId}`),
    create: (data: Partial<Assessment>) =>
      request<Assessment>("/assessments", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/assessments/${id}`, { method: "DELETE" }),
  },
  compliance: {
    listProfiles: () => request<ComplianceProfileSummary[]>("/compliance/profiles"),
    getProfile: (profileId: string) =>
      request<ComplianceProfileDetail>(`/compliance/profiles/${profileId}`),
    getReport: (schoolYearId: string) =>
      request<ComplianceReport>(`/compliance/report?school_year_id=${schoolYearId}`),
    mapSubject: (requirementId: string, subjectId: string) =>
      request<void>(`/compliance/requirements/${requirementId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject_id: subjectId }),
      }),
  },
  attachments: {
    list: (associatedType: AttachmentAssociationType, associatedId: string) =>
      request<Attachment[]>(
        `/attachments?associated_type=${associatedType}&associated_id=${associatedId}`,
      ),
    upload: async (
      associatedType: AttachmentAssociationType,
      associatedId: string,
      file: File,
    ): Promise<Attachment> => {
      const formData = new FormData()
      formData.append("associated_type", associatedType)
      formData.append("associated_id", associatedId)
      formData.append("file", file)
      const res = await fetch("/api/attachments", { method: "POST", body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, body.detail ?? res.statusText)
      }
      return res.json() as Promise<Attachment>
    },
    delete: (id: string) => request<void>(`/attachments/${id}`, { method: "DELETE" }),
    downloadUrl: (id: string) => `/api/attachments/${id}/download`,
  },
  settings: {
    get: (familyId: string) => request<Settings>(`/settings?family_id=${familyId}`),
    update: (familyId: string, data: Partial<Settings>) =>
      request<Settings>(`/settings?family_id=${familyId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    uploadReportLogo: async (familyId: string, file: File): Promise<Settings> => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/settings/report-logo?family_id=${familyId}`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiError(res.status, body.detail ?? res.statusText)
      }
      return res.json() as Promise<Settings>
    },
    deleteReportLogo: (familyId: string) =>
      request<Settings>(`/settings/report-logo?family_id=${familyId}`, { method: "DELETE" }),
  },
}

export { ApiError }
