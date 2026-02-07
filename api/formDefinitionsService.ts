import { databases, DATABASE_ID, COLLECTIONS, Query } from './appwrite';
import { ID } from 'appwrite';
import type { FormDefinition } from '../types';

export const formDefinitionsService = {
  async list() {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS);
      return res.documents.map((doc: any) => {
        let schema = {};
        try {
          schema = doc.schema ? (typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema) : {};
        } catch (e) {
          console.warn(`Failed to parse schema for ${doc.key}`, e);
        }

        let defaultData = {};
        try {
          defaultData = doc.defaultData ? (typeof doc.defaultData === 'string' ? JSON.parse(doc.defaultData) : doc.defaultData) : {};
        } catch (e) {
          console.warn(`Failed to parse defaultData for ${doc.key}`, e);
        }

        return {
          id: doc.$id,
          key: doc.key,
          title: doc.title,
          description: doc.description,
          schema,
          defaultData,
          role: doc.role,
          needSignatureFromSeller: doc.needSignatureFromSeller || false,
          needSignatureFromBuyer: doc.needSignatureFromBuyer || false,
          autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee || false,
          autoAddToNewProjects: doc.autoAddToNewProjects || false,
          autoAssignTo: Array.isArray(doc.autoAssignTo) ? doc.autoAssignTo : (doc.autoAssignTo ? [doc.autoAssignTo] : []),
          allowChanges: doc.allowChanges || 'always',
          visibility: doc.visibility
        } as FormDefinition;
      });
    } catch (err) {
      console.error('Error listing form definitions', err);
      return [];
    }
  },

  async getByKey(key: string) {
    try {
      console.log(`fetching form definition for key: "${key}"`);
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS, [
        Query.equal('key', key)
      ]);
      console.log(`found ${res.total} documents for key: "${key}"`);
      if (res.total === 0) return null;
      const doc: any = res.documents[0];

      let schema = {};
      try {
        console.log(`Raw schema for ${key}:`, doc.schema?.substring(0, 50) + '...');
        schema = doc.schema ? (typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema) : {};
      } catch (e) {
        console.warn(`Failed to parse schema for ${doc.key}`, e);
      }

      let defaultData = {};
      try {
        defaultData = doc.defaultData ? (typeof doc.defaultData === 'string' ? JSON.parse(doc.defaultData) : doc.defaultData) : {};
      } catch (e) {
        console.warn(`Failed to parse defaultData for ${doc.key}`, e);
      }

      return {
        id: doc.$id,
        key: doc.key,
        title: doc.title,
        description: doc.description,
        schema,
        defaultData,
        role: doc.role,
        needSignatureFromSeller: doc.needSignatureFromSeller || false,
        needSignatureFromBuyer: doc.needSignatureFromBuyer || false,
        autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee || false,
        autoAddToNewProjects: doc.autoAddToNewProjects || false,
        autoAssignTo: Array.isArray(doc.autoAssignTo) ? doc.autoAssignTo : (doc.autoAssignTo ? [doc.autoAssignTo] : []),
        allowChanges: doc.allowChanges || 'always',
        visibility: doc.visibility
      } as FormDefinition;
    } catch (err) {
      console.error('Error getting form definition by key', err);
      return null;
    }
  },

  async get(id: string) {
    const doc: any = await databases.getDocument(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS, id);
    return {
      id: doc.$id,
      key: doc.key,
      title: doc.title,
      description: doc.description,
      schema: doc.schema ? (typeof doc.schema === 'string' ? JSON.parse(doc.schema) : doc.schema) : {},
      defaultData: doc.defaultData ? (typeof doc.defaultData === 'string' ? JSON.parse(doc.defaultData) : doc.defaultData) : {},
      role: doc.role,
      needSignatureFromSeller: doc.needSignatureFromSeller || false,
      needSignatureFromBuyer: doc.needSignatureFromBuyer || false,
      autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee || false,
      autoAddToNewProjects: doc.autoAddToNewProjects || false,
      autoAssignTo: Array.isArray(doc.autoAssignTo) ? doc.autoAssignTo : (doc.autoAssignTo ? [doc.autoAssignTo] : []),
      allowChanges: doc.allowChanges || 'always',
      visibility: doc.visibility
    } as FormDefinition;
  },

  async create(data: Omit<FormDefinition, 'id'>) {
    const payload = {
      key: data.key,
      title: data.title,
      description: data.description,
      schema: JSON.stringify(data.schema || {}),
      defaultData: JSON.stringify(data.defaultData || {}),
      role: data.role,
      needSignatureFromSeller: data.needSignatureFromSeller,
      needSignatureFromBuyer: data.needSignatureFromBuyer,
      autoCreateTaskForAssignee: data.autoCreateTaskForAssignee,
      autoAddToNewProjects: data.autoAddToNewProjects,
      autoAssignTo: data.autoAssignTo,
      allowChanges: data.allowChanges,
      visibility: data.visibility
    };
    const res = await databases.createDocument(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS, ID.unique(), payload);
    return { ...data, id: res.$id } as FormDefinition;
  },

  async update(id: string, data: Partial<FormDefinition>) {
    const payload: any = {};
    if (data.key !== undefined) payload.key = data.key;
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.schema !== undefined) payload.schema = JSON.stringify(data.schema);
    if (data.defaultData !== undefined) payload.defaultData = JSON.stringify(data.defaultData);
    if (data.role !== undefined) payload.role = data.role;
    if (data.needSignatureFromSeller !== undefined) payload.needSignatureFromSeller = data.needSignatureFromSeller;
    if (data.needSignatureFromBuyer !== undefined) payload.needSignatureFromBuyer = data.needSignatureFromBuyer;
    if (data.autoCreateTaskForAssignee !== undefined) payload.autoCreateTaskForAssignee = data.autoCreateTaskForAssignee;
    if (data.autoAddToNewProjects !== undefined) payload.autoAddToNewProjects = data.autoAddToNewProjects;
    if (data.autoAssignTo !== undefined) payload.autoAssignTo = data.autoAssignTo;
    if (data.allowChanges !== undefined) payload.allowChanges = data.allowChanges;
    if (data.visibility !== undefined) payload.visibility = data.visibility;

    const res = await databases.updateDocument(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS, id, payload);
    return { ...data, id: res.$id } as FormDefinition;
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FORM_DEFINITIONS, id);
  }
};
