'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themes, getThemeById, applyTheme as applyThemeToDOM } from '@/lib/themes';
import { translations, getTranslation, applyLanguage as applyLanguageToDOM, Language, Translation } from '@/lib/translations';

import api from '@/lib/api';

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
  sidebarColor?: string; // Couleur de la barre latérale (ex: '#0a1628')
  buttonColor?: string; // Couleur des boutons (ex: '#FF6B00')
  customPrimaryColor?: string; // Code HEX personnalisé (ex: '#8B5CF6')
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
  resetSettings: () => Promise<void>;
  saveSettingsToServer: (customSettings?: Settings) => Promise<boolean>;
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
  sidebarColor: '#0a1628',
  buttonColor: '#FF6B00',
  customPrimaryColor: '#FF6B00',
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

  // Appliquer le thème et les couleurs (sidebar + boutons)
  useEffect(() => {
    if (!isLoaded) return;
    const theme = getThemeById(settings.theme);
    const activeBtnColor = settings.buttonColor || settings.customPrimaryColor || '#FF6B00';
    const activeSidebarColor = settings.sidebarColor || '#0a1628';
    applyThemeToDOM(theme, activeBtnColor, activeSidebarColor);
    setIsDarkMode(theme.mode === 'dark');
  }, [settings.theme, settings.customPrimaryColor, settings.buttonColor, settings.sidebarColor, isLoaded]);

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

  const loadSettings = async () => {
    try {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('app_settings');
      let localParsed: Partial<Settings> = {};
      if (saved) {
        try {
          localParsed = JSON.parse(saved);
          setSettings(prev => ({ ...prev, ...localParsed }));
        } catch {
          localParsed = {};
        }
      }

      const token = localStorage.getItem('token');
      if (token) {
        // 1. Charger les préférences personnelles réelles de l'utilisateur en base de données
        try {
          const prefRes = await api.get('/api/v1/users/preferences');
          if (prefRes.data && Object.keys(prefRes.data).length > 0) {
            localParsed = { ...localParsed, ...prefRes.data };
            setSettings(prev => {
              const merged = { ...prev, ...prefRes.data };
              try {
                localStorage.setItem('app_settings', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        } catch {
          // Hors ligne ou token expiré
        }

        // 2. Tenter de charger le profil université pour synchroniser les couleurs d'établissement
        try {
          const res = await api.get('/api/v1/settings/university/profile');
          if (res.data) {
            setSettings(prev => {
              const updated = {
                ...prev,
                ...localParsed,
                ...(res.data.theme && !localParsed.theme ? { theme: res.data.theme } : {}),
                ...(res.data.primary_color && !localParsed.customPrimaryColor ? { customPrimaryColor: res.data.primary_color } : {}),
                ...(res.data.language && !localParsed.language ? { language: res.data.language } : {}),
              };
              try {
                localStorage.setItem('app_settings', JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        } catch {
          // Ignorer si pas connecté ou endpoint non disponible
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('app_settings', JSON.stringify(newSettings));

      const token = localStorage.getItem('token');
      if (token) {
        try {
          await api.put('/api/v1/users/preferences', newSettings);
        } catch (e) {
          // Silencieux pour sauvegarde en arrière-plan
        }
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  const saveSettingsToServer = async (customSettings?: Settings): Promise<boolean> => {
    const toSave = customSettings || settings;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_settings', JSON.stringify(toSave));
      }
      const res = await api.put('/api/v1/users/preferences', toSave);
      return res.status === 200;
    } catch (error) {
      console.error('Erreur saveSettingsToServer:', error);
      throw error;
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

  const resetSettings = async () => {
    setSettings(defaultSettings);
    await saveSettings(defaultSettings);
  };

  const t = getTranslation(settings.language);

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSetting, 
      updateSettings, 
      resetSettings,
      saveSettingsToServer,
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
      resetSettings: async () => {},
      saveSettingsToServer: async () => false,
      isDarkMode: false,
      t: translations.fr,
    };
  }
  
  return context;
}