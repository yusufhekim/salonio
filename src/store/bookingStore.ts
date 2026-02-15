import { create } from 'zustand';
import type { Appointment } from '@domain/appointment';

interface BookingState {
  appointments: Appointment[];
  addAppointment: (appointment: Appointment) => void;
  cancelAppointment: (appointmentId: string) => void;
  getBookedAppointments: () => Appointment[];
}

export const useBookingStore = create<BookingState>((set, get) => ({
  appointments: [],

  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),

  cancelAppointment: (appointmentId) =>
    set((state) => ({
      appointments: state.appointments.map((appt) =>
        appt.id === appointmentId
          ? { ...appt, status: 'cancelled' as const }
          : appt
      ),
    })),

  getBookedAppointments: () =>
    get().appointments.filter((appt) => appt.status === 'booked'),
}));
