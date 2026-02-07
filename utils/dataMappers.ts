/**
 * Data Mapping Utilities for Appwrite Documents
 *
 * Provides helper functions to convert between database format (JSON strings)
 * and application format (typed objects) for the relational model.
 */

import type {
  Property,
  ParsedProperty,
  PropertyLocation,
  PropertySize,
  PropertyMedia,
  PropertyRooms,
  PropertyDescription,
  Profile,
  ParsedProfile,
  ProfileAddress,
  FormSubmission,
  ParsedFormSubmission,
  SignRequest,
  ParsedSignRequest,
  ContractTemplateExt,
  ParsedContractTemplate,
  UserRole
} from '../types';
import { parseJsonField, stringifyJsonField } from '../types';

/**
 * Property Mappers
 */
export const PropertyMapper = {
  /**
   * Parse Property document from database to application format
   */
  parse(property: Property): ParsedProperty {
    return {
      ...property,
      description: parseJsonField<PropertyDescription[]>(property.description, []),
      location: parseJsonField<PropertyLocation>(property.location, {}),
      size: parseJsonField<PropertySize>(property.size, {}),
      media: parseJsonField<PropertyMedia>(property.media, { images: [] }),
      specs: parseJsonField<string[]>(property.specs, []),
      rooms: parseJsonField<PropertyRooms>(property.rooms, {})
    };
  },

  /**
   * Prepare Property data for database storage
   */
  prepare(data: Partial<ParsedProperty>): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...data };

    if (data.description && Array.isArray(data.description)) {
      prepared.description = stringifyJsonField(data.description);
    }
    if (data.location && typeof data.location === 'object') {
      prepared.location = stringifyJsonField(data.location);
    }
    if (data.size && typeof data.size === 'object') {
      prepared.size = stringifyJsonField(data.size);
    }
    if (data.media && typeof data.media === 'object') {
      prepared.media = stringifyJsonField(data.media);
    }
    if (data.specs && Array.isArray(data.specs)) {
      prepared.specs = stringifyJsonField(data.specs);
    }
    if (data.rooms && typeof data.rooms === 'object') {
      prepared.rooms = stringifyJsonField(data.rooms);
    }

    // Remove Appwrite meta fields
    delete prepared.$id;
    delete prepared.$createdAt;
    delete prepared.$updatedAt;
    delete prepared.$permissions;
    delete prepared.$databaseId;
    delete prepared.$collectionId;

    return prepared;
  }
};

/**
 * Profile Mappers
 */
export const ProfileMapper = {
  /**
   * Parse Profile document from database to application format
   */
  parse(profile: Profile): ParsedProfile {
    return {
      ...profile,
      address: profile.address ? parseJsonField<ProfileAddress>(profile.address, {}) : undefined
    };
  },

  /**
   * Prepare Profile data for database storage
   */
  prepare(data: Partial<ParsedProfile>): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...data };

    if (data.address && typeof data.address === 'object') {
      prepared.address = stringifyJsonField(data.address);
    }

    // Remove Appwrite meta fields
    delete prepared.$id;
    delete prepared.$createdAt;
    delete prepared.$updatedAt;
    delete prepared.$permissions;
    delete prepared.$databaseId;
    delete prepared.$collectionId;

    return prepared;
  }
};

/**
 * FormSubmission Mappers
 */
export const FormSubmissionMapper = {
  /**
   * Parse FormSubmission document from database to application format
   */
  parse(submission: FormSubmission): ParsedFormSubmission {
    return {
      ...submission,
      form_data: parseJsonField<Record<string, unknown>>(submission.form_data, {}),
      attachments: submission.attachments ? parseJsonField<string[]>(submission.attachments, []) : undefined,
      meta: submission.meta ? parseJsonField<Record<string, unknown>>(submission.meta, {}) : undefined
    };
  },

  /**
   * Prepare FormSubmission data for database storage
   */
  prepare(data: Partial<ParsedFormSubmission>): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...data };

    if (data.form_data && typeof data.form_data === 'object') {
      prepared.form_data = stringifyJsonField(data.form_data);
    }
    if (data.attachments && Array.isArray(data.attachments)) {
      prepared.attachments = stringifyJsonField(data.attachments);
    }
    if (data.meta && typeof data.meta === 'object') {
      prepared.meta = stringifyJsonField(data.meta);
    }

    // Remove Appwrite meta fields
    delete prepared.$id;
    delete prepared.$createdAt;
    delete prepared.$updatedAt;
    delete prepared.$permissions;
    delete prepared.$databaseId;
    delete prepared.$collectionId;

    return prepared;
  }
};

/**
 * SignRequest Mappers
 */
export const SignRequestMapper = {
  /**
   * Parse SignRequest document from database to application format
   */
  parse(request: SignRequest): ParsedSignRequest {
    return {
      ...request,
      required_signers: parseJsonField<string[]>(request.required_signers, []),
      signature_data: parseJsonField<Record<string, string>>(request.signature_data, {})
    };
  },

  /**
   * Prepare SignRequest data for database storage
   */
  prepare(data: Partial<ParsedSignRequest>): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...data };

    if (data.required_signers && Array.isArray(data.required_signers)) {
      prepared.required_signers = stringifyJsonField(data.required_signers);
    }
    if (data.signature_data && typeof data.signature_data === 'object') {
      prepared.signature_data = stringifyJsonField(data.signature_data);
    }

    // Remove Appwrite meta fields
    delete prepared.$id;
    delete prepared.$createdAt;
    delete prepared.$updatedAt;
    delete prepared.$permissions;
    delete prepared.$databaseId;
    delete prepared.$collectionId;

    return prepared;
  }
};

/**
 * ContractTemplate Mappers
 */
export const ContractTemplateMapper = {
  /**
   * Parse ContractTemplate document from database to application format
   */
  parse(template: ContractTemplateExt): ParsedContractTemplate {
    return {
      ...template,
      required_roles: parseJsonField<UserRole[]>(template.required_roles, []),
      schema: template.schema ? parseJsonField<Record<string, unknown>>(template.schema, {}) : undefined
    };
  },

  /**
   * Prepare ContractTemplate data for database storage
   */
  prepare(data: Partial<ParsedContractTemplate>): Record<string, unknown> {
    const prepared: Record<string, unknown> = { ...data };

    if (data.required_roles && Array.isArray(data.required_roles)) {
      prepared.required_roles = stringifyJsonField(data.required_roles);
    }
    if (data.schema && typeof data.schema === 'object') {
      prepared.schema = stringifyJsonField(data.schema);
    }

    // Remove Appwrite meta fields
    delete prepared.$id;
    delete prepared.$createdAt;
    delete prepared.$updatedAt;
    delete prepared.$permissions;
    delete prepared.$databaseId;
    delete prepared.$collectionId;

    return prepared;
  }
};

/**
 * Utility: Format address to single string
 */
export function formatAddress(address: ProfileAddress | PropertyLocation | undefined): string {
  if (!address) return '';

  const parts: string[] = [];

  if (address.street && address.streetNumber) {
    parts.push(`${address.street} ${address.streetNumber}`);
  } else if (address.street) {
    parts.push(address.street);
  }

  if (address.postalCode && address.city) {
    parts.push(`${address.postalCode} ${address.city}`);
  } else if (address.city) {
    parts.push(address.city);
  }

  if (address.country && address.country !== 'Netherlands') {
    parts.push(address.country);
  }

  return parts.join(', ');
}
