import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Language Context
const LanguageContext = createContext();

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // Default to English
  const [translations, setTranslations] = useState({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Load translations based on selected language
  useEffect(() => {
    loadTranslations(language);
  }, [language]);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('sms_language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sw')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const loadTranslations = async (lang) => {
    try {
      setTranslationsLoaded(false);
      const translationModule = await import(`../translations/${lang}.js`);
      setTranslations(translationModule.default);
      setTranslationsLoaded(true);
    } catch (error) {
      console.error(`Failed to load translations for language: ${lang}`, error);
      try {
        // Fallback to English if translation loading fails
        if (lang !== 'en') {
          const fallbackModule = await import('../translations/en.js');
          setTranslations(fallbackModule.default);
        }
      } finally {
        setTranslationsLoaded(true);
      }
    }
  };

  const changeLanguage = (newLanguage) => {
    if (newLanguage === 'en' || newLanguage === 'sw') {
      setLanguage(newLanguage);
      localStorage.setItem('sms_language', newLanguage);
    }
  };

  // Translation function
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations;

    // Avoid noisy warnings during initial async translation load.
    if (!translationsLoaded) return key;
    
    // Navigate through nested keys
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) break;
    }
    
    // If translation not found, return the key itself
    if (typeof translation !== 'string') {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
    
    // Replace parameters in translation
    let result = translation;
    Object.keys(params).forEach(param => {
      result = result.replace(`{{${param}}}`, params[param]);
    });
    
    return result;
  };

  const value = {
    language,
    changeLanguage,
    t,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the Language Context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
