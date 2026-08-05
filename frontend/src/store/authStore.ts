import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'assistant_admin';
  token: string;
  major?: string;
  gpa?: string;
  englishLevel?: string;
  targetCountries?: string[];
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const getSavedUser = (): User | null => {
  try {
    const stored = localStorage.getItem('scholarnest_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('scholarnest_user');
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getSavedUser(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('scholarnest_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('scholarnest_user');
    }
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('scholarnest_user');
    set({ user: null });
  },
}));
