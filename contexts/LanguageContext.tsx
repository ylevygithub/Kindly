import React, { createContext, useContext, useState } from 'react';
import { locale } from '@/utils/i18n';

type Lang = 'fr' | 'en';
interface LanguageContextType { lang: Lang; setLang: (l: Lang) => void; }
const LanguageContext = createContext<LanguageContextType>({ lang: locale, setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(locale);
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
