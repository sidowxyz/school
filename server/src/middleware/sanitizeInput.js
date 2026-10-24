// Removes MongoDB query operators from user input, so a request like
// ?status[$ne]=x or { "email": { "$gt": "" } } can never change what a
// find() matches. Keys that start with "$" or contain "." are dropped from
// req.body, req.query and req.params; nothing the app sends uses them.
const isUnsafeKey = (key) => key.startsWith('$') || key.includes('.');

const clean = (value, depth = 0) => {
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach((item, i) => { value[i] = clean(item, depth + 1); });
    return value;
  }
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  for (const key of Object.keys(value)) {
    if (isUnsafeKey(key)) delete value[key];
    else value[key] = clean(value[key], depth + 1);
  }
  return value;
};

export const sanitizeInput = (req, _res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  // req.query is a getter in newer Express versions; clean the object in place.
  if (req.query) clean(req.query);
  next();
};
