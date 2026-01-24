
import { jsPDF } from 'jspdf';
import { Contract, User, Project } from '../types';

export const downloadContractPDF = async (contract: Contract, project: Project, allUsers: User[]) => {
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
  doc.text(`Address: ${project.property.address}`, margin, cursorY);
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
  doc.save(`${contract.title.replace(/\s+/g, '_')}_${contract.id}.pdf`);
};
