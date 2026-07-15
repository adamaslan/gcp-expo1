export const theme = {
  bg: {
    base:    '#06070d',
    surface: '#0d1018',
    elevated:'#141926',
    overlay: 'rgba(47,216,255,0.08)',
  },
  border: {
    subtle: '#212a3d',
    accent: '#2fd8ff',
    neon:   '#2fd8ff',
  },
  text: {
    primary: '#e8ecf4',
    secondary:'#9aa4bd',
    muted:   '#6b7a99',
    inverse: '#06070d',
  },
  accent: {
    blue:   '#2fd8ff',
    cyan:   '#2fd8ff',
    green:  '#35d07f',
    red:    '#ff3b5c',
    yellow: '#f4b83f',
    indigo: '#6366f1',
  },
  verdict: {
    hold:    { bg: 'rgba(53,208,127,0.15)',  text: '#35d07f', border: '#35d07f' },
    fold:    { bg: 'rgba(255,59,92,0.15)',   text: '#ff3b5c', border: '#ff3b5c' },
    neutral: { bg: 'rgba(154,164,189,0.15)', text: '#9aa4bd', border: '#9aa4bd' },
  },
  sentiment: {
    bullish: { bg: 'rgba(53,208,127,0.15)',  text: '#35d07f' },
    bearish: { bg: 'rgba(255,59,92,0.15)',   text: '#ff3b5c' },
    neutral: { bg: 'rgba(154,164,189,0.15)', text: '#9aa4bd' },
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
