import { css } from 'styled-components';
import { mediaQuery } from '../hooks/useDevice';

// Typography Scale
export const typography = {
  // Font Families
  fonts: {
    primary: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    secondary: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
  },

  // Font Weights
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800
  },

  // Line Heights
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
};

// Responsive Font Sizes
export const fontSizes = {
  xs: css`
    font-size: 0.75rem;
    line-height: ${typography.lineHeights.tight};
    
    ${mediaQuery('tablet')} {
      font-size: 0.8rem;
    }
  `,
  
  sm: css`
    font-size: 0.875rem;
    line-height: ${typography.lineHeights.normal};
    
    ${mediaQuery('tablet')} {
      font-size: 0.9rem;
    }
  `,
  
  base: css`
    font-size: 1rem;
    line-height: ${typography.lineHeights.normal};
    
    ${mediaQuery('tablet')} {
      font-size: 1.1rem;
    }
  `,
  
  lg: css`
    font-size: 1.125rem;
    line-height: ${typography.lineHeights.normal};
    
    ${mediaQuery('tablet')} {
      font-size: 1.2rem;
    }
  `,
  
  xl: css`
    font-size: 1.25rem;
    line-height: ${typography.lineHeights.tight};
    
    ${mediaQuery('tablet')} {
      font-size: 1.3rem;
    }
  `,
  
  '2xl': css`
    font-size: 1.5rem;
    line-height: ${typography.lineHeights.tight};
    
    ${mediaQuery('tablet')} {
      font-size: 1.6rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.4rem;
    }
  `,
  
  '3xl': css`
    font-size: 1.875rem;
    line-height: ${typography.lineHeights.tight};
    
    ${mediaQuery('tablet')} {
      font-size: 1.75rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.5rem;
    }
  `,
  
  '4xl': css`
    font-size: 2.25rem;
    line-height: ${typography.lineHeights.tight};
    
    ${mediaQuery('tablet')} {
      font-size: 2rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.75rem;
    }
  `,
  
  '5xl': css`
    font-size: 3rem;
    line-height: 1;
    
    ${mediaQuery('tablet')} {
      font-size: 2.5rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 2rem;
    }
  `,
  
  '6xl': css`
    font-size: 3.75rem;
    line-height: 1;
    
    ${mediaQuery('tablet')} {
      font-size: 3rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 2.5rem;
    }
  `
};

// Heading Styles
export const headingStyles = {
  h1: css`
    ${fontSizes['4xl']}
    font-weight: ${typography.weights.bold};
    letter-spacing: ${typography.letterSpacing.tight};
    margin-bottom: 1.5rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 1.25rem;
    }
    
    ${mediaQuery('mobile')} {
      margin-bottom: 1rem;
    }
  `,
  
  h2: css`
    ${fontSizes['3xl']}
    font-weight: ${typography.weights.semiBold};
    letter-spacing: ${typography.letterSpacing.tight};
    margin-bottom: 1.25rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 1rem;
    }
    
    ${mediaQuery('mobile')} {
      margin-bottom: 0.875rem;
    }
  `,
  
  h3: css`
    ${fontSizes['2xl']}
    font-weight: ${typography.weights.semiBold};
    letter-spacing: ${typography.letterSpacing.normal};
    margin-bottom: 1rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 0.875rem;
    }
    
    ${mediaQuery('mobile')} {
      margin-bottom: 0.75rem;
    }
  `,
  
  h4: css`
    ${fontSizes.xl}
    font-weight: ${typography.weights.medium};
    letter-spacing: ${typography.letterSpacing.normal};
    margin-bottom: 0.875rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 0.75rem;
    }
    
    ${mediaQuery('mobile')} {
      margin-bottom: 0.625rem;
    }
  `,
  
  h5: css`
    ${fontSizes.lg}
    font-weight: ${typography.weights.medium};
    letter-spacing: ${typography.letterSpacing.normal};
    margin-bottom: 0.75rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 0.625rem;
    }
  `,
  
  h6: css`
    ${fontSizes.base}
    font-weight: ${typography.weights.semiBold};
    letter-spacing: ${typography.letterSpacing.wide};
    text-transform: uppercase;
    margin-bottom: 0.625rem;
    
    ${mediaQuery('tablet')} {
      margin-bottom: 0.5rem;
    }
  `
};

// Text Styles
export const textStyles = {
  body: css`
    ${fontSizes.base}
    font-weight: ${typography.weights.normal};
    line-height: ${typography.lineHeights.relaxed};
    margin-bottom: 1rem;
  `,
  
  bodyLarge: css`
    ${fontSizes.lg}
    font-weight: ${typography.weights.normal};
    line-height: ${typography.lineHeights.relaxed};
    margin-bottom: 1.25rem;
  `,
  
  bodySmall: css`
    ${fontSizes.sm}
    font-weight: ${typography.weights.normal};
    line-height: ${typography.lineHeights.normal};
    margin-bottom: 0.875rem;
  `,
  
  caption: css`
    ${fontSizes.xs}
    font-weight: ${typography.weights.normal};
    line-height: ${typography.lineHeights.tight};
    color: #6b7280;
    margin-bottom: 0.5rem;
  `,
  
  lead: css`
    ${fontSizes.xl}
    font-weight: ${typography.weights.normal};
    line-height: ${typography.lineHeights.relaxed};
    color: #4b5563;
    margin-bottom: 1.5rem;
  `,
  
  label: css`
    ${fontSizes.sm}
    font-weight: ${typography.weights.medium};
    line-height: ${typography.lineHeights.tight};
    letter-spacing: ${typography.letterSpacing.wide};
    text-transform: uppercase;
  `
};

// Spacing Scale
// Define the base scale first, then build any derived/responsive helpers
const spacingScale = {
  // Base spacing unit (1rem = 16px by default)
  base: '1rem',

  // Spacing scale
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem'        // 384px
};

export const spacing = {
  ...spacingScale,
  // Responsive spacing helpers built on top of the base scale
  responsive: {
    xs: css`
      ${mediaQuery('mobile')} {
        margin: ${spacingScale[2]};
        padding: ${spacingScale[2]};
      }
    `,

    sm: css`
      margin: ${spacingScale[3]};
      padding: ${spacingScale[3]};

      ${mediaQuery('tablet')} {
        margin: ${spacingScale[2.5]};
        padding: ${spacingScale[2.5]};
      }

      ${mediaQuery('mobile')} {
        margin: ${spacingScale[2]};
        padding: ${spacingScale[2]};
      }
    `,

    md: css`
      margin: ${spacingScale[4]};
      padding: ${spacingScale[4]};

      ${mediaQuery('tablet')} {
        margin: ${spacingScale[3]};
        padding: ${spacingScale[3]};
      }

      ${mediaQuery('mobile')} {
        margin: ${spacingScale[2]};
        padding: ${spacingScale[2]};
      }
    `,

    lg: css`
      margin: ${spacingScale[6]};
      padding: ${spacingScale[6]};

      ${mediaQuery('tablet')} {
        margin: ${spacingScale[4]};
        padding: ${spacingScale[4]};
      }

      ${mediaQuery('mobile')} {
        margin: ${spacingScale[3]};
        padding: ${spacingScale[3]};
      }
    `,

    xl: css`
      margin: ${spacingScale[8]};
      padding: ${spacingScale[8]};

      ${mediaQuery('tablet')} {
        margin: ${spacingScale[6]};
        padding: ${spacingScale[6]};
      }

      ${mediaQuery('mobile')} {
        margin: ${spacingScale[4]};
        padding: ${spacingScale[4]};
      }
    `
  }
};

// Container Sizes
const containerBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

export const containers = {
  ...containerBreakpoints,

  // Responsive container
  responsive: css`
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: ${spacingScale[4]};
    padding-right: ${spacingScale[4]};

    ${mediaQuery('tablet')} {
      padding-left: ${spacingScale[3]};
      padding-right: ${spacingScale[3]};
    }

    ${mediaQuery('mobile')} {
      padding-left: ${spacingScale[2]};
      padding-right: ${spacingScale[2]};
    }

    @media (min-width: ${containerBreakpoints.sm}) {
      max-width: ${containerBreakpoints.sm};
    }

    @media (min-width: ${containerBreakpoints.md}) {
      max-width: ${containerBreakpoints.md};
    }

    @media (min-width: ${containerBreakpoints.lg}) {
      max-width: ${containerBreakpoints.lg};
    }

    @media (min-width: ${containerBreakpoints.xl}) {
      max-width: ${containerBreakpoints.xl};
    }

    @media (min-width: ${containerBreakpoints['2xl']}) {
      max-width: ${containerBreakpoints['2xl']};
    }
  `
};

// Utility mixins
export const utils = {
  // Truncate text
  truncate: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  
  // Screen reader only
  srOnly: css`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `,
  
  // Focus visible styles
  focusVisible: css`
    &:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  `,
  
  // Touch target minimum
  touchTarget: css`
    min-width: 44px;
    min-height: 44px;
    
    ${mediaQuery('tablet')} {
      min-width: 48px;
      min-height: 48px;
    }
  `,
  
  // Smooth animations
  smoothTransition: css`
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `,
  
  // Card shadow
  cardShadow: css`
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    
    &:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
  `
};

// Export everything
export default {
  typography,
  fontSizes,
  headingStyles,
  textStyles,
  spacing,
  containers,
  utils
};
