export interface Theme {
    id: string;
    name: string;
    emoji: string;
    mode: 'light' | 'dark';
    colors: {
      primary: string;
      primaryHover: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      border: string;
    };
  }
  
  export const themes: Theme[] = [
    {
      id: 'light-orange',
      name: 'Orange Clair',
      emoji: '🌅',
      mode: 'light',
      colors: {
        primary: '#FF6B00',
        primaryHover: '#e55f00',
        background: '#f9fafb',
        surface: '#ffffff',
        text: '#111827',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
      },
    },
    {
      id: 'dark-orange',
      name: 'Orange Sombre',
      emoji: '🌆',
      mode: 'dark',
      colors: {
        primary: '#FF6B00',
        primaryHover: '#ff8533',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
      },
    },
    {
      id: 'light-blue',
      name: 'Bleu Clair',
      emoji: '🌊',
      mode: 'light',
      colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        background: '#f0f9ff',
        surface: '#ffffff',
        text: '#0c4a6e',
        textSecondary: '#64748b',
        border: '#dbeafe',
      },
    },
    {
      id: 'dark-blue',
      name: 'Bleu Sombre',
      emoji: '🌌',
      mode: 'dark',
      colors: {
        primary: '#60a5fa',
        primaryHover: '#93c5fd',
        background: '#0c1220',
        surface: '#1e293b',
        text: '#e0f2fe',
        textSecondary: '#7dd3fc',
        border: '#1e40af',
      },
    },
    {
      id: 'light-green',
      name: 'Vert Clair',
      emoji: '🌿',
      mode: 'light',
      colors: {
        primary: '#10b981',
        primaryHover: '#059669',
        background: '#f0fdf4',
        surface: '#ffffff',
        text: '#14532d',
        textSecondary: '#4ade80',
        border: '#dcfce7',
      },
    },
    {
      id: 'dark-green',
      name: 'Vert Sombre',
      emoji: '🌲',
      mode: 'dark',
      colors: {
        primary: '#34d399',
        primaryHover: '#6ee7b7',
        background: '#022c22',
        surface: '#064e3b',
        text: '#d1fae5',
        textSecondary: '#a7f3d0',
        border: '#065f46',
      },
    },
    {
      id: 'light-purple',
      name: 'Violet Clair',
      emoji: '💜',
      mode: 'light',
      colors: {
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        background: '#faf5ff',
        surface: '#ffffff',
        text: '#4c1d95',
        textSecondary: '#a78bfa',
        border: '#ede9fe',
      },
    },
    {
      id: 'dark-purple',
      name: 'Violet Sombre',
      emoji: '🔮',
      mode: 'dark',
      colors: {
        primary: '#a78bfa',
        primaryHover: '#c4b5fd',
        background: '#1e1b2e',
        surface: '#2d2a3e',
        text: '#ede9fe',
        textSecondary: '#c4b5fd',
        border: '#4c1d95',
      },
    },
  ];
  
  export function getThemeById(id: string): Theme {
    return themes.find(t => t.id === id) || themes[0];
  }
  
  export function applyTheme(theme: Theme, customPrimary?: string) {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Appliquer le mode clair/sombre
    root.classList.toggle('dark', theme.mode === 'dark');
    
    const primaryColor = customPrimary || theme.colors.primary;
    // Approximation simple pour la couleur hover si customPrimary est défini
    const primaryHover = customPrimary ? customPrimary : theme.colors.primaryHover;
    
    // Appliquer les couleurs via variables CSS
    root.style.setProperty('--theme-primary', primaryColor);
    root.style.setProperty('--theme-primary-hover', primaryHover);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-border', theme.colors.border);
    
    // Mettre à jour aussi les styles dynamiques injectés
    let styleTag = document.getElementById('dynamic-theme-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-theme-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        --theme-primary: ${primaryColor} !important;
        --theme-primary-hover: ${primaryHover} !important;
        --theme-background: ${theme.colors.background} !important;
        --theme-surface: ${theme.colors.surface} !important;
        --theme-text: ${theme.colors.text} !important;
        --theme-text-secondary: ${theme.colors.textSecondary} !important;
        --theme-border: ${theme.colors.border} !important;
      }
      .bg-\\[\\#FF6B00\\], .bg-orange-500, .bg-orange-600 {
        background-color: ${primaryColor} !important;
      }
      .text-\\[\\#FF6B00\\], .text-orange-500, .text-orange-600 {
        color: ${primaryColor} !important;
      }
      .border-\\[\\#FF6B00\\], .border-orange-500, .border-orange-600 {
        border-color: ${primaryColor} !important;
      }
      .hover\\:bg-\\[\\#e55f00\\]:hover, .hover\\:bg-orange-600:hover, .hover\\:bg-orange-700:hover {
        background-color: ${primaryHover} !important;
      }
      .hover\\:text-\\[\\#FF6B00\\]:hover, .hover\\:text-orange-500:hover {
        color: ${primaryColor} !important;
      }
      .focus\\:ring-\\[\\#FF6B00\\]:focus {
        --tw-ring-color: ${primaryColor} !important;
      }
    `;
    
    // Appliquer directement sur le body pour un effet immédiat
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;
  }