import type { Property } from '../types';
import type {
  PropertyDescription,
  PropertyLocation,
  PropertyMedia,
  PropertyRooms,
  PropertySize
} from '../utils/propertyHelpers';
import {
  formatAddress,
  parseDescription,
  parseLocation,
  parseMedia,
  parseRooms,
  parseSize,
  parseSpecs,
  stringifyLocation,
  stringifyMedia,
  stringifyRooms,
  stringifySize,
  stringifySpecs
} from '../utils/propertyHelpers';
import { COLLECTIONS, DATABASE_ID, databases, ID } from './appwrite';

/**
 * Create Property Data Interface
 */
export interface CreatePropertyData {
  descriptions?: PropertyDescription[];
  location: PropertyLocation;
  size: PropertySize;
  media?: PropertyMedia;
  rooms: PropertyRooms;
  specs?: string[];
}

/**
 * Parsed Property Data Interface
 */
export interface ParsedPropertyData {
  property: Property;
  descriptions: PropertyDescription[];
  locationData: PropertyLocation;
  sizeData: PropertySize;
  mediaData: PropertyMedia;
  roomsData: PropertyRooms;
  specsData: string[];
  formattedAddress: string;
}

/**
 * Create a new property
 */
export const createProperty = async (data: CreatePropertyData): Promise<Property> => {
  const payload = {
    description: data.descriptions ? JSON.stringify(data.descriptions) : JSON.stringify([]),
    location: stringifyLocation(data.location),
    size: stringifySize(data.size),
    media: data.media ? stringifyMedia(data.media) : JSON.stringify({ images: [] }),
    rooms: stringifyRooms(data.rooms),
    specs: data.specs ? stringifySpecs(data.specs) : JSON.stringify([])
  };

  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROPERTIES,
    ID.unique(),
    payload
  );

  return result as Property;
};

/**
 * Get property by ID
 */
export const getProperty = async (id: string): Promise<Property> => {
  const doc = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROPERTIES,
    id
  );
  return doc as unknown as Property;
};

/**
 * Get property with all parsed JSON fields
 */
export const getPropertyParsed = async (id: string): Promise<ParsedPropertyData> => {
  const property = await getProperty(id);

  const descriptions = parseDescription(property.description);
  const locationData = parseLocation(property.location);
  const sizeData = parseSize(property.size);
  const mediaData = parseMedia(property.media);
  const roomsData = parseRooms(property.rooms);
  const specsData = parseSpecs(property.specs);

  return {
    property,
    descriptions,
    locationData,
    sizeData,
    mediaData,
    roomsData,
    specsData,
    formattedAddress: formatAddress(locationData)
  };
};

/**
 * Update property
 */
export const updateProperty = async (
  id: string,
  data: Partial<CreatePropertyData>
): Promise<Property> => {
  const payload: any = {};

  if (data.descriptions !== undefined) {
    payload.description = JSON.stringify(data.descriptions);
  }
  if (data.location) {
    payload.location = stringifyLocation(data.location);
  }
  if (data.size) {
    payload.size = stringifySize(data.size);
  }
  if (data.media) {
    payload.media = stringifyMedia(data.media);
  }
  if (data.rooms) {
    payload.rooms = stringifyRooms(data.rooms);
  }
  if (data.specs) {
    payload.specs = stringifySpecs(data.specs);
  }

  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROPERTIES,
    id,
    payload
  );

  return result as Property;
};

/**
 * Delete property
 */
export const deleteProperty = async (id: string): Promise<void> => {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PROPERTIES,
    id
  );
};

/**
 * List properties with optional query
 */
export const listProperties = async (queries: string[] = []) => {
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROPERTIES,
    queries
  );
  return result;
};
