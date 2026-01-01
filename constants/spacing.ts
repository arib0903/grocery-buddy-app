/*
 * THIS FILE (spacing.ts): All the spacing and sizing values used in your app  
 * Instead of guessing "16px" everywhere, you can use "spacing.lg"
 * This keeps your app looking consistent and makes it easy to adjust spacing
 */

export const spacing = {
  // Base spacing unit (4px)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  
  // Component-specific spacing
  buttonPadding: {
    horizontal: 24,
    vertical: 14,
  },
  
  cardPadding: {
    horizontal: 16,
    vertical: 16,
  },
  
  screenPadding: {
    horizontal: 16,
    vertical: 16,
  },
  
  // Container spacing
  containerGap: 16,
  sectionGap: 24,
  itemGap: 8,
  
  // Form spacing
  fieldGap: 16,
  labelGap: 8,
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    pill: 50,
  },
  
  // Shadow/elevation
  shadowOffset: {
    small: { width: 0, height: 1 },
    medium: { width: 0, height: 2 },
    large: { width: 0, height: 4 },
  },
  
  shadowOpacity: {
    light: 0.05,
    medium: 0.1,
    heavy: 0.3,
  },
  
  shadowRadius: {
    small: 2,
    medium: 4,
    large: 8,
  },
  
  // Floating action button
  fab: {
    size: 56,
    bottom: 24,
    right: 24,
  },
} as const;

export type SpacingKey = keyof typeof spacing;