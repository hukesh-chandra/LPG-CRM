import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations } from '../translations';
import get from 'lodash.get';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string,
  ...args: (string | number)[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, ...args: (string | number)[]): string => {
    const translation = get(translations[language], key);

    if (typeof translation === 'string') {
        if (!args || args.length === 0) {
            return translation;
        }
        return translation.replace(/{(\d+)}/g, (match, index) => {
            return typeof args[index] !== 'undefined' ? String(args[index]) : match;
        });
    }

    // Fallback logic for enums: return the actual value instead of the full key path
    if (key.startsWith('enums.')) {
        const parts = key.split('.');
        return parts.slice(2).join('.'); // e.g. enums.villages.MyVillage -> MyVillage
    }

    return key; // Fallback to key if not found
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
