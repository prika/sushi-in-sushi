export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
  preset: DatePreset;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const today = new Date();
  const to = toISODate(today);

  switch (preset) {
    case "today":
      return { from: to, to, preset };
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toISODate(from), to, preset };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toISODate(from), to, preset };
    }
    case "90d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 89);
      return { from: toISODate(from), to, preset };
    }
    default:
      return { from: to, to, preset: "custom" };
  }
}

export function getPreviousPeriod(range: DateRange): { from: string; to: string } {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);

  return { from: toISODate(prevFrom), to: toISODate(prevTo) };
}
