import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';
import type { Agency, PropertyData, ThemeConfig } from '../types';

interface CoverPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
}

const CoverPage: React.FC<CoverPageProps> = ({ theme, property, agency }) => {
  // theme available via prop; styles helper not used here

  const coverStyles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    bgImage: {
      position: 'absolute',
      minWidth: '100%',
      minHeight: '100%',
      height: '100%',
      width: '100%',
      objectFit: 'cover',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', // Standard Overlay
        padding: 50,
        flexDirection: 'column',
    },
    title: {
      fontSize: 42,
      fontWeight: 300,
      color: '#ffffff',
      marginBottom: 10,
      fontFamily: theme.fonts.heading,
      letterSpacing: -1,
    },
    address: {
      fontSize: 14,
      color: '#e0e0e0',
      marginBottom: 30,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    price: {
        fontSize: 24,
        color: '#ffffff',
        fontWeight: 700,
    },
    logoContainer: {
        position: 'absolute',
        top: 40,
        right: 40,
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 0, // Sharp square
    },
    logo: {
        width: 100,
        height: 60,
        objectFit: 'contain'
    }
  });

  return (
    <Page size="A4" style={{ padding: 0 }}>
      <View style={coverStyles.container}>
         {property.coverImage ? (
             <Image src={property.coverImage} style={coverStyles.bgImage} />
         ) : null}

         {agency.logo && (
             <View style={coverStyles.logoContainer}>
                <Image src={agency.logo} style={coverStyles.logo} />
             </View>
         )}

         <View style={coverStyles.overlay}>
            <Text style={coverStyles.title}>{property.title}</Text>
            <Text style={coverStyles.address}>{property.address}</Text>
            <Text style={coverStyles.price}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: property.currency || 'USD' }).format(property.price)}
            </Text>
         </View>
      </View>
    </Page>
  );
};

export default CoverPage;
