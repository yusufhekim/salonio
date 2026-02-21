/**
 * Generates slot strings "HH:mm-HH:mm" from working start/end in durationMinutes steps.
 * Skips slots inside break. Used by SlotPickerScreen and ScheduleScreen.
 */
export function generateSlotsFromWorkingHours(
  start: string,
  end: string,
  durationMinutes: number,
  breakStart?: string | null,
  breakEnd?: string | null
): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const breakStartMin =
    breakStart != null && breakStart !== ''
      ? (() => {
          const [h, m] = breakStart.split(':').map(Number);
          return h * 60 + m;
        })()
      : null;
  const breakEndMin =
    breakEnd != null && breakEnd !== ''
      ? (() => {
          const [h, m] = breakEnd.split(':').map(Number);
          return h * 60 + m;
        })()
      : null;
  const result: string[] = [];
  for (let t = startTotal; t < endTotal; t += durationMinutes) {
    if (
      breakStartMin != null &&
      breakEndMin != null &&
      t >= breakStartMin &&
      t < breakEndMin
    ) {
      continue;
    }
    const h = Math.floor(t / 60);
    const m = t % 60;
    const endT = t + durationMinutes;
    const h2 = Math.floor(endT / 60);
    const m2 = endT % 60;
    const startStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const endStr = `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`;
    result.push(`${startStr}-${endStr}`);
  }
  return result;
}

/**
 * Generates available time slots for a kuafor on a given date.
 * Currently returns placeholder data.
 * TODO: Implement real logic with Firestore query + conflict resolution.
 */
export function generateAvailableSlots(
  _barberId: string,
  _date: string,
): string[] {
  return generateSlotsFromWorkingHours('09:00', '18:00', 60);
}
