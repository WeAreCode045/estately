import { parseJsonField } from '../types';

/**
 * Property JSON Type Definitions
 */
export interface PropertyLocation {
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface PropertySize {
  lotSize: number;
  floorSize: number;
}

export interface PropertyMedia {
  images: string[];
  cover?: string;
  floorplans?: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
}

export interface PropertyRooms {
  bathrooms: number;
  bedrooms: number;
  garages?: number;
  buildYear?: number;
}

export interface PropertyDescription {
  type: 'propertydesc' | 'neighbourhooddesc';
  content: string;
}

export interface PropertyNeighbourhood {
  description: string;
  nearbyPlaces?: Array<{
    name: string;
    distance: string;
    type: string;
  }>;
}

/**
 * Parser Functions
 */
export const parseLocation = (json: string | undefined): PropertyLocation =>
  parseJsonField<PropertyLocation>(json, {
    street: '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: 'Netherlands'
  });

export const parseSize = (json: string | undefined): PropertySize =>
  parseJsonField<PropertySize>(json, {
    lotSize: 0,
    floorSize: 0
  });

export const parseMedia = (json: string | undefined): PropertyMedia =>
  parseJsonField<PropertyMedia>(json, {
    images: []
  });

export const parseRooms = (json: string | undefined): PropertyRooms =>
  parseJsonField<PropertyRooms>(json, {
    bathrooms: 0,
    bedrooms: 0
  });

export const parseSpecs = (json: string | undefined): string[] =>
  parseJsonField<string[]>(json, []);

export const parseNeighbourhood = (json: string | undefined): PropertyNeighbourhood =>
  parseJsonField<PropertyNeighbourhood>(json, {
    description: ''
  });

export const parseDescription = (json: string | undefined): PropertyDescription[] =>
  parseJsonField<PropertyDescription[]>(json, []);

/**
 * Stringify Functions
 */
export const stringifyLocation = (data: PropertyLocation): string =>
  JSON.stringify(data);

export const stringifySize = (data: PropertySize): string =>
  JSON.stringify(data);

export const stringifyMedia = (data: PropertyMedia): string =>
  JSON.stringify(data);

export const stringifyRooms = (data: PropertyRooms): string =>
  JSON.stringify(data);

export const stringifySpecs = (data: string[]): string =>
  JSON.stringify(data);

export const stringifyNeighbourhood = (data: PropertyNeighbourhood): string =>
  JSON.stringify(data);

/**
 * Helper to build formatted address string from location data
 */
export const formatAddress = (location: PropertyLocation): string => {
  const { street, streetNumber, postalCode, city, country } = location;
  const parts = [];

  if (street && streetNumber) {
    parts.push(`${street} ${streetNumber}`);
  } else if (street) {
    parts.push(street);
  }

  if (postalCode && city) {
    parts.push(`${postalCode} ${city}`);
  } else if (city) {
    parts.push(city);
  }

  if (country && country !== 'Netherlands') {
    parts.push(country);
  }

  return parts.join(', ');
};
