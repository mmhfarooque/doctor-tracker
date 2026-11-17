import mongoose from 'mongoose';

/**
 * Validates that all provided IDs are valid 24-character hexadecimal MongoDB ObjectIds
 * @param  {...string} ids
 * @returns {boolean}
 */
export const isValidObjectId = (...ids) => {
  return ids.every((id) => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id));
};

/**
 * Bounds a string to a safe maximum length
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export const boundString = (str, maxLength = 200) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
};

/**
 * Returns the value if it is a string, otherwise an empty string.
 * Stops non-string JSON values (arrays, objects, numbers) from reaching string methods.
 * @param {any} value
 * @returns {string}
 */
export const asString = (value) => (typeof value === 'string' ? value : '');

/**
 * Parses an integer within [min, max]. Returns null when the value is not a valid number in range.
 */
export const parseBoundedInt = (value, min, max) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < min || n > max) return null;
  return n;
};

export const DOCTOR_STATUSES = ['Active', 'On Leave', 'Inactive'];
export const PATIENT_STATUSES = ['Stable', 'Critical', 'Under Observation', 'Recovering', 'Discharged'];
export const GENDERS = ['Male', 'Female', 'Other'];
