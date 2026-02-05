import React from 'react';
import { Document } from '@react-pdf/renderer';
import { BrochureSettings, Agency, PropertyData } from './types';
import { defaultTheme } from './themes';

import CoverPage from './pages/CoverPage';
import DescriptionPage from './pages/DescriptionPage';
import GalleryPage from './pages/GalleryPage';
import FeaturesPage from './pages/FeaturesPage';
import MapPage from './pages/MapPage';
import ContactPage from './pages/ContactPage';

interface BrochureDocumentProps {
  settings?: BrochureSettings;
  agency: Agency;
  property: PropertyData;
}

const BrochureDocument: React.FC<BrochureDocumentProps> = ({ settings, agency, property }) => {
  // Safety check for critical data
  if (!property || !agency) {
      console.error("BrochureDocument received null property or agency");
      return <Document><Page><Text>Error: Missing Data</Text></Page></Document>;
  }

  const theme = settings?.theme || defaultTheme;
  const pages = settings?.pages || [
      { type: 'cover', enabled: true },
      { type: 'description', enabled: true },
      { type: 'gallery', enabled: true },
      { type: 'features', enabled: true },
      { type: 'map', enabled: true },
      { type: 'contact', enabled: true },
  ];

  return (
    <Document title={`${property.title} - Brochure`} author={agency.name}>
      {pages.map((pageConfig, index) => {
        if (!pageConfig.enabled) return null;

        switch (pageConfig.type) {
          case 'cover':
            return <CoverPage key={index} theme={theme} property={property} agency={agency} />;
          case 'description':
            return <DescriptionPage key={index} theme={theme} property={property} agency={agency} />;
          case 'gallery':
            return <GalleryPage key={index} theme={theme} property={property} agency={agency} columns={pageConfig.columns} />;
          case 'features':
            return <FeaturesPage key={index} theme={theme} property={property} agency={agency} />;
          case 'map':
            return <MapPage key={index} theme={theme} property={property} agency={agency} />;
          case 'contact':
            return <ContactPage key={index} theme={theme} property={property} agency={agency} />;
          default:
            return null;
        }
      })}
    </Document>
  );
};

export default BrochureDocument;
