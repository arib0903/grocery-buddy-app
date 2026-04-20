# Assets Directory

This directory contains static assets for the Grocery Buddy app.

## Structure

- `images/` - Contains icons, illustrations, and other image assets
  - Add any custom icons or images here as your app grows
  - Consider organizing by category (e.g., `icons/`, `illustrations/`, `logos/`)

## Usage

Import images in your React Native components like this:

```typescript
// For local images
const myIcon = require('./assets/images/icon-name.png');

// In your component
<Image source={myIcon} style={styles.icon} />
```

## File Naming Convention

- Use lowercase with hyphens: `grocery-icon.png`
- Include size in filename if multiple sizes: `logo-small.png`, `logo-large.png`
- Use descriptive names that indicate the image's purpose