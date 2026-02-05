import { Image, Page, Text, View } from '@react-pdf/renderer';
import React from 'react';
import DocumentFooter from '../components/DocumentFooter';
import { createStyles } from '../themes';
import type { Agency, PropertyData, ThemeConfig } from '../types';

interface MapPageProps {
  theme: ThemeConfig;
  property: PropertyData;
  agency: Agency;
}

const MapPage: React.FC<MapPageProps> = ({ theme, property, agency }) => {
  const styles = createStyles(theme);

  // Silver Map Style
  // https://developers.google.com/maps/documentation/maps-static/styling
  const silverStyle = '&style=feature:all|element:all|saturation:-100|lightness:10';

  // Note: Env variable access in client-side bundling
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

  const mapUrl = property.coordinates ?
    `https://maps.googleapis.com/maps/api/staticmap?center=${property.coordinates.lat},${property.coordinates.lng}&zoom=15&size=800x600&markers=color:0x1a1a1a%7C${property.coordinates.lat},${property.coordinates.lng}&key=${apiKey}${silverStyle}`
    : null;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
         <Text style={styles.headerText}>Location</Text>
      </View>

      <View style={{ ...styles.section, flex: 1 }}>
        <Text style={styles.h1}>Location & Environment</Text>
        <Text style={styles.body}>{property.address}</Text>

        <View style={{ marginTop: 20, height: 400, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
            {mapUrl ? (
                <Image src={mapUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <Text style={{ fontSize: 10, color: '#888' }}>Map Preview Unavailable</Text>
            )}
        </View>
      </View>

      <DocumentFooter theme={theme} agencyName={agency.name} />
    </Page>
  );
};

export default MapPage;
