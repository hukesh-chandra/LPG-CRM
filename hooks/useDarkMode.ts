
import { useState, useEffect } from 'react';

export const useDarkMode = (): [boolean, () => void] => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const storedPreference = localStorage.getItem('darkMode');
      if (storedPreference !== null) {
        return JSON.parse(storedPreference);
      }
    } catch (error) {
      console.error("Error parsing 'darkMode' from localStorage", error);
      // Fallback to system preference if parsing fails
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return [isDarkMode, toggleDarkMode];
};
