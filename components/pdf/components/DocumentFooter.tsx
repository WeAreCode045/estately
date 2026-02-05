import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ThemeConfig } from '../types';
import { createStyles } from '../themes';

interface DocumentFooterProps {
  theme: ThemeConfig;
  agencyName: string;
  pageNumber?: boolean;
}

const DocumentFooter: React.FC<DocumentFooterProps> = ({ theme, agencyName, pageNumber = true }) => {
  const styles = createStyles(theme);

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{agencyName} - Property Brochure</Text>
      {pageNumber && (
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} />
      )}
    </View>
  );
};

export default DocumentFooter;
