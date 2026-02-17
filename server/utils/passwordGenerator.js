const crypto = require('crypto');

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*_-+=?';

function pick(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

/**
 * Generate a strong temporary password for parent access.
 * - length >= 10
 * - contains lower, upper, digit, symbol
 */
function generateStrongPassword(length = 12) {
  const targetLength = Math.max(10, Number(length) || 12);

  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const out = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];

  while (out.length < targetLength) out.push(pick(all));

  // Shuffle to avoid predictable placement.
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out.join('');
}

module.exports = { generateStrongPassword };

