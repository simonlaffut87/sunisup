import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import frTranslation from '../public/locales/fr/translation.json';
import enTranslation from '../public/locales/en/translation.json';
import nlTranslation from '../public/locales/nl/translation.json';

const resources = {
  fr: {
    translation: frTranslation
  },
  en: {
    translation: enTranslation
  },
  nl: {
    translation: nlTranslation
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'nl', 'en'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie'],
      cookieMinutes: 160,
    },
  });

export default i18n;