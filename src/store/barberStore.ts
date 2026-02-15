import { create } from 'zustand';

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
}

interface BarberState {
  profile: BarberProfile;
  updateProfile: (fields: Partial<Omit<BarberProfile, 'kuaforId'>>) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: BarberProfile = {
  kuaforId: 'K-001',
  kuaforAdi: '',
  adSoyad: '',
  telefon: '',
  email: 'barber@salonio.com',
  il: '',
  ilce: '',
  mahalle: '',
  adres: '',
};

export const useBarberStore = create<BarberState>((set) => ({
  profile: { ...DEFAULT_PROFILE },

  updateProfile: (fields) =>
    set((state) => ({
      profile: { ...state.profile, ...fields },
    })),

  resetProfile: () => set({ profile: { ...DEFAULT_PROFILE } }),
}));
