import { pdf } from '@react-pdf/renderer';
import { brochureService } from '../../../services/brochureService';
import type { Project, User } from '../../../types';
import BrochureDocument from '../BrochureDocument';

export const generateBrochureBlob = async (project: Project, agencyId: string, agent?: User): Promise<Blob> => {
  try {
    // 1. Fetch Configuration
    const { agency, settings } = await brochureService.getAgencyBrochureConfig(agencyId);

    // 2. Transform Data
    const propertyData = brochureService.transformProjectToPropertyData(project, agent);

    // 3. Render PDF
    // We use the pdf() function from @react-pdf/renderer to generate the blob programmatically
    const blob = await pdf(
        <BrochureDocument
            settings={settings}
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
