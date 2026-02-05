import { pdf } from '@react-pdf/renderer';
import React from 'react';
import BrochureDocument from '../BrochureDocument';
import { brochureService } from '../../../services/brochureService';
import { Project, User } from '../../../types';

export const generateBrochureBlob = async (project: Project, agencyId: string, agent?: User): Promise<Blob> => {
  try {
    // 1. Fetch Configuration
    const { agency, settings } = await brochureService.getAgencyBrochureConfig(agencyId);
    
    // 2. Transform Data
    const propertyData = brochureService.transformProjectToPropertyData(project, agent);

    // 3. Render PDF
    console.log("Generating with PropertyData:", propertyData);
    
    // Use React.createElement to avoid any JSX transformation issues in this specific utility file
    const doc = React.createElement(BrochureDocument, {
        settings: settings,
        agency: agency,
        property: propertyData
    });

    const blob = await pdf(doc).toBlob();

    return blob;

  } catch (error) {
    console.error("PDF Generation Failed", error);
    throw error;
  }
};
