/**
 * Stitches — Design System do SisConfec
 *
 * Centraliza tokens de design: cores, tipografia, espaçamentos e breakpoints.
 * Todos os componentes usam `styled` e `css` exportados daqui.
 */
import { createStitches } from '@stitches/react'

export const {
  styled,
  css,
  globalCss,
  keyframes,
  getCssText,
  theme,
  createTheme,
  config,
} = createStitches({
  // ------- PREFIXO CSS -------
  prefix: 'sc',

  // ------- TEMA BASE -------
  theme: {
    colors: {
      // Marca
      primary50:  '#eff6ff',
      primary100: '#dbeafe',
      primary200: '#bfdbfe',
      primary500: '#3b82f6',
      primary600: '#2563eb',
      primary700: '#1d4ed8',
      primary900: '#1e3a8a',

      // Neutros
      gray50:  '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray600: '#4b5563',
      gray700: '#374151',
      gray800: '#1f2937',
      gray900: '#111827',

      // Semânticas
      success50:  '#f0fdf4',
      success500: '#22c55e',
      success700: '#15803d',

      warning50:  '#fffbeb',
      warning500: '#f59e0b',
      warning700: '#b45309',

      danger50:  '#fef2f2',
      danger500: '#ef4444',
      danger700: '#b91c1c',

      // Fundo e superfície
      background: '#f9fafb',
      surface:    '#ffffff',
      border:     '#e5e7eb',

      // Texto
      textPrimary:   '#111827',
      textSecondary: '#6b7280',
      textDisabled:  '#9ca3af',
      textInverse:   '#ffffff',
    },

    fonts: {
      sans: "'Inter', system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },

    fontSizes: {
      xs:   '0.75rem',   // 12px
      sm:   '0.875rem',  // 14px
      base: '1rem',      // 16px
      lg:   '1.125rem',  // 18px
      xl:   '1.25rem',   // 20px
      '2xl':'1.5rem',    // 24px
      '3xl':'1.875rem',  // 30px
      '4xl':'2.25rem',   // 36px
    },

    fontWeights: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },

    lineHeights: {
      tight:  '1.25',
      normal: '1.5',
      loose:  '1.75',
    },

    space: {
      1:  '0.25rem',   // 4px
      2:  '0.5rem',    // 8px
      3:  '0.75rem',   // 12px
      4:  '1rem',      // 16px
      5:  '1.25rem',   // 20px
      6:  '1.5rem',    // 24px
      8:  '2rem',      // 32px
      10: '2.5rem',    // 40px
      12: '3rem',      // 48px
      16: '4rem',      // 64px
      20: '5rem',      // 80px
    },

    sizes: {
      sidebar: '256px',
      header:  '64px',
      maxPage: '1280px',
    },

    radii: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      full: '9999px',
    },

    shadows: {
      sm:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md:  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg:  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl:  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },

    transitions: {
      fast:   '100ms ease',
      normal: '200ms ease',
      slow:   '300ms ease',
    },
  },

  // ------- MEDIA QUERIES -------
  media: {
    sm:  '(min-width: 640px)',
    md:  '(min-width: 768px)',
    lg:  '(min-width: 1024px)',
    xl:  '(min-width: 1280px)',
    '2xl': '(min-width: 1536px)',
  },

  // ------- UTILITÁRIOS -------
  utils: {
    // Margin shorthands
    mx: (value) => ({ marginLeft: value, marginRight: value }),
    my: (value) => ({ marginTop: value, marginBottom: value }),
    // Padding shorthands
    px: (value) => ({ paddingLeft: value, paddingRight: value }),
    py: (value) => ({ paddingTop: value, paddingBottom: value }),
    // Tamanho
    size: (value) => ({ width: value, height: value }),
    // Centralizar flex
    flexCenter: (value) => ({
      display: 'flex',
      alignItems: value ? 'center' : undefined,
      justifyContent: value ? 'center' : undefined,
    }),
  },
})

// ------- TEMA ESCURO -------
export const darkTheme = createTheme('sc-dark', {
  colors: {
    background:    '#0f172a',
    surface:       '#1e293b',
    border:        '#334155',
    textPrimary:   '#f1f5f9',
    textSecondary: '#94a3b8',
    textDisabled:  '#64748b',
    gray50:  '#1e293b',
    gray100: '#334155',
    gray200: '#475569',
    gray300: '#64748b',
    gray400: '#94a3b8',
    gray500: '#94a3b8',
    gray600: '#cbd5e1',
    gray700: '#e2e8f0',
    gray800: '#f1f5f9',
    gray900: '#0f172a',
  },
})

// ------- RESET GLOBAL -------
export const globalStyles = globalCss({
  '*, *::before, *::after': {
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
  },
  html: {
    fontFamily: '$sans',
    fontSize: '16px',
    lineHeight: '$normal',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  body: {
    backgroundColor: '$background',
    color: '$textPrimary',
  },
  'button, input, select, textarea': {
    fontFamily: 'inherit',
  },
  a: {
    color: 'inherit',
    textDecoration: 'none',
  },

  // ------- CSS DE IMPRESSÃO -------
  '@media print': {
    'aside, nav, header, .no-print, [data-no-print]': {
      display: 'none !important',
    },
    body: {
      backgroundColor: '#fff !important',
      color: '#000 !important',
      fontSize: '11pt',
    },
    table: {
      pageBreakInside: 'auto',
      borderCollapse: 'collapse',
    },
    tr: { pageBreakInside: 'avoid' },
    th: { backgroundColor: '#f3f4f6 !important', color: '#000 !important' },
    '@page': { margin: '1.5cm' },
  },
})
