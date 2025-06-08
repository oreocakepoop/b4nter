
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { FirebaseUser } from '../types'; // Added FirebaseUser

interface ThemeSwitcherProps {
  isMobile?: boolean; // To adjust styling for mobile menu if needed
  currentUser: FirebaseUser | null; // Updated type
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ isMobile = false, currentUser }) => {
  const { theme, applyTheme, availableThemes } = useTheme();

  const handleThemeChange = (selectedTheme: string) => {
    applyTheme(selectedTheme, currentUser?.uid); // Pass UID if user is logged in
  };

  if (isMobile) {
    return (
      <div className="form-control w-full">
        <label className="label cursor-pointer px-4 py-2">
          <span className="label-text">Theme</span> 
           <select 
            className="select select-ghost select-xs"
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
            aria-label="Select theme"
          >
            {availableThemes.map(themeName => (
              <option key={themeName} value={themeName}>
                {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className="dropdown dropdown-end" title={`Current theme: ${theme}`}>
      <label tabIndex={0} className="btn btn-ghost btn-sm">
        <i className="fas fa-palette"></i>
        <span className="hidden lg:inline ml-1">Theme</span> {/* Changed md:inline to lg:inline */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </label>
      <ul tabIndex={0} className="dropdown-content menu menu-sm p-2 shadow bg-base-200 rounded-box w-52 max-h-60 overflow-y-auto z-[100]">
        {availableThemes.map(themeName => (
          <li key={themeName}>
            <button
              onClick={() => handleThemeChange(themeName)}
              className={`${theme === themeName ? 'active' : ''}`}
            >
              {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ThemeSwitcher;