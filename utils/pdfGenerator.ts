import { jsPDF } from 'jspdf';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { Contract, User, Project, FormSubmission, FormDefinition, Agency, BrochureSettings } from '../types';
import { projectService, storage, BUCKETS, ID } from '../services/appwrite';
import BrochureDocument from '../components/pdf/BrochureDocument';
import { brochureService } from '../services/brochureService';

const saveBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

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
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let cursorY = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); 
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
  doc.text(`Address: ${project.property.address}`, margin, cursorY);
  cursorY += 5;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, cursorY);
  cursorY += 15;

  // Content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(contract.content, pageWidth - margin * 2);
  doc.text(splitText, margin, cursorY);
  
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

  doc.save(contract.title.replace(/\s+/g, '_') + "_" + contract.id + ".pdf");
};

export const downloadFormPDF = async (submission: FormSubmission, definition: FormDefinition, allUsers: User[], project: Project) => {
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
  doc.text(`Address: ${project.property.address}`, margin, cursorY);
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
  } catch (e) {}

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

  doc.save((submission.title || definition.title).replace(/\s+/g, '_') + "_" + submission.id.substring(0,8) + ".pdf");
};

export const generatePropertyBrochure = async (project: Project, agency: Agency | null, agent: User | null) => {
  try {
    // 1. Prepare Data
    // Ensure we have agency settings. If null, fetch default or mock.
    let fullAgency: Agency = agency || {
        id: 'default',
        name: 'EstateFlow Agency',
        address: '123 Real Estate Blvd',
        email: 'info@estateflow.com',
        phone: '+1 234 567 8900',
        website: 'www.estateflow.com',
        brochureSettings: undefined
    };

    if (!agency) {
        // Try to fetch default if passed null
        try {
            const config = await brochureService.getAgencyBrochureConfig('default');
            fullAgency = config.agency;
        } catch (e) {
            console.warn("Could not fetch default agency config, using fallback.");
        }
    }

    // Transform project to PropertyData expected by the PDF kit
    const propertyData = brochureService.transformProjectToPropertyData(project, agent || undefined);

    // 2. Generate PDF Blob
    const doc = React.createElement(BrochureDocument, {
        agency: fullAgency,
        property: propertyData,
        settings: fullAgency.brochureSettings
    });

    const blob = await pdf(doc).toBlob();

    // 3. Save/Download
    const fileName = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_Brochure.pdf`;
    saveBlob(blob, fileName);

    // 4. Background Upload
    const file = new File([blob], fileName, { type: 'application/pdf' });
    await storage.createFile(BUCKETS.PROPERTY_BROCHURES, ID.unique(), file);

  } catch (error) {
      console.error("PDF Generation Error Details:", error);
      throw error;
  }
};
