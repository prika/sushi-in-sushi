/**
 * ICS Calendar utilities — generates .ics files and Google Calendar URLs.
 * No external dependencies required.
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (for timed events like reservations)
  allDay: boolean;
  location?: string;
}

/** "2026-03-15" → "20260315" */
function formatDateICS(date: string): string {
  return date.replace(/-/g, "");
}

/** "2026-03-15" + "18:30" → "20260315T183000" */
function formatDateTimeICS(date: string, time: string): string {
  const [h, m] = time.split(":");
  return `${formatDateICS(date)}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

/** Add one day to a YYYY-MM-DD string (for all-day end dates in ICS, which are exclusive) */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/** Escape text for ICS format (fold long lines, escape special chars) */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Generate a single VEVENT block */
function generateVEvent(event: CalendarEvent): string {
  const uid = `${event.id}@sushinsushi.pt`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateICS(event.startDate)}`);
    // ICS all-day end date is exclusive
    lines.push(
      `DTEND;VALUE=DATE:${formatDateICS(addOneDay(event.endDate))}`
    );
  } else if (event.startTime) {
    lines.push(
      `DTSTART;TZID=Europe/Lisbon:${formatDateTimeICS(event.startDate, event.startTime)}`
    );
    // Default 2h duration for reservations — use Date to handle midnight rollover
    const startDt = new Date(`${event.startDate}T${event.startTime}:00`);
    const endDt = new Date(startDt.getTime() + 2 * 60 * 60 * 1000);
    const endDate = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;
    const endTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`;
    lines.push(
      `DTEND;TZID=Europe/Lisbon:${formatDateTimeICS(endDate, endTime)}`
    );
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** Generate a full VCALENDAR with multiple events */
export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sushi in Sushi//Agenda//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // Timezone definition for Europe/Lisbon
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Lisbon",
    "BEGIN:STANDARD",
    "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0000",
    "TZNAME:WET",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T010000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0100",
    "TZNAME:WEST",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const event of events) {
    lines.push(generateVEvent(event));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Generate ICS for a single event */
export function generateSingleICS(event: CalendarEvent): string {
  return generateICS([event]);
}

/** Trigger a browser download of an .ics file */
export function downloadICS(
  events: CalendarEvent[],
  filename: string = "agenda.ics"
): void {
  const content = generateICS(events);
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Generate a Google Calendar URL for a single event */
export function generateGoogleCalendarURL(event: CalendarEvent): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", event.title);

  if (event.allDay) {
    const start = formatDateICS(event.startDate);
    const end = formatDateICS(addOneDay(event.endDate));
    params.set("dates", `${start}/${end}`);
  } else if (event.startTime) {
    const start = formatDateTimeICS(event.startDate, event.startTime);
    const startDt = new Date(`${event.startDate}T${event.startTime}:00`);
    const endDt = new Date(startDt.getTime() + 2 * 60 * 60 * 1000);
    const endDate = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;
    const endTime = `${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}`;
    const end = formatDateTimeICS(endDate, endTime);
    params.set("dates", `${start}/${end}`);
  }

  if (event.description) {
    params.set("details", event.description);
  }
  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
