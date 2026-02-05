import { Font, StyleSheet } from '@react-pdf/renderer';
import type { ThemeConfig } from '../types';

// Register standard fonts
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 700 },
  ],
});

export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#1a1a1a',    // Black
    secondary: '#f5f5f5',  // Very Light Grey
    accent: '#888888',     // Grey
    text: '#1a1a1a',       // Black
    background: '#ffffff', // White
  },
  fonts: {
    heading: 'Open Sans',
    body: 'Open Sans',
  },
  shapes: {
    borderRadius: 0,       // Sharp corners for luxury feel
    cardStyle: 'flat',
  },
  background: {
    style: 'clean',
  }
};

export const createStyles = (theme: ThemeConfig = defaultTheme) => {
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: theme.colors.background,
      fontFamily: theme.fonts.body,
      color: theme.colors.text,
      // No bottom padding default, controlled by individual pages
    },
    // Standard Header (Small text only)
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingTop: 30,
      paddingBottom: 20,
      backgroundColor: 'transparent',
    },
    headerText: {
       fontSize: 8,
       color: theme.colors.accent,
       letterSpacing: 2,
       textTransform: 'uppercase',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 30,
      right: 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      paddingTop: 10,
    },
    footerText: {
      fontSize: 8,
      color: theme.colors.accent,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    h1: {
      fontSize: 28,
      fontWeight: 300, // Thinner for elegance
      color: theme.colors.primary,
      fontFamily: theme.fonts.heading,
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 16,
      fontWeight: 700,
      color: theme.colors.text,
      fontFamily: theme.fonts.heading,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    h3: {
      fontSize: 12,
      fontWeight: 600,
      color: theme.colors.primary,
      fontFamily: theme.fonts.heading,
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    body: {
      fontSize: 10,
      lineHeight: 1.6,
      color: '#444444',
      fontFamily: theme.fonts.body,
    },
    label: {
       fontSize: 8,
       color: theme.colors.accent,
       textTransform: 'uppercase',
       letterSpacing: 1.5,
       marginBottom: 4,
    },
    value: {
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: 500,
    },
    section: {
      marginHorizontal: 30,
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    col: {
      flexDirection: 'column',
    },
    // Generic Card Style for Property Specs / Features
    card: {
      padding: 12,
      backgroundColor: theme.shapes?.cardStyle === 'filled' ? theme.colors.secondary : 'transparent',
      borderRadius: theme.shapes?.borderRadius || 0,
      borderWidth: theme.shapes?.cardStyle === 'border' ? 1 : 0,
      borderColor: theme.colors.accent,
      marginBottom: 10,
    },
    // Helper for images
    roundedImage: {
      borderRadius: theme.shapes?.borderRadius || 0,
    },
    primaryBg: {
      backgroundColor: theme.colors.primary,
      color: '#ffffff',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 8,
        color: '#888888',
        fontFamily: theme.fonts.body,
    }
  });
};
