import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, defaultLanguage } from '../locales';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            language: defaultLanguage,
            setLanguage: (lang) => set({ language: lang }),
        }),
        {
            name: 'language-storage',
        }
    )
);
