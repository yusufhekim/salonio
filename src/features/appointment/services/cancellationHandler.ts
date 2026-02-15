import { useBookingStore } from '@store';
import { useNotificationStore } from '@store';
import { scheduleNotification } from '../../notification/services';

/**
 * Cancels an appointment by ID.
 * Updates the booking store, adds a notification, and schedules a local push.
 * Placeholder — no Firebase or backend integration yet.
 */
export async function cancelAppointment(
  appointmentId: string
): Promise<void> {
  const { appointments, cancelAppointment: cancel } =
    useBookingStore.getState();
  const { addNotification } = useNotificationStore.getState();

  // Find the appointment to get its timeSlot for the notification message
  const appointment = appointments.find((a) => a.id === appointmentId);

  if (!appointment) {
    return;
  }

  // Mark cancelled in store
  cancel(appointmentId);

  // Add in-app notification
  addNotification(
    'Randevu İptal',
    `${appointment.timeSlot} randevunuz iptal edildi.`
  );

  // Schedule local push notification in 2 seconds
  await scheduleNotification(
    'Randevu İptal',
    `${appointment.timeSlot} randevunuz iptal edildi.`,
    2
  );
}
