import type { ContractTemplate } from '../types';
import { parseJsonField } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, ID } from './appwrite';

/**
 * Contract Template Data Interface
 */
export interface CreateContractTemplateData {
  title: string;
  content: string; // HTML or Markdown with {{placeholders}}
  category?: 'residential' | 'commercial' | 'rental';
  required_roles?: string[]; // Array of role strings
  schema?: Record<string, any>; // Validation schema for placeholders
  created_by?: string; // Profile ID
}

/**
 * Parsed Contract Template
 */
export interface ParsedContractTemplate {
  template: ContractTemplate;
  requiredRoles: string[];
  schemaData: Record<string, any> | null;
  placeholders: string[]; // Extracted {{placeholder}} names
}

/**
 * Extract placeholders from template content
 */
export const extractPlaceholders = (content: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const placeholder = match[1].trim();
    if (!matches.includes(placeholder)) {
      matches.push(placeholder);
    }
  }

  return matches;
};

/**
 * Replace placeholders in template content
 */
export const replacePlaceholders = (
  content: string,
  data: Record<string, any>
): string => {
  let result = content;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }

  return result;
};

/**
 * Create a new contract template
 */
export const createContractTemplate = async (
  data: CreateContractTemplateData
): Promise<ContractTemplate> => {
  const payload = {
    title: data.title,
    content: data.content,
    category: data.category,
    required_roles: JSON.stringify(data.required_roles || ['buyer', 'seller']),
    schema: data.schema ? JSON.stringify(data.schema) : '{}',
    created_by: data.created_by || ''
  };

  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    ID.unique(),
    payload
  );

  return result as ContractTemplate;
};

/**
 * Get contract template by ID
 */
export const getContractTemplate = async (id: string): Promise<ContractTemplate> => {
  const doc = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    id
  );
  return doc as ContractTemplate;
};

/**
 * Get contract template with parsed data
 */
export const getContractTemplateParsed = async (
  id: string
): Promise<ParsedContractTemplate> => {
  const template = await getContractTemplate(id);

  const requiredRoles = parseJsonField<string[]>(template.required_roles, ['buyer', 'seller']);
  const schemaData = template.schema
    ? parseJsonField<Record<string, any>>(template.schema, null)
    : null;
  const placeholders = extractPlaceholders(template.content);

  return {
    template,
    requiredRoles,
    schemaData,
    placeholders
  };
};

/**
 * Update contract template
 */
export const updateContractTemplate = async (
  id: string,
  data: Partial<CreateContractTemplateData>
): Promise<ContractTemplate> => {
  const payload: any = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.content !== undefined) payload.content = data.content;
  if (data.category !== undefined) payload.category = data.category;
  if (data.required_roles !== undefined) {
    payload.required_roles = JSON.stringify(data.required_roles);
  }
  if (data.schema !== undefined) {
    payload.schema = JSON.stringify(data.schema);
  }
  if (data.created_by !== undefined) payload.created_by = data.created_by;

  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    id,
    payload
  );

  return result as ContractTemplate;
};

/**
 * Delete contract template
 */
export const deleteContractTemplate = async (id: string): Promise<void> => {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    id
  );
};

/**
 * List contract templates
 */
export const listContractTemplates = async (queries: string[] = []) => {
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    queries
  );
  return result;
};

/**
 * List templates by category
 */
export const listContractTemplatesByCategory = async (
  category: 'residential' | 'commercial' | 'rental'
) => {
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CONTRACT_TEMPLATES,
    [`category=${category}`]
  );
  return result;
};

/**
 * Generate contract from template
 */
export const generateContractFromTemplate = async (
  templateId: string,
  data: Record<string, any>
): Promise<string> => {
  const parsed = await getContractTemplateParsed(templateId);

  // Validate required placeholders exist in data
  const missingPlaceholders = parsed.placeholders.filter(p => !(p in data));
  if (missingPlaceholders.length > 0) {
    console.warn('Missing placeholders:', missingPlaceholders);
  }

  return replacePlaceholders(parsed.template.content, data);
};
