import { jsPDF } from 'jspdf';
import { projectService } from '../services/appwrite';
import { getPropertyParsed } from '../services/propertyService';
import { s3Service } from '../services/s3Service';
import type { Agency, Contract, FormDefinition, FormSubmission, Project, User } from '../types';

const getDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
  });
};

export const downloadContractPDF = async (contract: Contract, project: Project, allUsers: User[]) => {
  // Load property data from new schema if available
  let address = 'Address not available';
  if (project.property_id) {
    try {
      const propertyData = await getPropertyParsed(project.property_id);
      address = propertyData.formattedAddress;
    } catch (error) {
      console.error('Failed to load property data, using legacy:', error);
      address = project.property.address || 'Address not available';
    }
  } else {
    address = project.property.address || 'Address not available';
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let cursorY = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('EstateFlow Pro', margin, cursorY);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`ID: ${contract.id}`, pageWidth - margin - 40, cursorY);
  cursorY += 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(contract.title, margin, cursorY);
  cursorY += 10;

  // Project Info
  doc.setFontSize(10);
  doc.text(`Project: ${project.title}`, margin, cursorY);
  cursorY += 5;
  doc.text(`Address: ${address}`, margin, cursorY);
  cursorY += 5;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, cursorY);
  cursorY += 15;

  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(contract.content, pageWidth - margin * 2);
  doc.text(splitText, margin, cursorY);

  // Calculate new cursor position based on text height
  cursorY += (splitText.length * 5) + 20;

  // Signatures Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Signatures & Execution', margin, cursorY);
  cursorY += 15;

  const colWidth = (pageWidth - margin * 2) / 2;

  contract.assignees.forEach((uid, index) => {
    const user = allUsers.find(u => u.id === uid);
    const sigData = contract.signatureData?.[uid];

    const xPos = margin + (index % 2) * colWidth;
    const yPosStart = cursorY + Math.floor(index / 2) * 60;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(user?.name || 'Unknown', xPos, yPosStart + 45);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.role || '', xPos, yPosStart + 50);

    // Placeholder or Actual Signature
    doc.setDrawColor(200);
    doc.line(xPos, yPosStart + 40, xPos + colWidth - 10, yPosStart + 40);

    if (sigData) {
      try {
        doc.addImage(sigData, 'PNG', xPos + 5, yPosStart + 10, 40, 25);
      } catch (e) {
        doc.text('[Digital Signature Image]', xPos + 5, yPosStart + 25);
      }
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('AWAITING SIGNATURE', xPos + 5, yPosStart + 25);
      doc.setTextColor(0);
    }
  });

  // Verification Note
  const finalY = cursorY + (Math.ceil(contract.assignees.length / 2) * 60) + 10;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const note = `VERIFICATION NOTE: This document was digitally executed and recorded on the EstateFlow Pro platform on ${new Date().toLocaleString()}. All signatures are verified via user-authenticated accounts and digital drawing adoption.`;
  const splitNote = doc.splitTextToSize(note, pageWidth - margin * 2);
  doc.text(splitNote, margin, finalY);

  // Download
  doc.save(contract.title.replace(/\s+/g, '_') + "_" + contract.id + ".pdf");
};

export const downloadFormPDF = async (submission: FormSubmission, definition: FormDefinition, allUsers: User[], project: Project) => {
  // Load property data from new schema if available
  let address = 'Address not available';
  if (project.property_id) {
    try {
      const propertyData = await getPropertyParsed(project.property_id);
      address = propertyData.formattedAddress;
    } catch (error) {
      console.error('Failed to load property data, using legacy:', error);
      address = project.property.address || 'Address not available';
    }
  } else {
    address = project.property.address || 'Address not available';
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let cursorY = 20;

  const checkPageBreak = (needed: number) => {
    if (cursorY + needed > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('EstateFlow Pro', margin, cursorY);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`FORM ID: ${submission.id}`, pageWidth - margin - 50, cursorY);
  cursorY += 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(submission.title || definition.title, margin, cursorY);
  cursorY += 10;

  // Project Info
  doc.setFontSize(10);
  doc.text(`Project: ${project.title}`, margin, cursorY);
  cursorY += 5;
  doc.text(`Address: ${address}`, margin, cursorY);
  cursorY += 5;
  doc.text(`Submission Date: ${new Date(submission.createdAt).toLocaleDateString()}`, margin, cursorY);
  cursorY += 15;

  // Form Data
  const fields = definition.schema?.fields || [];

  const renderFields = (fieldsList: any[]) => {
    fieldsList.forEach(field => {
      const fieldName = field.name || field.id;
      const value = (submission.data as any)[fieldName];

      if (field.type === 'header') {
        checkPageBreak(15);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(field.label, margin, cursorY);
        cursorY += 10;
        doc.line(margin, cursorY - 2, pageWidth - margin, cursorY - 2);
        cursorY += 5;
      } else if (field.type === 'section') {
        if (field.label) {
          checkPageBreak(12);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(field.label, margin, cursorY);
          cursorY += 8;
        }
        if (field.fields) renderFields(field.fields);
      } else {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(field.label + ":", margin, cursorY);

        doc.setFont('helvetica', 'normal');
        let displayValue = '';
        if (value === true) displayValue = 'Yes';
        else if (value === false) displayValue = 'No';
        else if (value === undefined || value === null) displayValue = '-';
        else if (Array.isArray(value)) displayValue = value.join(', ');
        else displayValue = String(value);

        const splitValue = doc.splitTextToSize(displayValue, pageWidth - margin * 2 - 60);
        doc.text(splitValue, margin + 55, cursorY);
        cursorY += (splitValue.length * 5) + 3;
      }
    });
  };

  renderFields(fields);

  // Signatures Section
  cursorY += 10;
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Digital Signatures & Approvals', margin, cursorY);
  cursorY += 15;

  let meta: any = {};
  try {
    if (typeof submission.meta === 'object' && submission.meta !== null) {
      meta = submission.meta;
    } else if (typeof submission.meta === 'string' && (submission.meta as string).trim()) {
      meta = JSON.parse(submission.meta as string);
    }
  } catch (e) { globalThis.console?.error(e); }

  const signatures: Record<string, string> = meta.signatures || {};
  const signatureMeta: any = meta.signatureMeta || {};

  const colWidth = (pageWidth - margin * 2) / 2;

  const activeSignatures = Object.entries(signatures);
  if (activeSignatures.length === 0) {
     doc.setFontSize(10);
     doc.setFont('helvetica', 'italic');
     doc.setTextColor(150);
     doc.text('No digital signatures provided for this submission.', margin, cursorY);
     doc.setTextColor(0);
  } else {
    activeSignatures.forEach(([role, dataUrl], index) => {
      const signerId = role === 'seller' ? project.sellerId : project.buyerId;
      const signer = allUsers.find(u => u.userId === signerId || u.id === signerId);
      const sigTime = signatureMeta[role]?.timestamp || submission.updatedAt || submission.createdAt;

      const xPos = margin + (index % 2) * colWidth;
      const yPosStart = cursorY;

      checkPageBreak(65);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(signer?.name || role.toUpperCase(), xPos, yPosStart + 45);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(role.toUpperCase() + " SIGNATURE", xPos, yPosStart + 50);
      doc.text("Date: " + new Date(sigTime).toLocaleString(), xPos, yPosStart + 54);
      doc.setTextColor(0);

      // Signature line and image
      doc.setDrawColor(200);
      doc.line(xPos, yPosStart + 40, xPos + colWidth - 10, yPosStart + 40);

      try {
        doc.addImage(dataUrl, 'PNG', xPos + 5, yPosStart + 10, 40, 25);
      } catch (e) {
        doc.text('[Digital Signature Adopted]', xPos + 5, yPosStart + 25);
      }

      if (index % 2 === 1) cursorY += 65;
      else if (index === activeSignatures.length - 1) cursorY += 65;
    });
  }

  // Verification Note
  checkPageBreak(30);
  doc.setFontSize(8);
  doc.setTextColor(150);
  const note = `VERIFICATION: This form was digitally completed and signed on the EstateFlow Pro platform. All actions are logged and associated with verified user accounts. Document ID: ${submission.id}. Generated on ${new Date().toLocaleString()}.`;
  const splitNote = doc.splitTextToSize(note, pageWidth - margin * 2);
  doc.text(splitNote, margin, cursorY + 10);

  // Download
  doc.save((submission.title || definition.title).replace(/\s+/g, '_') + "_" + submission.id.substring(0,8) + ".pdf");
};

export const generatePropertyBrochure = async (project: Project, agency: Agency | null, agent: User | null) => {
  // Load property data from new schema if available
  let address = 'Address not available';
  let price = 0;
  let description = '';
  let bedrooms = 0;
  let bathrooms = 0;
  let sqft = 0;
  let buildYear: number | null = null;
  let propertyImages: string[] = [];

  if (project.property_id) {
    try {
      const propertyData = await getPropertyParsed(project.property_id);
      address = propertyData.formattedAddress;
      price = project.price || 0; // Price is at project level
      // Extract property description (filter type 'propertydesc')
      const propDesc = propertyData.descriptions.find(d => d.type === 'propertydesc');
      description = propDesc?.content || '';
      bedrooms = propertyData.roomsData.bedrooms || 0;
      bathrooms = propertyData.roomsData.bathrooms || 0;
      sqft = propertyData.sizeData.floorSize || propertyData.sizeData.lotSize || 0;
      buildYear = propertyData.specsData.find(s => s.match(/\d{4}/))?.match(/\d{4}/)?.[0] ? parseInt(propertyData.specsData.find(s => s.match(/\d{4}/))!.match(/\d{4}/)![0]) : null;
      propertyImages = propertyData.mediaData.images || [];
    } catch (error) {
      console.error('Failed to load property data, using legacy:', error);
      address = project.property.address || 'Address not available';
      price = project.property.price || 0;
      description = project.property.description || '';
      bedrooms = project.property.bedrooms || 0;
      bathrooms = project.property.bathrooms || 0;
      sqft = project.property.sqft || 0;
      buildYear = project.property.buildYear || null;
      propertyImages = project.property.images || [];
    }
  } else {
    // Legacy fallback
    address = project.property.address || 'Address not available';
    price = project.property.price || 0;
    description = project.property.description || '';
    bedrooms = project.property.bedrooms || 0;
    bathrooms = project.property.bathrooms || 0;
    sqft = project.property.sqft || 0;
    buildYear = project.property.buildYear || null;
    propertyImages = project.property.images || [];
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Defaults
  let primaryColor = '#2563eb';
  let headerText = '';
  let footerText = '';
  let showAgent = true;
  let showLogo = true;

  if (agency?.brochureSettings) {
      try {
          const settings = JSON.parse(agency.brochureSettings);
          primaryColor = settings.primaryColor || primaryColor;
          headerText = settings.headerText || '';
          footerText = settings.footerText || '';
          showAgent = settings.showAgentInfo ?? true;
          showLogo = settings.showAgencyLogo ?? true;
      } catch (e) { globalThis.console?.error(e); }
  }

  // --- COVER PAGE ---

  // Background Header
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  if (headerText) {
      doc.text(headerText.toUpperCase(), pageWidth / 2, 40, { align: 'center' });
  } else {
      doc.text("PROPERTY BROCHURE", pageWidth / 2, 40, { align: 'center' });
  }

  // Cover Image
    if (project.coverImageId) {
      try {
        const coverId = project.coverImageId;
        const coverUrl = coverId && coverId.startsWith('http') ? coverId : (coverId ? projectService.getImagePreview(coverId) : '');
        const dataUrl = await getDataUrl(coverUrl);
        // Calculate aspect ratio or fit
        doc.addImage(dataUrl, 'JPEG', margin, 70, pageWidth - (margin*2), 120, undefined, 'FAST');
      } catch (e) {
        console.error("Failed to load cover", e);
      }
    }

  // Title & Price
  doc.setTextColor(0);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(project.title, pageWidth / 2, 210, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(address, pageWidth / 2, 220, { align: 'center' });

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text(`€${price.toLocaleString()}`, pageWidth / 2, 240, { align: 'center' });

  // Specs
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.setFont('helvetica', 'normal');
  const specs = [
      `${bedrooms} Beds`,
      `${bathrooms} Baths`,
      `${sqft} SqFt`,
      buildYear ? `Built ${buildYear}` : ''
  ].filter(Boolean).join('  |  ');
  doc.text(specs, pageWidth / 2, 255, { align: 'center' });


  // --- PAGE 2: DESCRIPTION ---
  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("About this property", margin, 30);

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.setFont('helvetica', 'normal');
  // Clean text a bit
  const cleanDesc = description.replace(/<[^>]*>?/gm, '');
  const descText = doc.splitTextToSize(cleanDesc || "No description available.", pageWidth - (margin * 2));
  doc.text(descText, margin, 45);

  let cursorY = 45 + (descText.length * 6) + 20;

  // Gallery
  const media = project.media && project.media.length > 0 ? project.media : propertyImages;
  if (media.length > 0) {
       doc.setFontSize(18);
       doc.setTextColor(0);
       doc.text("Gallery", margin, cursorY);
       cursorY += 15;

       const imgW = (pageWidth - (margin * 2) - 10) / 2;
       const imgH = 60;

       let xOffset = margin;

       const galleryImages = media.slice(0, 4);
         for (let i = 0; i < galleryImages.length; i++) {
           try {
               const imgId = galleryImages[i];
             if (!imgId) continue;
             const url = imgId.startsWith('http') ? imgId : await projectService.getImagePreview(imgId);
             const data = await getDataUrl(url);

               doc.addImage(data, 'JPEG', xOffset, cursorY, imgW, imgH, undefined, 'FAST');

               if (i % 2 === 0) {
                   xOffset += imgW + 10;
               } else {
                   xOffset = margin;
                   cursorY += imgH + 10;
                   if (cursorY > pageHeight - 50) {
                       doc.addPage();
                       cursorY = 20;
                   }
               }
           } catch (e) {
             // Continue
           }
       }
  }


  // --- FOOTER / CONTACT ---
  const footerHeight = 70;
  if (cursorY > pageHeight - footerHeight) {
      doc.addPage();
      cursorY = 20;
  }

  const footerY = pageHeight - footerHeight;

  if (showAgent && agent) {
      doc.setDrawColor(200);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Presented By", margin, footerY + 15);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(agent.name, margin, footerY + 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(agent.email, margin, footerY + 30);
      if (agent.phone) doc.text(agent.phone, margin, footerY + 35);
  }

  if (showLogo && agency && agency.logo) {
       try {
           let logoUrl = agency.logo;
             if (!logoUrl.startsWith('http')) {
               logoUrl = await s3Service.getPresignedUrl(logoUrl);
             }
             const logodata = await getDataUrl(logoUrl);
           const logoW = 30;
           const logoH = 30;
           doc.addImage(logodata, 'PNG', pageWidth - margin - logoW, footerY + 10, logoW, logoH, undefined, 'FAST');
      } catch (e) { globalThis.console?.error(e); }
  }

  if (agency) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const textX = pageWidth - margin;
      const align = 'right';

      doc.text(agency.name, textX, footerY + 50, { align });
      doc.text(agency.address, textX, footerY + 55, { align });
  }

  if (footerText) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(footerText, pageWidth/2, pageHeight - 10, { align: 'center'});
  }

  const fileName = `${project.title.replace(/\s+/g, '_')}_Brochure.pdf`;
  doc.save(fileName);

  try {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    // Upload brochure in project property-files folder
    await s3Service.uploadProjectFile(project.id, 'property-files', file);
  } catch (error) {
    console.error('Error uploading brochure to storage:', error);
  }
};
