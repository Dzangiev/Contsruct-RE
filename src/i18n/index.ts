import { en } from './en';
import { ru } from './ru';
import { Language, TranslationKeys } from './types';

export { en, ru };
export type { Language, TranslationKeys };

const translations: Record<Language, TranslationKeys> = {
  en,
  ru
};

export function getTranslation(lang: Language): TranslationKeys {
  return translations[lang] || translations.en;
}

export function detectLanguage(): Language {
  const saved = localStorage.getItem('editor-language') as Language;
  if (saved === 'en' || saved === 'ru') return saved;
  
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'ru') return 'ru';
  return 'en';
}
