'use client';

import { useState, useEffect, useCallback } from 'react';
import { universityService } from '@/services/universityService';
import { getMediaUrl } from '@/lib/api';

export function useUniversityLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState<string>('UniSphere AI');
  const [slogan, setSlogan] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#FF6B00');
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogo = useCallback(async () => {
    try {
      setLoading(true);

      // Pour le Super-Admin ou sur toute route /superadmin :
      // Afficher UNIQUEMENT l'identité centrale SaaS UniSphere AI
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
        const name = info.name || 'UniSphere AI';
        setUniversityName(name);
        if (info.slogan) setSlogan(info.slogan);
        if (info.primary_color) setPrimaryColor(info.primary_color);

        let finalLogo: string | null = null;
        if (info.logo) {
          finalLogo = getMediaUrl(info.logo);
          setLogoUrl(finalLogo);
        } else {
          setLogoUrl(null);
        }

        // 🎯 Adaptation dynamique du Favicon et du Titre de l'onglet du navigateur
        if (typeof document !== 'undefined') {
          if (finalLogo) {
            let iconLink: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (!iconLink) {
              iconLink = document.createElement('link');
              iconLink.rel = 'shortcut icon';
              document.head.appendChild(iconLink);
            }
            iconLink.href = finalLogo;

            // Apple Touch Icon pour mobiles
            let appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleIcon) {
              appleIcon = document.createElement('link');
              appleIcon.rel = 'apple-touch-icon';
              document.head.appendChild(appleIcon);
            }
            appleIcon.href = finalLogo;
          }

          if (name && name !== 'UniSphere AI') {
            if (!document.title.includes(name)) {
              document.title = `${name} — UniSphere AI`;
            }
          }
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
    primaryColor,
    loading,
    refreshLogo: loadLogo
  };
}
