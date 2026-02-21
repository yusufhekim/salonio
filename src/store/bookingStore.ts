import { create } from 'zustand';
import type { Appointment } from '@domain/appointment';

/** Same customer id used when creating appointments (e.g. SlotPickerScreen) */
const CURRENT_CUSTOMER_ID = 'placeholder-customer';

/** Selected barber (synced when customer selects a barber). Used to match barberStore.profile for working days. */
export interface SelectedBarber {
  id: string;
  name: string;
}

interface BookingState {
  appointments: Appointment[];
  selectedBarber: SelectedBarber | null;
  addAppointment: (appointment: Appointment) => void;
  setSelectedBarber: (barber: SelectedBarber | null) => void;
  cancelAppointment: (appointmentId: string) => void;
  getBookedAppointments: () => Appointment[];
  /** True if current customer has a booked appointment on the given date (YYYY-MM-DD). */
  hasAppointmentOnDate: (date: string) => boolean;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  appointments: [],
  selectedBarber: null,

  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),

  /** Fully removes the appointment from the array so the slot can become selectable again (if time not passed). */
  setSelectedBarber: (barber) => set({ selectedBarber: barber }),

  cancelAppointment: (appointmentId) =>
    set((state) => ({
      appointments: state.appointments.filter((appt) => appt.id !== appointmentId),
    })),

  getBookedAppointments: () =>
    get().appointments.filter((appt) => appt.status === 'booked'),

  hasAppointmentOnDate: (date) =>
    get().appointments.some(
      (a) =>
        a.customerId === CURRENT_CUSTOMER_ID &&
        a.date === date &&
        a.status === 'booked'
    ),
}));
