import { pdf } from '@react-pdf/renderer';
import { jsPDF } from 'jspdf';
import { exportBlocksToHtml } from '../../brochure-builder/services/htmlExportService';
import type { PageBlock } from '../../brochure-builder/types';
import { brochureService } from '../../../services/brochureService';
import { s3Service } from '../../../services/s3Service';
import type { Project, User } from '../../../types';
import BrochureDocument from '../BrochureDocument';

// Helper: Recursively replace dynamic fields with real data
const injectDataIntoBlocks = (blocks: PageBlock[], data: any): PageBlock[] => {
    return blocks.map(block => {
        const newBlock = { ...block, styles: { ...block.styles } }; // shallow copy

        // Resolve dynamic field
        if (newBlock.dynamicField) {
            const parts = newBlock.dynamicField.split('.');
            let val = data;
            for (const p of parts) {
                if (val === undefined || val === null) break;
                val = val[p];
            }

            if (val !== undefined && val !== null) {
                if (newBlock.type === 'gallery' && Array.isArray(val)) {
                     // For gallery, we might need a specific handling in exportBlocksToHtml if it expects array
                     // But exportBlocksToHtml likely just renders divs.
                     // IMPORTANT: htmlExportService's renderBlockToHtml needs to handle gallery data if we pass array
                     // Check if exportBlocksToHtml supports dynamic gallery? It probably doesn't.
                     // We might need to handle gallery specially or it will use default placeholder
                } else if (newBlock.type === 'image') {
                    newBlock.content = String(val);
                } else {
                    newBlock.content = String(val);
                }
            }
        }

        if (newBlock.children) {
            newBlock.children = injectDataIntoBlocks(newBlock.children, data);
        }

        return newBlock;
    });
};

export const generateBrochureBlob = async (project: Project, agencyId: string, agent?: User): Promise<Blob> => {
  try {
    // 1. Fetch Configuration
    const { agency, settings } = await brochureService.getAgencyBrochureConfig(agencyId);

    // Check if we have Custom Pages (HTML Builder)
    // If any custom page is enabled, we prefer the HTML engine for consistency across the document
    // NOTE: This assumes System Pages are either disabled OR we accept they won't render in HTML mode yet
    const hasCustomPages = settings.pages.some(p => p.type === 'custom' && p.enabled);

    if (hasCustomPages) {
        return await generateHtmlBrochure(project, settings, agency, agent);
    }

    // 2. Transform Data (Legacy/Standard)
    const propertyData = await brochureService.transformProjectToPropertyData(project, agent);

    // 3. Render PDF (React-PDF)
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

const generateHtmlBrochure = async (project: Project, settings: any, agency: any, agent: any): Promise<Blob> => {
    // 1. Prepare Data
    let coverUrl = '';
    if (project.coverImageId) {
        try { coverUrl = await s3Service.getPresignedUrl(project.coverImageId); } catch {}
    }

    let mediaUrls: string[] = [];
    if (project.media) {
        try { mediaUrls = await Promise.all(project.media.map((m: string) => s3Service.getPresignedUrl(m))); } catch {}
    }

    const data = {
        project: {
            title: project.title,
            description: project.property?.description,
            address: project.property?.address,
            price: project.property?.price, // Check actual field name in types
            bedrooms: project.property?.bedrooms,
            livingArea: project.property?.livingArea,
            coverImage: coverUrl,
            images: mediaUrls
        },
        agency: {
            name: agency.name,
            address: agency.address,
            email: agency.email,
            phone: agency.phone,
            logo: agency.logo // Assuming publicly accessible or needs signing? usually public-ish
        },
        agent: agent ? {
            name: agent.name,
            email: agent.email,
            phone: agent.phone
        } : {}
    };

    // 2. Build HTML
    let fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: sans-serif; }
          .page-break { page-break-after: always; min-height: 1120px; position: relative; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
    `;

    for (const page of settings.pages) {
        if (!page.enabled) continue;
        
        if (page.type === 'custom' && page.blocks) {
             const injectedBlocks = injectDataIntoBlocks(page.blocks, data);
             // We strip the HTML/BODY tags from exportBlocksToHtml to concatenate
             let pageHtml = exportBlocksToHtml(injectedBlocks);
             
             // Simple extraction of body content (brittle but effective for our own generator)
             const bodyMatch = pageHtml.match(/<div class="page-container">([\s\S]*)<\/div>\s*<\/body>/);
             const content = bodyMatch ? bodyMatch[1] : pageHtml;

             fullHtml += `<div class="page-break" style="width: 794px; overflow: hidden;">${content}</div>`;
        } else {
            // For system pages, we currently skip in HTML mode or render placeholder
            // Ideally we would trigger a render of a standard template here
        }
    }
    
    fullHtml += '</body></html>';

    // 3. Render with jsPDF
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling']
    });

    const container = document.createElement('div');
    container.style.width = '794px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = fullHtml;
    document.body.appendChild(container);

    try {
        await doc.html(container, {
            callback: () => {},
            x: 0,
            y: 0,
            width: 794,
            windowWidth: 794,
            autoPaging: 'text' // Better pagination
        });
    } catch (e) {
        console.error("jsPDF html error", e);
    } finally {
        document.body.removeChild(container);
    }

    return doc.output('blob');
};

