export const typography = {

  sizes: {

    sectionLabel: 11,

    caption: 12,

    bodySmall: 13,

    body: 14,

    title: 16,

    pageHeader: 20,

    pageHeaderLarge: 22,

  },

  weights: {

    regular: 400,

    medium: 500,

    semibold: 600,

    bold: 700,

    extrabold: 800,

  },

  colors: {

    primary: '#0B1F3A',

    secondary: '#6B7686',

    muted: '#9CA3AF',

    accent: '#1877D6',

    danger: '#CC2229',

    success: '#15803D',

    warning: '#F59E0B',

    canvas: '#EEF2F7',

  },

  family: 'Poppins, sans-serif',

} as const;

export type TypographySize =

  keyof typeof typography.sizes;

export type TypographyWeight =

  keyof typeof typography.weights;

export type TypographyColor =

  keyof typeof typography.colors;

// Convenience helpers

export function fontSize(

  size: TypographySize): number {

  return typography.sizes[size];

}

export function fontWeight(

  weight: TypographyWeight): number {

  return typography.weights[weight];

}

export function color(

  name: TypographyColor): string {

  return typography.colors[name];

}

// Common text style combos

export const textStyles = {

  sectionLabel: {

    fontSize: 11,

    fontWeight: 600,

    color: '#9CA3AF',

    textTransform: 'uppercase' as const,

    letterSpacing: '0.08em',

    fontFamily: 'Poppins, sans-serif',

  },

  pageHeader: {

    fontSize: 20,

    fontWeight: 800,

    color: '#0B1F3A',

    fontFamily: 'Poppins, sans-serif',

    letterSpacing: '-0.3px',

  },

  cardTitle: {

    fontSize: 15,

    fontWeight: 700,

    color: '#0B1F3A',

    fontFamily: 'Poppins, sans-serif',

  },

  bodyText: {

    fontSize: 14,

    fontWeight: 400,

    color: '#6B7686',

    fontFamily: 'Poppins, sans-serif',

    lineHeight: 1.6,

  },

  caption: {

    fontSize: 12,

    fontWeight: 400,

    color: '#9CA3AF',

    fontFamily: 'Poppins, sans-serif',

  },

  pill: {

    fontSize: 10,

    fontWeight: 700,

    fontFamily: 'Poppins, sans-serif',

  },

} as const;
