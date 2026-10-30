'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook qui écoute les événements de données UniSphere en temps réel
 * et déclenche un rechargement automatique silencieux sans recharger la page.
 */
export function useAutoRefresh(callback: () => void, types?: string[]) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventType = customEvent.detail?.type;

      if (!types || types.length === 0 || (eventType && types.includes(eventType))) {
        try {
          callbackRef.current();
        } catch (err) {
          console.warn('Auto refresh error:', err);
        }
      }
    };

    window.addEventListener('unisphere:data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('unisphere:data_changed', handleDataChanged);
    };
  }, [types]);
}
