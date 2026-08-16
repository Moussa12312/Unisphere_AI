export function getApiErrorMessage(error: any, defaultMessage: string = 'Une erreur est survenue'): string {
  if (!error?.response?.data?.detail) {
    return defaultMessage;
  }

  const detail = error.response.data.detail;

  // Si c'est un tableau d'erreurs (validation FastAPI)
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        // Extraire le champ concerné
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