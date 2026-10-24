import { Platform } from 'react-native';

const DEFAULT_LOCAL_IP = '192.168.100.17';

export const API_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === 'android'
      ? `http://${DEFAULT_LOCAL_IP}:8000/api/v1`
      : 'http://localhost:8000/api/v1'),
  TIMEOUT: 15000,
  APP_NAME: 'UniSphere AI Mobile',
  VERSION: '2.0.0',
};
