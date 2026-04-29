export type ThemeColors = {
  appBg: string;
  cardBg: string;
  surface: string;
  surfaceHover: string;
  text1: string;
  text2: string;
  text3: string;
  accent: string;
  accentH: string;
  border: string;
  borderS: string;
  scrollbarBg: string;
  scrollbarThumb: string;
};

export type ThemeDef = {
  id: string;
  name: string;
  colors: ThemeColors;
};

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'TekAccess',
    colors: {
      appBg: '#f6f6f6',
      cardBg: '#ffffff',
      surface: '#f5f5f5',
      surfaceHover: '#ebebeb',
      text1: '#0f0f0f',
      text2: '#4a4a4a',
      text3: '#888888',
      accent: '#1e3a8a',
      accentH: '#162d6e',
      border: 'rgba(0,0,0,0.08)',
      borderS: 'rgba(0,0,0,0.05)',
      scrollbarBg: '#e5e5e5',
      scrollbarThumb: '#c0c0c0',
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    colors: {
      appBg: '#f7f7f5',
      cardBg: '#ffffff',
      surface: '#f1f1ef',
      surfaceHover: '#e9e9e6',
      text1: '#37352f',
      text2: '#6b6b6b',
      text3: '#9b9b9b',
      accent: '#37352f',
      accentH: '#1a1917',
      border: 'rgba(55,53,47,0.09)',
      borderS: 'rgba(55,53,47,0.05)',
      scrollbarBg: '#ededed',
      scrollbarThumb: '#c7c6c4',
    },
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    colors: {
      appBg: '#f9f9f9',
      cardBg: '#ffffff',
      surface: '#efefef',
      surfaceHover: '#e2e2e2',
      text1: '#111111',
      text2: '#767676',
      text3: '#adadad',
      accent: '#e60023',
      accentH: '#c20f2f',
      border: 'rgba(0,0,0,0.08)',
      borderS: 'rgba(0,0,0,0.04)',
      scrollbarBg: '#e9e9e9',
      scrollbarThumb: '#c4c4c4',
    },
  },
  {
    id: 'github',
    name: 'GitHub',
    colors: {
      appBg: '#f6f8fa',
      cardBg: '#ffffff',
      surface: '#eaeef2',
      surfaceHover: '#dde3ea',
      text1: '#1f2328',
      text2: '#656d76',
      text3: '#9198a1',
      accent: '#0969da',
      accentH: '#0550ae',
      border: 'rgba(31,35,40,0.12)',
      borderS: 'rgba(31,35,40,0.06)',
      scrollbarBg: '#eaeef2',
      scrollbarThumb: '#b7bec8',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      appBg: '#f1f5f9',
      cardBg: '#ffffff',
      surface: '#e2e8f0',
      surfaceHover: '#cbd5e1',
      text1: '#0f172a',
      text2: '#475569',
      text3: '#94a3b8',
      accent: '#334155',
      accentH: '#1e293b',
      border: 'rgba(15,23,42,0.10)',
      borderS: 'rgba(15,23,42,0.06)',
      scrollbarBg: '#e2e8f0',
      scrollbarThumb: '#94a3b8',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      appBg: '#f5f8f6',
      cardBg: '#ffffff',
      surface: '#eaf2ed',
      surfaceHover: '#dde9e3',
      text1: '#1c2e22',
      text2: '#4a6655',
      text3: '#7a9c88',
      accent: '#2e7d52',
      accentH: '#246040',
      border: 'rgba(28,46,34,0.09)',
      borderS: 'rgba(28,46,34,0.05)',
      scrollbarBg: '#e4ede8',
      scrollbarThumb: '#a8c4b4',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      appBg: '#f8f6f1',
      cardBg: '#ffffff',
      surface: '#f0e8d8',
      surfaceHover: '#e6dbc8',
      text1: '#2c2010',
      text2: '#5c4830',
      text3: '#9c8060',
      accent: '#a06020',
      accentH: '#804c18',
      border: 'rgba(44,32,16,0.10)',
      borderS: 'rgba(44,32,16,0.06)',
      scrollbarBg: '#ede4d4',
      scrollbarThumb: '#c0a880',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      appBg: '#f8f5f5',
      cardBg: '#ffffff',
      surface: '#f0e8e8',
      surfaceHover: '#e6dcdc',
      text1: '#2c1818',
      text2: '#5c3c3c',
      text3: '#9c7070',
      accent: '#a03050',
      accentH: '#802440',
      border: 'rgba(44,24,24,0.10)',
      borderS: 'rgba(44,24,24,0.06)',
      scrollbarBg: '#ede4e4',
      scrollbarThumb: '#c4a4a4',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    colors: {
      appBg: '#f7f6f9',
      cardBg: '#ffffff',
      surface: '#eeeaf4',
      surfaceHover: '#e4deec',
      text1: '#201830',
      text2: '#504068',
      text3: '#8878a8',
      accent: '#5c48a0',
      accentH: '#483880',
      border: 'rgba(32,24,48,0.10)',
      borderS: 'rgba(32,24,48,0.06)',
      scrollbarBg: '#e8e4f0',
      scrollbarThumb: '#b4a8d0',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      appBg: '#f4f8f8',
      cardBg: '#ffffff',
      surface: '#e4eeec',
      surfaceHover: '#d8e6e4',
      text1: '#162828',
      text2: '#405858',
      text3: '#708888',
      accent: '#267070',
      accentH: '#1c5858',
      border: 'rgba(22,40,40,0.10)',
      borderS: 'rgba(22,40,40,0.06)',
      scrollbarBg: '#dce8e6',
      scrollbarThumb: '#90b4b0',
    },
  },
];

// ── Color math helpers ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

function mixColor(a: [number, number, number], b: [number, number, number], t: number): string {
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

function darkenHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

// Build a full ThemeColors from 4 key user-chosen colors.
export function deriveCustomTheme(bg: string, surface: string, text: string, accent: string): ThemeColors {
  const bgRgb = hexToRgb(bg);
  const textRgb = hexToRgb(text);
  return {
    appBg: bg,
    cardBg: '#ffffff',
    surface,
    surfaceHover: darkenHex(surface, 0.06),
    text1: text,
    text2: mixColor(textRgb, bgRgb, 0.42),
    text3: mixColor(textRgb, bgRgb, 0.68),
    accent,
    accentH: darkenHex(accent, 0.14),
    border: `rgba(${textRgb[0]},${textRgb[1]},${textRgb[2]},0.09)`,
    borderS: `rgba(${textRgb[0]},${textRgb[1]},${textRgb[2]},0.05)`,
    scrollbarBg: darkenHex(surface, 0.04),
    scrollbarThumb: mixColor(textRgb, bgRgb, 0.52),
  };
}

// Apply a ThemeColors object to the document root as CSS custom properties.
export function applyThemeColors(colors: ThemeColors): void {
  const r = document.documentElement;
  const hex8 = (hex: string, alpha: string) =>
    /^#[0-9a-f]{6}$/i.test(hex) ? hex + alpha : hex;

  r.style.setProperty('--app-bg', colors.appBg);
  r.style.setProperty('--card-bg', colors.cardBg);
  r.style.setProperty('--surface', colors.surface);
  r.style.setProperty('--surface-hover', colors.surfaceHover);
  r.style.setProperty('--text-1', colors.text1);
  r.style.setProperty('--text-2', colors.text2);
  r.style.setProperty('--text-3', colors.text3);
  r.style.setProperty('--accent', colors.accent);
  r.style.setProperty('--accent-h', colors.accentH);
  r.style.setProperty('--accent-glow', hex8(colors.accent, '1a'));
  r.style.setProperty('--accent-border', hex8(colors.accent, '4d'));
  r.style.setProperty('--border', colors.border);
  r.style.setProperty('--border-s', colors.borderS);
  r.style.setProperty('--scrollbar-bg', colors.scrollbarBg);
  r.style.setProperty('--scrollbar-thumb', colors.scrollbarThumb);
}
