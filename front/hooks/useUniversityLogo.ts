'use client';

import { useState, useEffect, useCallback } from 'react';
import { universityService } from '@/services/universityService';
import { API_BASE_URL } from '@/lib/api';

export function useUniversityLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState<string>('UniSphere AI');
  const [slogan, setSlogan] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await universityService.getInfo();
      if (info) {
        if (info.name) setUniversityName(info.name);
        if (info.slogan) setSlogan(info.slogan);

        if (info.logo) {
          // ✅ URL absolue (http/https) → utiliser directement
          if (info.logo.startsWith('http://') || info.logo.startsWith('https://')) {
            setLogoUrl(info.logo);
          } 
          // ✅ Chemin relatif commençant par / → juste concaténer
          else if (info.logo.startsWith('/')) {
            setLogoUrl(`${API_BASE_URL}${info.logo}`);
          }
          // ✅ Chemin relatif sans / → ajouter / au début
          else {
            // Vérifier si le chemin contient déjà "uploads/logos"
            const hasUploadPath = info.logo.includes('uploads/logos') || info.logo.includes('uploads\\logos');
            const cleanPath = hasUploadPath ? `/${info.logo}` : `/uploads/logos/${info.logo}`;
            setLogoUrl(`${API_BASE_URL}${cleanPath}`);
          }
        } else {
          setLogoUrl(null);
        }
      }
    } catch (err) {
      console.error('Error loading university logo info:', err);
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogo();

    const handleUpdate = () => {
      loadLogo();
    };

    window.addEventListener('university_info_updated', handleUpdate);
    return () => {
      window.removeEventListener('university_info_updated', handleUpdate);
    };
  }, [loadLogo]);

  return {
    logoUrl,
    universityName,
    slogan,
    loading,
    refreshLogo: loadLogo
  };
}