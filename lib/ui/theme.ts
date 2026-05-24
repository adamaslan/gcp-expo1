export const theme = {
  bg: {
    base: '#0a0a0f',
    surface: '#13131c',
    elevated: '#1a1a26',
    overlay: 'rgba(99,102,241,0.08)',
  },
  border: {
    subtle: '#262638',
    accent: '#4338ca',
    neon: '#6366f1',
  },
  text: {
    primary: '#e4e4f4',
    secondary: '#9696b0',
    muted: '#5a5a78',
    inverse: '#0a0a0f',
  },
  accent: {
    indigo: '#6366f1',
    indigoDeep: '#4338ca',
    cyan: '#22d3ee',
    green: '#10b981',
    red: '#f43f5e',
    yellow: '#fbbf24',
  },
  verdict: {
    hold: { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: '#10b981' },
    fold: { bg: 'rgba(244,63,94,0.15)', text: '#fb7185', border: '#f43f5e' },
    neutral: { bg: 'rgba(148,163,184,0.15)', text: '#cbd5e1', border: '#64748b' },
  },
  sentiment: {
    bullish: { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
    bearish: { bg: 'rgba(244,63,94,0.15)', text: '#fb7185' },
    neutral: { bg: 'rgba(148,163,184,0.15)', text: '#cbd5e1' },
  },
  font: {
    mono: 'Menlo',
  },
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
