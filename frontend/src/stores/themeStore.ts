import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  showMeshBackground: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleMeshBackground: () => void;
}

// Apply theme to document
const applyTheme = (theme: Theme) => {
  const html = document.documentElement;
  const body = document.body;
  // Set color-scheme so native form controls (select arrows, date pickers, number spinners) match the theme
  html.style.colorScheme = theme;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
    body.classList.add('bg-ecotribe-dark', 'text-white');
    body.classList.remove('bg-white', 'text-slate-900');
  } else {
    html.classList.add('light');
    html.classList.remove('dark');
    body.classList.add('bg-white', 'text-slate-900');
    body.classList.remove('bg-ecotribe-dark', 'text-white');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      showMeshBackground: true,
      // Ensure default theme is applied on init
      ...(typeof document !== 'undefined' ? (applyTheme('dark'), {}) : {}),

      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        set({ theme: newTheme });
      },

      toggleMeshBackground: () => {
        set({ showMeshBackground: !get().showMeshBackground });
      },
    }),
    {
      name: 'ecotribe-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydration
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
