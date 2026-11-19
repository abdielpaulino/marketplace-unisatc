// RNF02 – passwords are never stored in plain text.
// NOTE: in production, hashing must happen on the server (bcrypt/argon2).

function fallbackHash(text) {
  // FNV-1a (only used when Web Crypto is unavailable, e.g. plain-HTTP LAN access)
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv-${h.toString(16)}`;
}

export async function hashPassword(password, salt) {
  const text = `${String(salt).toLowerCase()}::${password}`;
  if (!globalThis.crypto?.subtle) return fallbackHash(text);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
