import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DurationInputProps {
  valueMinutes: string
  onChange: (minutes: string) => void
  idPrefix?: string
}

// Stores/reports total minutes as a string (matching the existing duration state
// pattern across forms), but presents separate Hours/Minutes fields since entering
// e.g. "90" for an hour and a half is a worse experience than typing 1h 30m.
export function DurationInput({ valueMinutes, onChange, idPrefix = "duration" }: DurationInputProps) {
  const total = valueMinutes === "" ? null : Number(valueMinutes)
  const hoursValue = total === null ? "" : String(Math.floor(total / 60))
  const minutesValue = total === null ? "" : String(total % 60)

  function handleHoursChange(next: string) {
    if (next === "" && minutesValue === "") {
      onChange("")
      return
    }
    const h = next === "" ? 0 : Number(next)
    const m = minutesValue === "" ? 0 : Number(minutesValue)
    onChange(String(h * 60 + m))
  }

  function handleMinutesChange(next: string) {
    if (hoursValue === "" && next === "") {
      onChange("")
      return
    }
    const h = hoursValue === "" ? 0 : Number(hoursValue)
    const m = next === "" ? 0 : Number(next)
    onChange(String(h * 60 + m))
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={`${idPrefix}-hours`} className="text-xs text-muted-foreground">
          Hours
        </Label>
        <Input
          id={`${idPrefix}-hours`}
          type="number"
          min="0"
          value={hoursValue}
          onChange={(e) => handleHoursChange(e.target.value)}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={`${idPrefix}-minutes`} className="text-xs text-muted-foreground">
          Minutes
        </Label>
        <Input
          id={`${idPrefix}-minutes`}
          type="number"
          min="0"
          max="59"
          value={minutesValue}
          onChange={(e) => handleMinutesChange(e.target.value)}
        />
      </div>
    </div>
  )
}
