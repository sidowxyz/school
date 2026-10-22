import crypto from 'crypto';

// Excludes visually ambiguous characters (0/O, 1/l/I) so a printed/read-aloud
// temporary password isn't mistyped.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

export const generatePassword = (length = 12) => {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARS[crypto.randomInt(CHARS.length)];
  }
  return password;
};
