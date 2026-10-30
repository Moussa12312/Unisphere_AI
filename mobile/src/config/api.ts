import { Platform } from 'react-native';

const getHost = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.hostname || '127.0.0.1';
  }
  // IP Wi-Fi active pour Expo Go et smartphones sur le réseau local
  return '192.168.1.8';
};

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || `http://${getHost()}:8000/api/v1`,
  TIMEOUT: 15000,
  APP_NAME: 'UniSphere AI Mobile',
  VERSION: '2.0.0',
};

export default API_CONFIG;
