import type { Appointment } from '@domain/appointment';

/**
 * Checks whether a new time slot conflicts with any existing booked appointment.
 * Uses simple string comparison on 'HH:mm-HH:mm' format slots.
 * Returns true if there IS a conflict (slot is already taken).
 */
export function checkConflict(
  existingAppointments: Appointment[],
  newSlot: string
): boolean {
  return existingAppointments.some(
    (appt) => appt.status === 'booked' && appt.timeSlot === newSlot
  );
}

/**
 * Removes conflicting slots based on existing appointments.
 * Returns only the slots that do NOT overlap with any booked appointment.
 */
export function removeConflicts(
  slots: string[],
  existingAppointments: Appointment[]
): string[] {
  return slots.filter((slot) => !checkConflict(existingAppointments, slot));
}
