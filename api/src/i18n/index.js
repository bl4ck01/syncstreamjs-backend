import env, { getSupportedLanguages } from '../utils/env.js';

// Language files
import en from './locales/en.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import it from './locales/it.js';
import pt from './locales/pt.js';
import ar from './locales/ar.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';

// Language map
const languages = {
  en, es, fr, de, it, pt, ar, zh, ja, ko
};

// Supported languages from environment
const supportedLanguages = getSupportedLanguages();

// Get user's preferred language
export const getUserLanguage = (request) => {
  // Check query parameter
  const queryLang = new URL(request.url).searchParams.get('lang');
  if (queryLang && supportedLanguages.includes(queryLang)) {
    return queryLang;
  }
  
  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, priority = '1'] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          priority: parseFloat(priority)
        };
      })
      .sort((a, b) => b.priority - a.priority);
    
    for (const { code } of languages) {
      if (supportedLanguages.includes(code)) {
        return code;
      }
    }
  }
  
  // Default language
  return env.DEFAULT_LANGUAGE;
};

// Translation function
export const t = (key, language = env.DEFAULT_LANGUAGE, params = {}) => {
  const lang = languages[language] || languages[env.DEFAULT_LANGUAGE];
  
  // Navigate through nested keys
  const keys = key.split('.');
  let value = lang;
  
  for (const k of keys) {
    value = value?.[k];
    if (!value) break;
  }
  
  // Fallback to English if translation not found
  if (!value && language !== 'en') {
    value = keys.reduce((obj, k) => obj?.[k], languages.en);
  }
  
  // Return key if no translation found
  if (!value) return key;
  
  // Replace parameters
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`{{${param}}}`, 'g'), val);
  }
  
  return result;
};

// i18n plugin for Elysia
import { Elysia } from 'elysia';

export const i18nPlugin = new Elysia({ name: 'i18n' })
  .derive({ as: 'global' }, ({ request }) => {
    const language = getUserLanguage(request);
    
    return {
      language,
      t: (key, params) => t(key, language, params),
      
      // Helper for sending localized responses
      localizedResponse: (key, params = {}, data = null) => ({
        success: true,
        message: t(key, language, params),
        data,
        language
      }),
      
      localizedError: (key, params = {}, statusCode = 400) => {
        const error = new Error(t(key, language, params));
        error.statusCode = statusCode;
        throw error;
      }
    };
  })
  .onTransform(({ response, language }) => {
    // Add language header to response
    if (response) {
      response.headers = response.headers || {};
      response.headers['Content-Language'] = language;
    }
  });

// Export available languages endpoint
export const getAvailableLanguages = () => {
  return supportedLanguages.map(code => ({
    code,
    name: languages[code]?.meta?.name || code,
    nativeName: languages[code]?.meta?.nativeName || code,
    direction: languages[code]?.meta?.direction || 'ltr'
  }));
};
