
import React from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { SunIcon, MoonIcon, MenuIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md p-4 flex justify-between items-center z-10 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none sm:hidden"
            aria-label="Open sidebar"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('header.title')}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-2 py-1 sm:p-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            {language === 'en' ? 'हिंदी' : 'English'}
        </button>
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
