import React from 'react';
import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { ThemeConfig, PropertyData, Agency } from '../types';
import { createStyles } from '../themes';
import DocumentFooter from '../components/DocumentFooter';

interface GalleryPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
  columns?: number;
}

const GalleryPage: React.FC<GalleryPageProps> = ({ theme, property, agency }) => {
  const styles = createStyles(theme);
  
  // Limiting to 5 images for the specific layout pattern: Big, Small, Small, Big, Small (Wait, 5 fits well)
  // Layout: 
  // 1. Hero (100%)
  // 2. Split (50/50)
  // 3. Hero (100%)
  const images = property.images.slice(0, 5); 

  const getStyleForIndex = (index: number) => {
      // 0 -> Full width
      // 1, 2 -> 50% width
      // 3 -> 60% width
      // 4 -> 40% width
      
      const BaseStyle = {
          height: 200,
          objectFit: 'cover' as const,
          marginBottom: 10,
          backgroundColor: '#f0f0f0'
      };

      if (index === 0) return { ...BaseStyle, width: '100%', height: 250 };
      if (index === 1 || index === 2) return { ...BaseStyle, width: '48%', marginRight: index === 1 ? '4%' : 0 };
      if (index === 3) return { ...BaseStyle, width: '63%', marginRight: '2%' }; // Asymmetric
      if (index === 4) return { ...BaseStyle, width: '35%' };
      
      return { ...BaseStyle, width: '100%' };
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
         <Text style={styles.headerText}>Visuals</Text>
      </View>

      <View style={{ ...styles.section, flex: 1 }}>
        <Text style={styles.h1}>Gallery</Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {images.map((img, idx) => (
             <Image 
                key={idx}
                src={img} 
                style={getStyleForIndex(idx)} 
             />
          ))}
        </View>
      </View>

      <DocumentFooter theme={theme} agencyName={agency.name} />
    </Page>
  );
};

export default GalleryPage;
