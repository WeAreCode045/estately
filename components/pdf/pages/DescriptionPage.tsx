import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { ThemeConfig, PropertyData, Agency } from '../types';
import { createStyles } from '../themes';
import DocumentFooter from '../components/DocumentFooter';

interface DescriptionPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
}

const DescriptionPage: React.FC<DescriptionPageProps> = ({ theme, property, agency }) => {
  const styles = createStyles(theme);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Overview</Text>
      </View>

      <View style={{ ...styles.section, marginTop: 20 }}>
        <Text style={styles.h1}>About this residence</Text>
        <Text style={[styles.body, { marginTop: 20, fontSize: 11, lineHeight: 1.8 }]}>
          {property.description}
        </Text>
      </View>

      {/* Quick Specs Summary */}
      <View style={{ ...styles.section, marginTop: 40, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 20 }}>
          <Text style={styles.h2}>At a Glance</Text>
          <View style={{ ...styles.row, marginTop: 20 }}>
             <View style={{ width: '33%', marginBottom: 20 }}>
                 <Text style={styles.label}>Built Year</Text>
                 <Text style={styles.value}>{property.specs.buildYear || 'N/A'}</Text>
             </View>
             <View style={{ width: '33%', marginBottom: 20 }}>
                 <Text style={styles.label}>Lot Size</Text>
                 <Text style={styles.value}>{property.specs.lotSize ? `${property.specs.lotSize} sq ft` : 'N/A'}</Text>
             </View>
             <View style={{ width: '33%', marginBottom: 20 }}>
                 <Text style={styles.label}>Internal Area</Text>
                 <Text style={styles.value}>{property.specs.sqft} sq ft</Text>
             </View>
             <View style={{ width: '33%', marginBottom: 20 }}>
                 <Text style={styles.label}>Bedrooms</Text>
                 <Text style={styles.value}>{property.specs.beds}</Text>
             </View>
             <View style={{ width: '33%', marginBottom: 20 }}>
                 <Text style={styles.label}>Bathrooms</Text>
                 <Text style={styles.value}>{property.specs.baths}</Text>
             </View>
          </View>
      </View>

      <DocumentFooter theme={theme} agencyName={agency.name} />
    </Page>
  );
};

export default DescriptionPage;
