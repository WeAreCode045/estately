import { ID } from 'appwrite';
import type { ContractTemplate } from '../types';
import { COLLECTIONS, DATABASE_ID, databases } from './appwrite';

export const contractTemplatesService = {
  async list() {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TEMPLATES);
      return res.documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        content: doc.content,
        description: doc.description,
        needSignatureFromSeller: doc.needSignatureFromSeller || false,
        needSignatureFromBuyer: doc.needSignatureFromBuyer || false,
        autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee || false,
        autoAddToNewProjects: doc.autoAddToNewProjects || false,
        autoAssignTo: Array.isArray(doc.autoAssignTo) ? doc.autoAssignTo : (doc.autoAssignTo ? [doc.autoAssignTo] : []),
        allowChanges: doc.allowChanges || 'always',
        visibility: doc.visibility
      } as ContractTemplate));
    } catch (err) {
      console.error('Error listing contract templates', err);
      return [];
    }
  },

  async get(id: string) {
    try {
      const doc: any = await databases.getDocument(DATABASE_ID, COLLECTIONS.TEMPLATES, id);
      return {
        id: doc.$id,
        name: doc.name,
        content: doc.content,
        description: doc.description,
        needSignatureFromSeller: doc.needSignatureFromSeller || false,
        needSignatureFromBuyer: doc.needSignatureFromBuyer || false,
        autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee || false,
        autoAddToNewProjects: doc.autoAddToNewProjects || false,
        autoAssignTo: Array.isArray(doc.autoAssignTo) ? doc.autoAssignTo : (doc.autoAssignTo ? [doc.autoAssignTo] : []),
        allowChanges: doc.allowChanges || 'always',
        visibility: doc.visibility
      } as ContractTemplate;
    } catch (err) {
      console.error('Error getting contract template', err);
      return null;
    }
  },

  async create(data: Omit<ContractTemplate, 'id'>) {
    const payload: any = {
      name: data.name,
      content: data.content,
      needSignatureFromSeller: !!data.needSignatureFromSeller,
      needSignatureFromBuyer: !!data.needSignatureFromBuyer,
      autoCreateTaskForAssignee: !!data.autoCreateTaskForAssignee,
      autoAddToNewProjects: !!data.autoAddToNewProjects,
      allowChanges: data.allowChanges || 'always',
      visibility: data.visibility
    };

    if (data.description) payload.description = data.description;

    // Handle autoAssignTo - Appwrite collections often use strings for simple arrays if not configured as multiple
    if (data.autoAssignTo) {
      payload.autoAssignTo = data.autoAssignTo;
    }

    const res = await databases.createDocument(DATABASE_ID, COLLECTIONS.TEMPLATES, ID.unique(), payload);
    return { ...data, id: res.$id } as ContractTemplate;
  },

  async update(id: string, data: Partial<ContractTemplate>) {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.content !== undefined) payload.content = data.content;
    if (data.description !== undefined) payload.description = data.description;
    if (data.needSignatureFromSeller !== undefined) payload.needSignatureFromSeller = data.needSignatureFromSeller;
    if (data.needSignatureFromBuyer !== undefined) payload.needSignatureFromBuyer = data.needSignatureFromBuyer;
    if (data.autoCreateTaskForAssignee !== undefined) payload.autoCreateTaskForAssignee = data.autoCreateTaskForAssignee;
    if (data.autoAddToNewProjects !== undefined) payload.autoAddToNewProjects = data.autoAddToNewProjects;
    if (data.autoAssignTo !== undefined) payload.autoAssignTo = data.autoAssignTo;
    if (data.allowChanges !== undefined) payload.allowChanges = data.allowChanges;
    if (data.visibility !== undefined) payload.visibility = data.visibility;

    const res = await databases.updateDocument(DATABASE_ID, COLLECTIONS.TEMPLATES, id, payload);
    return { ...data, id: res.$id } as ContractTemplate;
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TEMPLATES, id);
  },

  async provisionTemplateToProjects(templateId: string, projectIds: string[]) {
    try {
      const template = await this.get(templateId);
      if (!template) throw new Error('Template not found');

      const [profiles, agencyRes, allProjects] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS)
      ]);

      const agency = agencyRes.documents[0];

      for (const projectId of projectIds) {
        const projectData = allProjects.documents.find(p => p.$id === projectId);
        if (!projectData) continue;

        const seller = profiles.documents.find(p => p.userId === projectData.sellerId);
        const buyer = profiles.documents.find(p => p.userId === projectData.buyerId);
        const agent = profiles.documents.find(p => p.userId === projectData.managerId);

        const replacements: Record<string, string> = {
          'buyer.name': buyer?.name || '',
          'buyer.first_name': buyer?.firstName || '',
          'buyer.last_name': buyer?.lastName || '',
          'buyer.birthday': buyer?.birthday || '',
          'buyer.address': buyer?.address || '',
          'buyer.placeofbirth': buyer?.birthPlace || '',
          'buyer.personal_identification_number': buyer?.idNumber || '',
          'buyer.vat': buyer?.vatNumber || '',
          'buyer.bank_account': buyer?.bankAccount || '',
          'buyer.phone': buyer?.phone || '',
          'buyer.mail': buyer?.email || '',

          'seller.name': seller?.name || '',
          'seller.first_name': seller?.firstName || '',
          'seller.last_name': seller?.lastName || '',
          'seller.birthday': seller?.birthday || '',
          'seller.address': seller?.address || '',
          'seller.placeofbirth': seller?.birthPlace || '',
          'seller.personal_identification_number': seller?.idNumber || '',
          'seller.vat': seller?.vatNumber || '',
          'seller.bank_account': seller?.bankAccount || '',
          'seller.phone': seller?.phone || '',
          'seller.mail': seller?.email || '',

          'agency.name': agency?.name || '',
          'agency.address': agency?.address || '',

          'agent.name': agent?.name || '',
          'agent.phone': agent?.phone || '',
          'agent.mail': agent?.email || '',

          'property.address': projectData.address || '',
          'property.price': projectData.price?.toLocaleString() || '0',

          'project.number': projectId.substring(0, 8).toUpperCase(),
          'project.handover_date': projectData.handover_date ? (() => {
            const d = new Date(projectData.handover_date);
            return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
          })() : 'TBD',
          'property.handover_date': projectData.handover_date ? (() => {
            const d = new Date(projectData.handover_date);
            return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
          })() : 'TBD',
          current_date: (() => {
            const d = new Date();
            return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
          })(),

        };

        // Perform replacements - Handles both [shortcode] and {{shortcode}} formats
        let finalizedContent = template.content;
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        Object.entries(replacements).forEach(([key, value]) => {
          const escapedKey = escapeRegExp(key);
          // Match [key] or {{key}} globally, case-insensitive
          const regex = new RegExp(`\\[${escapedKey}\\]|\\{\\{${escapedKey}\\}\\}`, 'gi');
          // Use a replacer function to avoid issue with '$' in value when using .replace()
          finalizedContent = finalizedContent.replace(regex, () => value);
        });

        // Add styled Agency branding to the content
        const brandedContent = `
          <div class="contract-wrapper" style="width: 100%; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;">
            <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
              <div style="flex: 1;">
                <h1 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">${agency?.name || 'ESTATELY AGENCY'}</h1>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">${agency?.address || ''}</p>
              </div>
              <div style="text-align: right; flex: 1;">
                <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Legal Document</p>
                <p style="margin: 2px 0 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #475569; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block;">REF: ${projectId.substring(0, 8).toUpperCase()}</p>
              </div>
            </header>

            <div class="contract-body-inner" style="color: #334155; font-size: 16px; line-height: 1.7;">
              ${finalizedContent}
            </div>

            <footer style="margin-top: 50px; padding-top: 25px; border-top: 1px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 4px;">Issued By</p>
                <p style="margin: 0;">${agency?.name || ''}</p>
                <p style="margin: 0;">${agency?.address || ''}</p>
              </div>
              <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 4px;">Agency Information</p>
                <p style="margin: 0;">VAT: ${agency?.vatCode || 'N/A'}</p>
                <p style="margin: 0;">Bank: ${agency?.bankAccount || 'N/A'}</p>
              </div>
            </footer>
          </div>
        `;

        // Prepare assignees based on settings
        const assignees: string[] = [];
        if (template.needSignatureFromSeller && projectData.sellerId) assignees.push(projectData.sellerId);
        if (template.needSignatureFromBuyer && projectData.buyerId) assignees.push(projectData.buyerId);

        // Create the contract instance
        await databases.createDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, ID.unique(), {
          projectId,
          title: template.name,
          content: brandedContent,
          status: 'PENDING_SIGNATURE',
          assignees,
          signedBy: [],
          createdAt: new Date().toISOString(),
          visibility: template.visibility
        });
      }
    } catch (err) {
      console.error('Error provisioning contract:', err);
      throw err;
    }
  },

  async autoProvisionContracts(projectId: string, projectData: any) {
    try {
      const templates = await this.list();
      const autoTemplates = templates.filter(t => t.autoAddToNewProjects);

      if (autoTemplates.length === 0) return;

      // Fetch all necessary data for replacements
      const [profiles, agencyRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES)
      ]);

      const seller = profiles.documents.find(p => p.userId === projectData.sellerId);
      const buyer = profiles.documents.find(p => p.userId === projectData.buyerId);
      const agent = profiles.documents.find(p => p.userId === projectData.managerId);
      const agency = agencyRes.documents[0];

      const replacements: Record<string, string> = {
        'buyer.name': buyer?.name || '',
        'buyer.first_name': buyer?.firstName || '',
        'buyer.last_name': buyer?.lastName || '',
        'buyer.birthday': buyer?.birthday || '',
        'buyer.address': buyer?.address || '',
        'buyer.placeofbirth': buyer?.birthPlace || '',
        'buyer.personal_identification_number': buyer?.idNumber || '',
        'buyer.vat': buyer?.vatNumber || '',
        'buyer.bank_account': buyer?.bankAccount || '',
        'buyer.phone': buyer?.phone || '',
        'buyer.mail': buyer?.email || '',

        'seller.name': seller?.name || '',
        'seller.first_name': seller?.firstName || '',
        'seller.last_name': seller?.lastName || '',
        'seller.birthday': seller?.birthday || '',
        'seller.address': seller?.address || '',
        'seller.placeofbirth': seller?.birthPlace || '',
        'seller.personal_identification_number': seller?.idNumber || '',
        'seller.vat': seller?.vatNumber || '',
        'seller.bank_account': seller?.bankAccount || '',
        'seller.phone': seller?.phone || '',
        'seller.mail': seller?.email || '',

        'agency.name': agency?.name || '',
        'agency.address': agency?.address || '',

        'agent.name': agent?.name || '',
        'agent.phone': agent?.phone || '',
        'agent.mail': agent?.email || '',

        'property.address': projectData.address || '',
        'property.price': projectData.price?.toLocaleString() || '0',

        'project.number': projectId.substring(0, 8).toUpperCase(),
        'project.handover_date': projectData.handover_date ? (() => {
          const d = new Date(projectData.handover_date);
          return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        })() : 'TBD',
        'property.handover_date': projectData.handover_date ? (() => {
          const d = new Date(projectData.handover_date);
          return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        })() : 'TBD',

        current_date: (() => {
          const d = new Date();
          return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        })()
      };

      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      for (const t of autoTemplates) {
        // Perform replacements - Handles both [shortcode] and {{shortcode}} formats
        let finalizedContent = t.content;
        Object.entries(replacements).forEach(([key, value]) => {
          const escapedKey = escapeRegExp(key);
          // Match [key] or {{key}} globally, case-insensitive
          const regex = new RegExp(`\\[${escapedKey}\\]|\\{\\{${escapedKey}\\}\\}`, 'gi');
          // Use a replacer function to avoid issue with '$' in value when using .replace()
          finalizedContent = finalizedContent.replace(regex, () => value);
        });

        // Add styled Agency branding to the content
        const brandedContent = `
          <div class="contract-wrapper" style="width: 100%; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;">
            <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
              <div style="flex: 1;">
                <h1 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">${agency?.name || 'ESTATELY AGENCY'}</h1>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500;">${agency?.address || ''}</p>
              </div>
              <div style="text-align: right; flex: 1;">
                <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Legal Document</p>
                <p style="margin: 2px 0 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #475569; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block;">REF: ${projectId.substring(0, 8).toUpperCase()}</p>
              </div>
            </header>

            <div class="contract-body-inner" style="color: #334155; font-size: 16px; line-height: 1.7;">
              ${finalizedContent}
            </div>

            <footer style="margin-top: 50px; padding-top: 25px; border-top: 1px dashed #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 4px;">Issued By</p>
                <p style="margin: 0;">${agency?.name || ''}</p>
                <p style="margin: 0;">${agency?.address || ''}</p>
              </div>
              <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; margin-bottom: 4px;">Agency Information</p>
                <p style="margin: 0;">VAT: ${agency?.vatCode || 'N/A'}</p>
                <p style="margin: 0;">Bank: ${agency?.bankAccount || 'N/A'}</p>
              </div>
            </footer>
          </div>
        `;

        // Prepare assignees based on settings
        const assignees: string[] = [];
        if (t.needSignatureFromSeller && projectData.sellerId) assignees.push(projectData.sellerId);
        if (t.needSignatureFromBuyer && projectData.buyerId) assignees.push(projectData.buyerId);

        // Create the contract instance
        await databases.createDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, ID.unique(), {
          projectId,
          title: t.name,
          content: brandedContent,
          status: 'PENDING_SIGNATURE',
          assignees,
          signedBy: [],
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error auto-provisioning contracts:', err);
    }
  }
};
