import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Proxy Next.js : requêtes envoyées à la même origine
const API_URL = '';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const isOffline = !navigator.onLine || Boolean(error.response?.data?.offline);

      // En mode hors-ligne, ne jamais déconnecter l'utilisateur ni envoyer de rapports d'incidents
      if (isOffline) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const url = error.config?.url || '';

      if (
        status === 401 &&
        !window.location.pathname.startsWith('/login') &&
        window.location.pathname !== '/'
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Signalement silencieux au Super-Admin en cas d'erreur serveur réelle (en ligne uniquement)
      if (status && status >= 500 && status !== 503 && !url.includes('/report-incident')) {
        try {
          const token = localStorage.getItem('token');
          fetch('/api/v1/superadmin/report-incident', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              url: window.location.pathname,
              api_url: url,
              error_code: status,
              error_message: error.message || 'Erreur inattendue',
              stack_trace: error.response?.data?.detail
                ? JSON.stringify(error.response.data.detail)
                : error.stack || '',
              action_attempted: `Requête ${error.config?.method?.toUpperCase() || 'ACTION'} sur ${url}`,
            }),
          }).catch(() => {});
        } catch {}
      }
    }
    return Promise.reject(error);
  }
);

export const API_BASE_URL = API_URL;

export const getMediaUrl = (path?: string | null, fallback?: string): string => {
  if (!path) return fallback || '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const clean = path.trim();
  if (clean.startsWith('/uploads/')) return clean;
  if (clean.startsWith('uploads/')) return `/${clean}`;
  const leadingSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return `/uploads${leadingSlash}`;
};

export default api;
