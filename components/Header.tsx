
import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { SunIcon, MoonIcon, MenuIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getCurrentAuthAppUser, logoutAdminUser } from '../services/api';
import { AppUser } from '../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const { language, setLanguage, t } = useLanguage();
  const [adminUser, setAdminUser] = useState<AppUser | null>(null);

  useEffect(() => {
    getCurrentAuthAppUser().then(setAdminUser);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of Admin panel?')) {
      await logoutAdminUser();
      window.location.reload();
    }
  };

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
        {adminUser && (
            <div className="hidden md:flex items-center gap-2 bg-blue-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-blue-200 dark:border-gray-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-semibold text-blue-900 dark:text-blue-200">{adminUser.name || adminUser.email}</span>
                <span className="bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{adminUser.role}</span>
            </div>
        )}
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
        {adminUser && (
            <button
                onClick={handleLogout}
                className="text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title="Log out admin session"
            >
                Logout
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
