import { Platform, NativeModules } from 'react-native';

const PRODUCTION_API_URL = 'https://unisphere-ai.com/api/v1';

const resolveApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Sur le Web, utiliser le domaine actif (ou proxy local)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || '127.0.0.1';
    if (host === 'unisphere-ai.com' || host === 'www.unisphere-ai.com') {
      return `${window.location.origin}/api/v1`;
    }
    return `http://${host}:8000/api/v1`;
  }

  // En développement Expo Go / Metro, détecter automatiquement l'IP Wi-Fi ou Hotspot du PC hôte
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
        if (match && match[1]) {
          return `http://${match[1]}:8000/api/v1`;
        }
      }
    } catch {
      // Fallback ci-dessous
    }
  }

  // En production mobile (APK / IPA autonome) ou hors Metro, cibler le serveur officiel HTTPS
  return PRODUCTION_API_URL;
};

export const API_CONFIG = {
  BASE_URL: resolveApiBaseUrl(),
  TIMEOUT: 15000,
  APP_NAME: 'UniSphere AI Mobile',
  VERSION: '2.0.0',
};

export default API_CONFIG;
