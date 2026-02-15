export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  /** Display name for UI (e.g. warning "Bu gün randevunuz var: [barberName]") */
  barberName?: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm-HH:mm
  status: 'booked' | 'cancelled' | 'completed';
}
