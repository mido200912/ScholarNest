import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareScholarship {
  _id: string;
  title: { en: string; ar: string };
  university: { en: string; ar: string };
  country: { en: string; ar: string };
  degree: string;
  fundingType: string;
  deadline: string;
  link: string;
  image?: string;
}

interface CompareState {
  scholarships: CompareScholarship[];
  addScholarship: (scholarship: CompareScholarship) => boolean;
  removeScholarship: (id: string) => void;
  clearCompare: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      scholarships: [],
      
      addScholarship: (scholarship) => {
        const current = get().scholarships;
        if (current.find(s => s._id === scholarship._id)) {
          // Already added
          return false;
        }
        if (current.length >= 3) {
          // Max 3
          return false;
        }
        set({ scholarships: [...current, scholarship] });
        return true;
      },
      
      removeScholarship: (id) => {
        set((state) => ({
          scholarships: state.scholarships.filter(s => s._id !== id)
        }));
      },
      
      clearCompare: () => set({ scholarships: [] }),
    }),
    {
      name: 'scholarnest_compare',
    }
  )
);
