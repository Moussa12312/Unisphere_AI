import { useState, useEffect } from 'react';

/**
 * Hook pour détecter les media queries CSS en temps réel
 * @param query - Media query CSS (ex: '(min-width: 960px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Vérifier si window existe (côté client uniquement)
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    
    // État initial
    setMatches(media.matches);

    // Listener pour les changements
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Moderne : addEventListener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Fallback pour les vieux navigateurs
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

/**
 * Hook simplifié pour détecter une largeur minimale
 */
export function useMinWidth(minWidth: number): boolean {
  return useMediaQuery(`(min-width: ${minWidth}px)`);
}

/**
 * Hook simplifié pour détecter une largeur maximale
 */
export function useMaxWidth(maxWidth: number): boolean {
  return useMediaQuery(`(max-width: ${maxWidth - 1}px)`);
}