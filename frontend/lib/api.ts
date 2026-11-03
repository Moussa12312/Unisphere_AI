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

    const isFormData = typeof FormData !== 'undefined' && (
      config.data instanceof FormData ||
      (config.data && typeof config.data.append === 'function') ||
      Object.prototype.toString.call(config.data) === '[object FormData]'
    );

    if (isFormData) {
      if (config.headers) {
        if (typeof (config.headers as any).setContentType === 'function') {
          (config.headers as any).setContentType(false);
        }
        if (typeof (config.headers as any).delete === 'function') {
          (config.headers as any).delete('Content-Type');
          (config.headers as any).delete('content-type');
        }
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    } else if (config.headers && !config.headers['Content-Type']) {
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
  const clean = path.trim().replace(/\\/g, '/');
  if (clean.startsWith('/uploads/')) return clean;
  if (clean.startsWith('uploads/')) return `/${clean}`;
  if (clean.startsWith('logos/')) return `/uploads/${clean}`;
  if (clean.startsWith('/logos/')) return `/uploads${clean}`;

  if (clean.startsWith('university_') || clean.startsWith('logo_')) {
    return `/uploads/logos/${clean.replace(/^\//, '')}`;
  }

  const leadingSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return `/uploads${leadingSlash}`;
};

export default api;
