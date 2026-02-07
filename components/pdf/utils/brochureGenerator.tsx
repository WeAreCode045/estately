import { pdf } from '@react-pdf/renderer';
import { brochureService } from '../../../services/brochureService';
import type { Project, User } from '../../../types';
import BrochureDocument from '../BrochureDocument';

export const generateBrochureBlob = async (project: Project, agencyId: string, agent?: User): Promise<Blob> => {
  try {
    // 1. Fetch Configuration
    const { agency, settings, pages } = await brochureService.getAgencyBrochureConfig(agencyId);

    // 2. Transform Data
    const propertyData = await brochureService.transformProjectToPropertyData(project, agent);

    // 3. Render PDF using React-PDF with fixed layout
    const tempSettings = { ...settings, pages };
    const blob = await pdf(
        <BrochureDocument
            settings={tempSettings}
            agency={agency}
            property={propertyData}
        />
    ).toBlob();

    return blob;

  } catch (error) {
    console.error("PDF Generation Failed", error);
    throw error;
  }
};

