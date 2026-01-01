export const colors = {
  // Primary colors
  primary: "#007bff",
  primaryDark: "#0056b3",
  primaryLight: "#66b3ff",

  // Success/Complete
  success: "#28a745",
  successDark: "#1e7e34",
  successLight: "#71dd8a",

  // Danger/Error
  danger: "#dc3545",
  dangerDark: "#c82333",
  dangerLight: "#f1b0b7",

  // Warning
  warning: "#ffc107",
  warningDark: "#e0a800",
  warningLight: "#fff3cd",

  // Neutral colors
  white: "#ffffff",
  black: "#000000",

  // Gray scale
  gray50: "#f8f9fa",
  gray100: "#e9ecef",
  gray200: "#dee2e6",
  gray300: "#ced4da",
  gray400: "#adb5bd",
  gray500: "#6c757d",
  gray600: "#495057",
  gray700: "#343a40",
  gray800: "#212529",
  gray900: "#0d1117",

  // Background colors
  background: "#f8f9fa",
  surface: "#ffffff",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Text colors
  textPrimary: "#212529",
  textSecondary: "#6c757d",
  textMuted: "#adb5bd",
  textInverse: "#ffffff",

  // Border colors
  border: "#dee2e6",
  borderLight: "#e9ecef",
  borderDark: "#adb5bd",
} as const;

export type Color = keyof typeof colors;
