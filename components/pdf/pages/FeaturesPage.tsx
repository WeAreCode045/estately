import React from 'react';
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ThemeConfig, PropertyData, Agency } from '../types';
import { createStyles } from '../themes';
import DocumentFooter from '../components/DocumentFooter';

interface FeaturesPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
}

const FeaturesPage: React.FC<FeaturesPageProps> = ({ theme, property, agency }) => {
  const styles = createStyles(theme);

  // Custom grid style for 3 columns
  const gridStyle = StyleSheet.create({
      container: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 20,
      },
      item: {
          width: '33.33%',
          padding: 10,
          marginBottom: 15,
      },
      label: {
          fontSize: 8,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 5,
          fontFamily: theme.fonts.heading,
      },
      value: {
          fontSize: 10,
          color: '#1a1a1a',
          fontWeight: 700,
      }
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
         <Text style={styles.headerText}>Specifications</Text>
      </View>

      <View style={{ ...styles.section, flex: 1 }}>
        <Text style={styles.h1}>Features & Amenities</Text>
        
        <View style={gridStyle.container}>
            {/* Core Specs First */}
            <View style={gridStyle.item}>
                <Text style={gridStyle.label}>Build Year</Text>
                <Text style={gridStyle.value}>{property.specs.buildYear || 'N/A'}</Text>
            </View>
            <View style={gridStyle.item}>
                <Text style={gridStyle.label}>Bedrooms</Text>
                <Text style={gridStyle.value}>{property.specs.beds}</Text>
            </View>
            <View style={gridStyle.item}>
                <Text style={gridStyle.label}>Bathrooms</Text>
                <Text style={gridStyle.value}>{property.specs.baths}</Text>
            </View>
            <View style={gridStyle.item}>
                <Text style={gridStyle.label}>Living Area</Text>
                <Text style={gridStyle.value}>{property.specs.sqft} sq ft</Text>
            </View>
            <View style={gridStyle.item}>
                <Text style={gridStyle.label}>Lot Size</Text>
                <Text style={gridStyle.value}>{property.specs.lotSize ? `${property.specs.lotSize} sq ft` : 'N/A'}</Text>
            </View>

            {/* Dynamic Features */}
            {property.features.length > 0 ? (
                property.features.map((feature, idx) => (
                    <View key={idx} style={gridStyle.item}>
                        <Text style={gridStyle.label}>{feature.label}</Text>
                        <Text style={gridStyle.value}>{String(feature.value)}</Text>
                    </View>
                ))
            ) : null}
        </View>
      </View>

      <DocumentFooter theme={theme} agencyName={agency.name} />
    </Page>
  );
};

export default FeaturesPage;
