export function getApiErrorMessage(error: any, defaultMessage: string = 'Une anomalie temporaire est survenue'): string {
  let role = '';
  if (typeof window !== 'undefined') {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      role = (user.role || localStorage.getItem('role') || '').toLowerCase();
    } catch {}
  }

  const status = error?.response?.status;
  const isServerOrNetwork = !status || status >= 500;

  if (isServerOrNetwork) {
    if (role === 'admin') {
      return "Une anomalie technique est survenue. Un rapport d'incident a été automatiquement transmis au Super-Admin (Support UniSphere). Vous pouvez le contacter directement via la messagerie.";
    } else {
      return "Une anomalie temporaire est survenue. L'équipe technique a été automatiquement informée. Veuillez contacter l'administrateur principal de votre établissement.";
    }
  }

  if (!error?.response?.data?.detail) {
    return defaultMessage;
  }

  const detail = error.response.data.detail;

  // Si c'est un tableau d'erreurs (validation FastAPI)
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const field = err.loc?.[err.loc.length - 1] || 'Champ';
        return `${field}: ${err.msg}`;
      })
      .join(', ');
  }

  // Si c'est une chaîne
  if (typeof detail === 'string') {
    return detail;
  }

  // Si c'est un objet avec msg
  if (detail.msg) {
    return detail.msg;
  }

  return defaultMessage;
}