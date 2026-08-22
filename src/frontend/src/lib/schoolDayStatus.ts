import type { SchoolDayStatus } from "@/lib/api"

export const SCHOOL_DAY_STATUSES: SchoolDayStatus[] = [
  "instructional",
  "partial",
  "non_instructional",
  "holiday",
  "vacation",
  "sick",
  "field_trip",
  "other",
]

export const STATUS_LABELS: Record<SchoolDayStatus, string> = {
  instructional: "Instructional",
  partial: "Partial",
  non_instructional: "Non-Instructional",
  holiday: "Holiday",
  vacation: "Vacation",
  sick: "Sick",
  field_trip: "Field Trip",
  other: "Other",
}

export const STATUS_DOT_COLORS: Record<SchoolDayStatus, string> = {
  instructional: "bg-emerald-500",
  partial: "bg-amber-500",
  non_instructional: "bg-gray-400",
  holiday: "bg-blue-500",
  vacation: "bg-purple-500",
  sick: "bg-red-500",
  field_trip: "bg-orange-500",
  other: "bg-gray-400",
}

export const STATUS_BG_COLORS: Record<SchoolDayStatus, string> = {
  instructional: "bg-emerald-500/15 dark:bg-emerald-500/20",
  partial: "bg-amber-500/15 dark:bg-amber-500/20",
  non_instructional: "bg-gray-400/15 dark:bg-gray-400/20",
  holiday: "bg-blue-500/15 dark:bg-blue-500/20",
  vacation: "bg-purple-500/15 dark:bg-purple-500/20",
  sick: "bg-red-500/15 dark:bg-red-500/20",
  field_trip: "bg-orange-500/15 dark:bg-orange-500/20",
  other: "bg-gray-400/15 dark:bg-gray-400/20",
}
