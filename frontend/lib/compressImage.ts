/**
 * Redimensionne et ré-encode une image côté navigateur avant envoi.
 * Pourquoi : les photos de smartphone (iPhone notamment) font souvent 3 à 8 Mo
 * et peuvent être en HEIC ; elles sont alors rejetées ou tronquées par le proxy.
 * Le canvas convertit tout format lisible par le navigateur en JPEG/PNG léger.
 * En cas d'échec, le fichier d'origine est renvoyé (aucune régression).
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; quality?: number; keepPng?: boolean } = {}
): Promise<File> {
  const { maxDimension = 1200, quality = 0.85, keepPng = false } = options;
  if (typeof window === 'undefined' || !file || !file.type?.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return file;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const usePng = keepPng && file.type === 'image/png';
    const mime = usePng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob || blob.size === 0) return file;

    const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${usePng ? 'png' : 'jpg'}`, { type: mime });
  } catch {
    return file;
  }
}

