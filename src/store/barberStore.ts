import { create } from "zustand";

export type AppointmentDuration = 30 | 60;

export interface DayWorkingHours {
  start: string;
  end: string;
  duration: AppointmentDuration;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface WorkingHoursMap {
  monday: DayWorkingHours;
  tuesday: DayWorkingHours;
  wednesday: DayWorkingHours;
  thursday: DayWorkingHours;
  friday: DayWorkingHours;
  saturday: DayWorkingHours;
  sunday: DayWorkingHours;
}

const DEFAULT_WORKING_HOURS: WorkingHoursMap = {
  monday: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
  tuesday: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
  wednesday: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
  thursday: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
  friday: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
  saturday: { start: '10:00', end: '16:00', duration: 60, breakStart: null, breakEnd: null },
  sunday: { start: '00:00', end: '00:00', duration: 60, breakStart: null, breakEnd: null },
};

export interface BarberProfile {
  kuaforId: string;
  kuaforAdi: string;
  adSoyad: string;
  telefon: string;
  email: string;
  il: string;
  ilce: string;
  mahalle: string;
  adres: string;
  workingDays: WorkingDays;
  workingHours: WorkingHoursMap;
}

export type WorkingDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface WorkingDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

const DEFAULT_WORKING_DAYS: WorkingDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false,
};

interface BarberState {
  profile: BarberProfile;
  dayOffDates: string[];
  updateProfile: (fields: Partial<Omit<BarberProfile, "kuaforId">>) => void;
  setWorkingDay: (day: WorkingDayKey, value: boolean) => void;
  setWorkingHours: (
    day: WorkingDayKey,
    start: string,
    end: string,
    duration: AppointmentDuration,
    breakStart?: string | null,
    breakEnd?: string | null
  ) => void;
  addDayOff: (date: string) => void;
  removeDayOff: (date: string) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: BarberProfile = {
  kuaforId: "1",
  kuaforAdi: "",
  adSoyad: "",
  telefon: "",
  email: "kuafor@salonio.com",
  il: "",
  ilce: "",
  mahalle: "",
  adres: "",
  workingDays: { ...DEFAULT_WORKING_DAYS },
  workingHours: { ...DEFAULT_WORKING_HOURS },
};

export const useBarberStore = create<BarberState>((set) => ({
  profile: { ...DEFAULT_PROFILE },
  dayOffDates: [],

  updateProfile: (fields) =>
    set((state) => ({
      profile: { ...state.profile, ...fields },
    })),

  setWorkingDay: (day: WorkingDayKey, value: boolean) =>
    set((state) => {
      const nextWorkingDays = { ...state.profile.workingDays, [day]: value };
      let nextWorkingHours = state.profile.workingHours;
      if (value === true) {
        const hours = state.profile.workingHours[day];
        const needDefault =
          !hours ||
          !hours.start ||
          !hours.end ||
          (hours.start === '00:00' && hours.end === '00:00');
        if (needDefault) {
          nextWorkingHours = {
            ...nextWorkingHours,
            [day]: { start: '09:00', end: '18:00', duration: 60, breakStart: null, breakEnd: null },
          };
        }
      }
      return {
        profile: {
          ...state.profile,
          workingDays: nextWorkingDays,
          workingHours: nextWorkingHours,
        },
      };
    }),

  setWorkingHours: (
    day: WorkingDayKey,
    start: string,
    end: string,
    duration: AppointmentDuration,
    breakStart?: string | null,
    breakEnd?: string | null
  ) =>
    set((state) => {
      const current = state.profile.workingHours[day];
      const nextBreakStart = breakStart !== undefined ? breakStart : (current?.breakStart ?? null);
      const nextBreakEnd = breakEnd !== undefined ? breakEnd : (current?.breakEnd ?? null);
      return {
        profile: {
          ...state.profile,
          workingHours: {
            ...state.profile.workingHours,
            [day]: { start, end, duration, breakStart: nextBreakStart, breakEnd: nextBreakEnd },
          },
        },
      };
    }),

  addDayOff: (date) =>
    set((state) =>
      state.dayOffDates.includes(date)
        ? state
        : { dayOffDates: [...state.dayOffDates, date] }
    ),

  removeDayOff: (date) =>
    set((state) => ({
      dayOffDates: state.dayOffDates.filter((d) => d !== date),
    })),

  resetProfile: () =>
    set({
      profile: {
        ...DEFAULT_PROFILE,
        workingDays: { ...DEFAULT_WORKING_DAYS },
        workingHours: { ...DEFAULT_WORKING_HOURS },
      },
      dayOffDates: [],
    }),
}));
