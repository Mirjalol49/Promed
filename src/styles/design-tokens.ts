/**
 * iOS Design System Tokens
 * Based on Apple's Human Interface Guidelines
 */

import {
    systemColors,
    grayColors,
    labelColors,
    fillColors,
    backgroundColors,
    separatorColors,
    semanticColors,
} from './ios-colors';

// Typography Scale (iOS HIG)
export const typography = {
    largeTitle: {
        bold: { size: '34px', lineHeight: '41px', weight: '700' },
        regular: { size: '34px', lineHeight: '41px', weight: '400' },
    },
    title1: {
        bold: { size: '28px', lineHeight: '34px', weight: '700' },
        regular: { size: '28px', lineHeight: '34px', weight: '400' },
    },
    title2: {
        bold: { size: '22px', lineHeight: '28px', weight: '700' },
        regular: { size: '22px', lineHeight: '28px', weight: '400' },
    },
    title3: {
        semibold: { size: '20px', lineHeight: '25px', weight: '600' },
        regular: { size: '20px', lineHeight: '25px', weight: '400' },
    },
    headline: {
        semibold: { size: '17px', lineHeight: '22px', weight: '600' },
        regular: { size: '17px', lineHeight: '22px', weight: '400' },
    },
    body: {
        semibold: { size: '17px', lineHeight: '22px', weight: '600' },
        regular: { size: '17px', lineHeight: '22px', weight: '400' },
    },
    callout: {
        semibold: { size: '16px', lineHeight: '21px', weight: '600' },
        regular: { size: '16px', lineHeight: '21px', weight: '400' },
    },
    subheadline: {
        semibold: { size: '15px', lineHeight: '20px', weight: '600' },
        regular: { size: '15px', lineHeight: '20px', weight: '400' },
    },
    footnote: {
        semibold: { size: '13px', lineHeight: '18px', weight: '600' },
        regular: { size: '13px', lineHeight: '18px', weight: '400' },
    },
    caption1: {
        medium: { size: '12px', lineHeight: '16px', weight: '500' },
        regular: { size: '12px', lineHeight: '16px', weight: '400' },
    },
    caption2: {
        medium: { size: '11px', lineHeight: '13px', weight: '500' },
        regular: { size: '11px', lineHeight: '13px', weight: '400' },
    },
} as const;

// Spacing Scale (8pt grid system)
export const spacing = {
    0: '0px',
    1: '4px',   // 0.5 unit
    2: '8px',   // 1 unit
    3: '12px',  // 1.5 units
    4: '16px',  // 2 units
    5: '20px',  // 2.5 units
    6: '24px',  // 3 units
    8: '32px',  // 4 units
    10: '40px', // 5 units
    12: '48px', // 6 units
    16: '64px', // 8 units
    20: '80px', // 10 units
    24: '96px', // 12 units
} as const;

// Border Radius
export const borderRadius = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
} as const;

// Shadows (iOS-style elevation)
export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    custom: '0 2px 8px rgba(0, 0, 0, 0.08)',
} as const;

// Animation Durations
export const animations = {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
} as const;

// Export all tokens
export const designTokens = {
    colors: {
        system: systemColors,
        gray: grayColors,
        label: labelColors,
        fill: fillColors,
        background: backgroundColors,
        separator: separatorColors,
        semantic: semanticColors,
    },
    typography,
    spacing,
    borderRadius,
    shadows,
    animations,
} as const;

export default designTokens;
