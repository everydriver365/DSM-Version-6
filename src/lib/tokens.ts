export const tokens = {
  // Colours
  navy: '#0B1F3A',
  blue: '#1877D6',
  red: '#CC2229',
  green: '#15803D',
  amber: '#D68A1B',
  purple: '#7C3AED',

  // Backgrounds
  canvas: '#EEF2F7',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  sheetBg: '#EEF2F7',

  // Text
  textPrimary: '#0B1F3A',
  textSecondary: '#6B7686',
  textMuted: '#9CA3AF',

  // Borders
  border: '#E4E8EF',

  // Radius
  radiusCard: 16,
  radiusSheet: 28,
  radiusPill: 20,
  radiusButton: 20,
  radiusInput: 12,

  // Shadows
  shadowCard: '0 1px 3px rgba(11,31,58,0.06)',
  shadowSheet: '0 -8px 24px rgba(0,0,0,0.12)',
  shadowButton: '0 3px 0 rgba(0,0,0,0.15)',

  // Spacing
  pagePadding: 16,
  cardPadding: 16,
  sectionGap: 16,

  // Typography
  fontFamily: 'Poppins, sans-serif',
  fontSize: {
    xs: 10,
    sm: 11,
    base: 13,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    hero: 28,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;
