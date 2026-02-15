/**
 * Generates available time slots for a barber on a given date.
 * Currently returns placeholder data.
 * TODO: Implement real logic with Firestore query + conflict resolution.
 */
export function generateAvailableSlots(
  _barberId: string,
  _date: string
): string[] {
  // Placeholder: return example slots
  return [
    '09:00-09:30',
    '09:30-10:00',
    '10:00-10:30',
    '10:30-11:00',
    '11:00-11:30',
    '11:30-12:00',
    '13:00-13:30',
    '13:30-14:00',
    '14:00-14:30',
    '14:30-15:00',
    '15:00-15:30',
    '15:30-16:00',
    '16:00-16:30',
    '16:30-17:00',
  ];
}
