import { create } from 'zustand';
import type { Appointment } from '@domain/appointment';

/** Selected barber (synced when customer selects a barber). */
export interface SelectedBarber {
  id: string;
  name: string;
}

interface BookingState {
  appointments: Appointment[];
  selectedBarber: SelectedBarber | null;
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  setSelectedBarber: (barber: SelectedBarber | null) => void;
  cancelAppointment: (appointmentId: string) => void;
  getBookedAppointments: () => Appointment[];
  /** True if there is a booked appointment on the given date (in customer context: store holds only that customer's appointments). */
  hasAppointmentOnDate: (date: string) => boolean;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  appointments: [],
  selectedBarber: null,

  setAppointments: (appointments) => set({ appointments }),

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
    get().appointments.some((a) => a.date === date && a.status === 'booked'),
}));
