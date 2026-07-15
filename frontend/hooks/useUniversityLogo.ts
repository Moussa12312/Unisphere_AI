import { useState, useEffect } from 'react';
import { universityService } from '@/services/universityService';

export function useUniversityLogo() {
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [universityName, setUniversityName] = useState<string>('UniSphere AI');
  const [slogan, setSlogan] = useState<string>('Excellence et Innovation');
  const [loading, setLoading] = useState(true);

  const loadLogo = async () => {
    try {
      const data = await universityService.getInfo();
      
      // ✅ LOG POUR VOIR CE QUE LE BACKEND ENVOIE VRAIMENT
      console.log("📦 DONNÉES REÇUES DU BACKEND:", data);
      
      setUniversityName(data.name || 'UniSphere AI');
      setSlogan(data.slogan || 'Excellence et Innovation');
      
      if (data.logo) {
        setLogoUrl(`http://localhost:8000/uploads/logos/${data.logo}?t=${Date.now()}`);
      } else {
        setLogoUrl('/logo.png');
      }
    } catch (error) {
      console.error('❌ Erreur chargement logo:', error);
      setLogoUrl('/logo.png');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();

    const handleUpdate = () => {
      console.log('🔄 Événement reçu, rechargement des infos...');
      loadLogo();
    };

    window.addEventListener('universityUpdated', handleUpdate);
    return () => window.removeEventListener('universityUpdated', handleUpdate);
  }, []);

  return { logoUrl, universityName, slogan, loading, refresh: loadLogo };
}