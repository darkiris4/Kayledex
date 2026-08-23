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
  instructional: "School Day",
  partial: "Partial",
  non_instructional: "Day Off",
  holiday: "Holiday",
  vacation: "Vacation",
  sick: "Sick",
  field_trip: "Field Trip",
  other: "Other",
}

// Hex so these can back <input type="color"> in Settings and be overridden per family
// (Settings.calendar_status_colors) rather than being fixed Tailwind classes.
export const DEFAULT_STATUS_COLORS: Record<SchoolDayStatus, string> = {
  instructional: "#10b981",
  partial: "#f59e0b",
  non_instructional: "#9ca3af",
  holiday: "#3b82f6",
  vacation: "#a855f7",
  sick: "#ef4444",
  field_trip: "#f97316",
  other: "#9ca3af",
}

export function getStatusColor(
  status: SchoolDayStatus,
  overrides: Record<string, string> | null | undefined,
): string {
  return overrides?.[status] || DEFAULT_STATUS_COLORS[status]
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return `rgba(156, 163, 175, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
