import { translations } from './translations';

type Language = 'es' | 'en';
type TranslationKey = keyof typeof translations.es;

// Initialize language IMMEDIATELY (synchronously, before React)
let currentLanguage: Language = (() => {
  // Check window variable set by HTML script (if exists)
  if (typeof window !== 'undefined' && (window as any).__INITIAL_LANGUAGE__) {
    return (window as any).__INITIAL_LANGUAGE__ as Language;
  }
  
  // Check localStorage for saved preference
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved === 'es' || saved === 'en') {
      return saved;
    }
  }
  
  // Default to Spanish for all new users
  return 'es';
})();

// Set HTML lang attribute immediately
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLanguage;
}

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  
  // Persist to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('preferredLanguage', lang);
  }
  
  // Update HTML lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
  
  // Trigger re-render
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
  }
};

export const getLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
  // Try current language first
  let translation = translations[currentLanguage]?.[key];
  
  // If not found, fall back to English
  if (!translation) {
    translation = translations.en[key];
  }
  
  // If still not found, return the key itself (for debugging)
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  
  // Simple parameter replacement
  if (params) {
    return Object.entries(params).reduce(
      (str, [param, value]) => str.replace(`{{${param}}}`, String(value)),
      translation
    );
  }
  
  return translation;
};
