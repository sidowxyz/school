// Helpers for turning user input into safe Mongo queries.

/** Escapes a search term so it matches literally inside a RegExp. */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" regex for a search box, or null for an empty or non-text value. */
export const searchRegex = (value) => {
  if (typeof value !== 'string') return null;
  const term = value.trim().slice(0, 100);
  return term ? new RegExp(escapeRegex(term), 'i') : null;
};

/** Page and page size from the query string, with a floor of 1 and a hard upper bound. */
export const pageParams = (query, { defaultLimit = 20, maxLimit = 500 } = {}) => {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};
