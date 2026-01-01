/*
 * ========================================
 * PRIMARY BUTTON COMPONENT - REUSABLE BUTTON!
 * ========================================
 * 
 * THIS FILE (PrimaryButton.tsx): A reusable button component
 * Instead of styling buttons everywhere, you create one perfect button and use it everywhere
 * Can be styled as primary (blue) or secondary (outlined) button
 * Can be disabled when actions aren't available
 * 
 * WHAT YOU'LL LEARN:
 * - How to create custom button components
 * - How to use TouchableOpacity for button interactions
 * - How to handle optional props with default values
 * - How to apply conditional styling based on props
 * - How to make components more accessible
 */

// ========================================
// SECTION 1: IMPORTS
// ========================================
// TODO: Import React from 'react'

// TODO: Import the following from 'react-native':
// - TouchableOpacity (for creating touchable buttons)
// - Text
// - StyleSheet
// - TouchableOpacityProps (TypeScript type)


// ========================================
// SECTION 2: TYPESCRIPT INTERFACE
// ========================================
// TODO: Define an interface called PrimaryButtonProps that EXTENDS TouchableOpacityProps
// Add these additional properties:
// - title: string (button text)
// - variant?: 'primary' | 'secondary' (optional, button style)
// - disabled?: boolean (optional, whether button is disabled)


// ========================================
// SECTION 3: COMPONENT DEFINITION
// ========================================
// TODO: Create and export a default function called PrimaryButton
// Accept props of type PrimaryButtonProps
// Destructure: { title, variant = 'primary', disabled = false, style, ...props }
// Note: variant = 'primary' sets a default value if none provided

export default function PrimaryButton() {
  
  // ========================================
  // SECTION 4: RENDER / RETURN JSX
  // ========================================
  // TODO: Return the following JSX structure:
  //
  // <TouchableOpacity
  //   style={[
  //     styles.button,                                    // Base button style
  //     variant === 'secondary' && styles.buttonSecondary, // Secondary style if variant is secondary
  //     disabled && styles.buttonDisabled,                // Disabled style if disabled
  //     style,                                            // Custom style from props
  //   ]}
  //   disabled={disabled}
  //   activeOpacity={0.7}  // Opacity when pressed (0.7 = 70% opacity)
  //   {...props}           // Pass through other TouchableOpacity props
  // >
  //   <Text
  //     style={[
  //       styles.text,
  //       variant === 'secondary' && styles.textSecondary,
  //       disabled && styles.textDisabled,
  //     ]}
  //   >
  //     {title}
  //   </Text>
  // </TouchableOpacity>
  
  return null; // Replace this with your JSX!
}

// ========================================
// SECTION 5: STYLES
// ========================================
// TODO: Uncomment the StyleSheet.create() below when you've imported StyleSheet

// COMMENTED OUT - Uncomment when you import StyleSheet and remove 'const styles = {};' below
//
// const styles = StyleSheet.create({
//   button: {
//     backgroundColor: '#007bff',        // Primary blue
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     alignItems: 'center',              // Center text horizontally
//     justifyContent: 'center',          // Center text vertically
//     minHeight: 48,                     // Easy to tap
//   },
//   buttonSecondary: {
//     backgroundColor: 'transparent',    // No background for outlined button
//     borderWidth: 2,
//     borderColor: '#007bff',
//   },
//   buttonDisabled: {
//     backgroundColor: '#6c757d',        // Gray when disabled
//     opacity: 0.5,
//   },
//   text: {
//     color: '#fff',                     // White text for primary
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   textSecondary: {
//     color: '#007bff',                  // Blue text for secondary
//   },
//   textDisabled: {
//     color: '#fff',
//   },
// });

// Temporary placeholder - delete this when you uncomment the styles above
const styles = {};
