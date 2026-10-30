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

      // ✅ Pour le Super-Admin ou sur toute route /superadmin :
      // Afficher UNIQUEMENT l'identité SaaS UniSphere AI, JAMAIS les données d'une université cliente
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const role = localStorage.getItem('role');
        const userStr = localStorage.getItem('user');
        let parsedRole = role;
        if (!parsedRole && userStr) {
          try {
            parsedRole = JSON.parse(userStr)?.role;
          } catch {}
        }

        if (path.startsWith('/superadmin') || parsedRole === 'super_admin' || parsedRole === 'superadmin') {
          setUniversityName('UniSphere AI');
          setSlogan('Administration Plateforme SaaS');
          setLogoUrl(null);
          setLoading(false);
          return;
        }
      }

      const info = await universityService.getInfo();
      if (info) {
        if (info.name) setUniversityName(info.name);
        if (info.slogan) setSlogan(info.slogan);

        if (info.logo) {
          if (info.logo.startsWith('http://') || info.logo.startsWith('https://')) {
            setLogoUrl(info.logo);
          } else if (info.logo.startsWith('/')) {
            setLogoUrl(`${API_BASE_URL}${info.logo}`);
          } else {
            const hasUploadPath = info.logo.includes('uploads/logos') || info.logo.includes('uploads\\logos');
            const cleanPath = hasUploadPath ? `/${info.logo}` : `/uploads/logos/${info.logo}`;
            setLogoUrl(`${API_BASE_URL}${cleanPath}`);
          }
        } else {
          setLogoUrl(null);
        }
      }
    } catch (err) {
      setLogoUrl(null);
      setUniversityName('UniSphere AI');
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