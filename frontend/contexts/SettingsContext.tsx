'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themes, getThemeById, applyTheme as applyThemeToDOM } from '@/lib/themes';
import { translations, getTranslation, applyLanguage as applyLanguageToDOM, Language, Translation } from '@/lib/translations';

export interface Settings {
  // Notifications
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  announcements_notifications: boolean;
  messages_notifications: boolean;
  grades_notifications: boolean;
  payments_notifications: boolean;
  
  // Apparence
  theme: string;  // ID du thème (ex: 'light-orange', 'dark-blue')
  language: Language;
  density: 'compact' | 'comfortable' | 'spacious';
  
  // Confidentialité
  show_online_status: boolean;
  show_profile_public: boolean;
  
  // Sons
  sound_enabled: boolean;
  sound_volume: number;
}

export interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
  isDarkMode: boolean;
  t: Translation;  // Traductions
}

export const defaultSettings: Settings = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  announcements_notifications: true,
  messages_notifications: true,
  grades_notifications: true,
  payments_notifications: true,
  theme: 'light-orange',  // Thème par défaut
  language: 'fr',
  density: 'comfortable',
  show_online_status: true,
  show_profile_public: false,
  sound_enabled: true,
  sound_volume: 70,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Charger les paramètres
  useEffect(() => {
    loadSettings();
  }, []);

  // Appliquer le thème
  useEffect(() => {
    if (!isLoaded) return;
    const theme = getThemeById(settings.theme);
    applyThemeToDOM(theme);
    setIsDarkMode(theme.mode === 'dark');
  }, [settings.theme, isLoaded]);

  // Appliquer la densité
  useEffect(() => {
    if (!isLoaded) return;
    applyDensity(settings.density);
  }, [settings.density, isLoaded]);

  // Appliquer la langue
  useEffect(() => {
    if (!isLoaded) return;
    applyLanguageToDOM(settings.language);
  }, [settings.language, isLoaded]);

  const loadSettings = () => {
    try {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = (newSettings: Settings) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  const applyDensity = (density: 'compact' | 'comfortable' | 'spacious') => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${density}`);
    
    const densityValues = {
      compact: { padding: '0.5rem', gap: '0.5rem', fontSize: '0.875rem' },
      comfortable: { padding: '1rem', gap: '1rem', fontSize: '1rem' },
      spacious: { padding: '1.5rem', gap: '1.5rem', fontSize: '1.125rem' },
    };
    
    const values = densityValues[density];
    root.style.setProperty('--density-padding', values.padding);
    root.style.setProperty('--density-gap', values.gap);
    root.style.setProperty('--density-font-size', values.fontSize);
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  };

  const t = getTranslation(settings.language);

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSetting, 
      updateSettings, 
      resetSettings,
      isDarkMode,
      t 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  
  if (!context) {
    console.warn('⚠️ useSettings hors Provider - valeurs par défaut');
    return {
      settings: defaultSettings,
      updateSetting: () => {},
      updateSettings: () => {},
      resetSettings: () => {},
      isDarkMode: false,
      t: translations.fr,
    };
  }
  
  return context;
}