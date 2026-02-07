import { parseJsonField } from '../types';

/**
 * Agency JSON Type Definitions
 */
export interface AgencyAddress {
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

/**
 * Parser Functions
 */
export const parseAgencyAddress = (json: string | undefined): AgencyAddress =>
  parseJsonField<AgencyAddress>(json, {
    street: '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: 'Netherlands'
  });

/**
 * Stringify Functions
 */
export const stringifyAgencyAddress = (data: AgencyAddress): string =>
  JSON.stringify(data);

/**
 * Helper to build formatted address string from agency address data
 */
export const formatAgencyAddress = (address: AgencyAddress): string => {
  const { street, streetNumber, postalCode, city, country } = address;
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
