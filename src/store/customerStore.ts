import { create } from 'zustand';

export interface CustomerProfile {
  musteriId: string;
  adSoyad: string;
  telefon: string;
  email: string;
  il: string;
  ilce: string;
  mahalle: string;
  adres: string;
}

export interface SelectedKuafor {
  id: string;
  name: string;
  il: string;
  ilce: string;
  mahalle: string;
}

interface CustomerState {
  profile: CustomerProfile;
  selectedKuafor: SelectedKuafor | null;
  updateProfile: (fields: Partial<Omit<CustomerProfile, 'musteriId'>>) => void;
  resetProfile: () => void;
  setSelectedKuafor: (kuafor: SelectedKuafor | null) => void;
}

const DEFAULT_PROFILE: CustomerProfile = {
  musteriId: 'M-001',
  adSoyad: '',
  telefon: '',
  email: 'test@salonio.com',
  il: '',
  ilce: '',
  mahalle: '',
  adres: '',
};

export const useCustomerStore = create<CustomerState>((set) => ({
  profile: { ...DEFAULT_PROFILE },
  selectedKuafor: null,

  updateProfile: (fields) =>
    set((state) => ({
      profile: { ...state.profile, ...fields },
    })),

  resetProfile: () => set({ profile: { ...DEFAULT_PROFILE } }),

  setSelectedKuafor: (kuafor) => set({ selectedKuafor: kuafor }),
}));
