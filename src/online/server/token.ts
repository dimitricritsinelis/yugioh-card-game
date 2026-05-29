const TOKEN_BYTES = 32;

export function createSeatToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashSeatToken(token: string, salt: string): Promise<string> {
  const normalized = `${salt}:${token}`;
  const encoded = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

export function safeTokenHashEquals(first: string, second: string): boolean {
  if (first.length !== second.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }

  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
