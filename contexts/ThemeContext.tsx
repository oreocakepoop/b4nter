
import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db_rtdb } from '../firebase'; // Import Firebase RTDB instance

export const daisyUIVersions = "4.10.1"; // To keep track of DaisyUI version for theme list

export const daisyUIThemes = [
  "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", 
  "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", 
  "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", 
  "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", 
  "night", "coffee", "winter", "dim", "nord", "sunset"
];

interface ThemeContextType {
  theme: string;
  applyTheme: (themeName: string, userId?: string) => void; // userId is optional
  availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>('lemonade'); // Default theme

  const applyTheme = useCallback(async (themeName: string, userId?: string) => {
    let effectiveThemeName = themeName;
    if (!daisyUIThemes.includes(themeName)) {
      console.warn(`Theme "${themeName}" is not a valid DaisyUI theme. Applying default 'lemonade'.`);
      effectiveThemeName = 'lemonade';
    }

    document.documentElement.setAttribute('data-theme', effectiveThemeName);
    localStorage.setItem('selectedTheme', effectiveThemeName);
    setTheme(effectiveThemeName);

    if (userId) {
      try {
        // Get a reference to the user's profile node
        const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
        // Update the selectedTheme child within that profile
        await update(userProfileRef, { selectedTheme: effectiveThemeName });
      } catch (error) {
        console.error("Failed to save theme to Firebase:", error);
      }
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    // We only apply from localStorage initially. User-specific theme will be handled by App.tsx once profile loads.
    if (savedTheme && daisyUIThemes.includes(savedTheme)) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      setTheme(savedTheme);
    } else {
      // Apply default if no valid theme in localStorage
      document.documentElement.setAttribute('data-theme', 'lemonade');
      setTheme('lemonade');
      // No need to write to localStorage here, applyTheme does that on explicit change.
    }
  }, []); // Removed applyTheme from dependency array to avoid loop on init

  return (
    <ThemeContext.Provider value={{ theme, applyTheme, availableThemes: daisyUIThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};