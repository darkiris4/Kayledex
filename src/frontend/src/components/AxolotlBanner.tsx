import { useMemo } from "react"
import type { SchoolDaySummary } from "@/lib/api"
import { toDateString } from "@/lib/dates"

const STREAK_THRESHOLD = 5

// Statuses that represent a deliberate non-school day (holiday, sick, etc.) — skipped
// when walking the streak backward rather than breaking it, since missing a day you
// never meant to log isn't "missing school."
const NON_BREAKING_STATUSES = new Set([
  "non_instructional",
  "holiday",
  "vacation",
  "sick",
  "field_trip",
  "other",
])

function wasLogged(day: SchoolDaySummary): boolean {
  return day.total_minutes > 0 || day.has_assessment || day.has_lesson_completed
}

// Counts backward from today through whatever school-day rows are already loaded for the
// visible month. A streak spanning a month boundary (e.g. today is the 2nd) will undercount
// since only the current month's data is in hand — accepted tradeoff to avoid an extra
// fetch just for a decorative flourish.
function computeStreak(schoolDays: SchoolDaySummary[], todayStr: string): number {
  const relevant = [...schoolDays]
    .filter((d) => d.date <= todayStr)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  let streak = 0
  for (const day of relevant) {
    if (NON_BREAKING_STATUSES.has(day.status)) continue
    if (!wasLogged(day)) break
    streak++
  }
  return streak
}

type Mood = "idle" | "happy" | "streak"

interface AxolotlBannerProps {
  schoolDays: SchoolDaySummary[]
  isCurrentMonth: boolean
}

export function AxolotlBanner({ schoolDays, isCurrentMonth }: AxolotlBannerProps) {
  const { mood } = useMemo(() => {
    if (!isCurrentMonth) return { mood: "idle" as Mood }
    const todayStr = toDateString(new Date())
    const todayEntry = schoolDays.find((d) => d.date === todayStr)
    const loggedToday = !!todayEntry && wasLogged(todayEntry)
    const streak = computeStreak(schoolDays, todayStr)
    const mood: Mood = streak >= STREAK_THRESHOLD ? "streak" : loggedToday ? "happy" : "idle"
    return { mood }
  }, [schoolDays, isCurrentMonth])

  return (
    <div className="relative h-20 w-full overflow-hidden" aria-hidden="true">
      <div className={`axolotl axolotl--${mood}`}>
        <AxolotlSvg mood={mood} />
        {mood !== "idle" && (
          <div className="axolotl-sparkles">
            <span className="axolotl-sparkle axolotl-sparkle-1">✨</span>
            <span className="axolotl-sparkle axolotl-sparkle-2">✨</span>
            {mood === "streak" && <span className="axolotl-sparkle axolotl-sparkle-3">✨</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function AxolotlSvg({ mood }: { mood: Mood }) {
  return (
    <svg viewBox="0 0 100 70" width="72" height="50" className="axolotl-body">
      <ellipse className="axolotl-leg axolotl-leg-back" cx="30" cy="58" rx="7" ry="5" fill="#f3a6c1" />
      <ellipse className="axolotl-leg axolotl-leg-front" cx="70" cy="58" rx="7" ry="5" fill="#f3a6c1" />
      <path d="M8 45 Q -8 40 4 55 Q 10 50 8 45 Z" fill="#f7bcd4" />
      <ellipse cx="50" cy="42" rx="34" ry="20" fill="#f7bcd4" />
      <g
        className="axolotl-gill axolotl-gill-left"
        stroke="#e56b9b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M22 22 Q10 14 6 22" />
        <path d="M24 26 Q10 22 8 30" />
        <path d="M26 30 Q14 30 10 38" />
      </g>
      <g
        className="axolotl-gill axolotl-gill-right"
        stroke="#e56b9b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M62 18 Q74 10 80 18" />
        <path d="M64 22 Q78 18 82 26" />
        <path d="M66 27 Q80 27 84 35" />
      </g>
      <ellipse cx="60" cy="30" rx="22" ry="18" fill="#f7bcd4" />
      <circle cx="52" cy="26" r="2.6" fill="#3a1520" />
      <circle cx="68" cy="26" r="2.6" fill="#3a1520" />
      <path
        d={mood === "idle" ? "M54 36 Q60 39 66 36" : "M52 35 Q60 43 68 35"}
        stroke="#c2427a"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="48" cy="33" r="3" fill="#f591b7" opacity="0.6" />
      <circle cx="72" cy="33" r="3" fill="#f591b7" opacity="0.6" />
    </svg>
  )
}
