import React from 'react';
import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const { t } = useTranslation();

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', label: 'English', flag: '🇬🇧' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors px-4 py-2 rounded-xl hover:bg-blue-50 font-sans">
        <Globe2 className="w-5 h-5" />
        <span className="text-sm font-medium flex items-center gap-2">
          <span className="text-lg">{currentLang?.flag}</span>
          <span className="hidden sm:inline">{currentLang?.label}</span>
          <span className="sm:hidden">{currentLang?.code.toUpperCase()}</span>
        </span>
      </button>
      
      <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => onLanguageChange(language.code)}
            className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors font-sans ${
              currentLanguage === language.code ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{language.flag}</span>
              <span>{language.label}</span>
            </div>
            {currentLanguage === language.code && (
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}