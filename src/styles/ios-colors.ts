/**
 * iOS Human Interface Guidelines Color System
 * Based on Apple's iOS design language
 */

// System Colors - Light Mode
export const systemColors = {
    red: '#FF3B30',
    orange: '#FF9500',
    yellow: '#FFCC00',
    green: '#34C759',
    mint: '#00C7BE',
    teal: '#30B0C7',
    cyan: '#32ADE6',
    blue: '#007AFF',
    indigo: '#5856D6',
    purple: '#AF52DE',
    pink: '#FF2D55',
    brown: '#A2845E',
    white: '#FFFFFF',
    black: '#000000',
} as const;

// System Colors - Dark Mode
export const systemColorsDark = {
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
    green: '#30D158',
    mint: '#63E6E2',
    teal: '#40CBE0',
    cyan: '#64D2FF',
    blue: '#0A84FF',
    indigo: '#5E5CE6',
    purple: '#BF5AF2',
    pink: '#FF375F',
    brown: '#AC8E68',
    white: '#FFFFFF',
    black: '#000000',
} as const;

// Gray Scale
export const grayColors = {
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
} as const;

export const grayColorsDark = {
    gray: '#8E8E93',
    gray2: '#636366',
    gray3: '#48484A',
    gray4: '#3A3A3C',
    gray5: '#2C2C2E',
    gray6: '#1C1C1E',
} as const;

// Label Colors - Light Mode
export const labelColors = {
    primary: '#000000',
    secondary: 'rgba(60, 60, 67, 0.6)',
    tertiary: 'rgba(60, 60, 67, 0.3)',
    quaternary: 'rgba(60, 60, 67, 0.18)',
} as const;

// Label Colors - Dark Mode
export const labelColorsDark = {
    primary: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.6)',
    tertiary: 'rgba(235, 235, 245, 0.3)',
    quaternary: 'rgba(235, 235, 245, 0.18)',
} as const;

// Fill Colors - Light Mode
export const fillColors = {
    primary: 'rgba(120, 120, 128, 0.2)',
    secondary: 'rgba(120, 120, 128, 0.16)',
    tertiary: 'rgba(118, 118, 128, 0.12)',
    quaternary: 'rgba(116, 116, 128, 0.08)',
} as const;

// Fill Colors - Dark Mode
export const fillColorsDark = {
    primary: 'rgba(120, 120, 128, 0.36)',
    secondary: 'rgba(120, 120, 128, 0.32)',
    tertiary: 'rgba(118, 118, 128, 0.24)',
    quaternary: 'rgba(116, 116, 128, 0.18)',
} as const;

// Background Colors - Light Mode
export const backgroundColors = {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',
    tertiary: '#FFFFFF',
} as const;

// Background Colors - Dark Mode
export const backgroundColorsDark = {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
} as const;

// Separator Colors - Light Mode
export const separatorColors = {
    opaque: '#C6C6C8',
    nonOpaque: 'rgba(60, 60, 67, 0.36)',
} as const;

// Separator Colors - Dark Mode
export const separatorColorsDark = {
    opaque: '#38383A',
    nonOpaque: 'rgba(84, 84, 88, 0.65)',
} as const;

// Semantic Color Mapping
export const semanticColors = {
    primary: systemColors.blue,
    success: systemColors.green,
    warning: systemColors.orange,
    error: systemColors.red,
    info: systemColors.cyan,
} as const;

export const semanticColorsDark = {
    primary: systemColorsDark.blue,
    success: systemColorsDark.green,
    warning: systemColorsDark.orange,
    error: systemColorsDark.red,
    info: systemColorsDark.cyan,
} as const;
