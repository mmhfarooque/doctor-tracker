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
