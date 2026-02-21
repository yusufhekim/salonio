import { create } from "zustand";

type Role = "guest" | "customer" | "kuafor";

interface PlaceholderUser {
  email: string;
  password: string;
  role: Role;
}

interface AuthState {
  role: Role;
  isAuthenticated: boolean;
  currentUser: PlaceholderUser | null;
  /** Placeholder users for local testing (no Firebase) */
  placeholderUsers: PlaceholderUser[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setRole: (role: Role) => void;
  setAuthenticated: (value: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: "guest",
  isAuthenticated: false,
  currentUser: null,

  placeholderUsers: [
    { email: "test@salonio.com", password: "123456", role: "customer" },
    { email: "kuafor@salonio.com", password: "123456", role: "kuafor" },
  ],

  login: (email, password) => {
    const { placeholderUsers } = get();
    const match = placeholderUsers.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password,
    );

    if (match) {
      set({
        currentUser: match,
        role: match.role,
        isAuthenticated: true,
      });
      return true;
    }

    return false;
  },

  logout: () =>
    set({
      currentUser: null,
      role: "guest",
      isAuthenticated: false,
    }),

  setRole: (role) => set({ role }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  reset: () =>
    set({ currentUser: null, role: "guest", isAuthenticated: false }),
}));
