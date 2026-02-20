// ClassSync Dual Theme — Dark Purple (default) & Light

export const DARK = {
    bg: '#0f0c29',
    bgMid: '#1a1535',
    bgCard: 'rgba(255,255,255,0.07)',
    bgCardSolid: '#1e1a40',
    accent: '#7c6af7',
    accentLight: 'rgba(124,106,247,0.2)',
    accentDark: '#5a4fd4',
    teal: '#26D0CE',
    pink: '#aa4b6b',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.35)',
    success: '#4ade80',
    successBg: 'rgba(74,222,128,0.15)',
    danger: '#f87171',
    dangerBg: 'rgba(248,113,113,0.15)',
    warning: '#fbbf24',
    warningBg: 'rgba(251,191,36,0.15)',
    border: 'rgba(255,255,255,0.12)',
    borderAccent: 'rgba(124,106,247,0.5)',
};

export const LIGHT = {
    bg: '#f3f2ff',
    bgMid: '#ffffff',
    bgCard: 'rgba(124,106,247,0.06)',
    bgCardSolid: '#ffffff',
    accent: '#6c5ce7',
    accentLight: 'rgba(108,92,231,0.12)',
    accentDark: '#5a4fd4',
    teal: '#00b894',
    pink: '#d63031',
    textPrimary: '#1a1535',
    textSecondary: 'rgba(26,21,53,0.6)',
    textMuted: 'rgba(26,21,53,0.35)',
    success: '#27ae60',
    successBg: 'rgba(39,174,96,0.12)',
    danger: '#e17055',
    dangerBg: 'rgba(225,112,85,0.12)',
    warning: '#f39c12',
    warningBg: 'rgba(243,156,18,0.12)',
    border: 'rgba(26,21,53,0.12)',
    borderAccent: 'rgba(108,92,231,0.4)',
};

export const DARK_GRADIENT = ['#0f0c29', '#302b63', '#24243e'];
export const LIGHT_GRADIENT = ['#f3f2ff', '#ede9ff', '#e0d9ff'];

// Legacy exports — still used by screens that haven't adopted ThemeContext yet
export const COLORS = DARK;
export const GRADIENT = DARK_GRADIENT;

export const CARD = {
    borderRadius: 16,
    padding: 16,
    backgroundColor: DARK.bgCard,
    borderWidth: 1,
    borderColor: DARK.border,
};

export const INPUT_THEME = {
    colors: {
        onSurfaceVariant: DARK.textSecondary,
        background: DARK.bgMid,
    },
};
