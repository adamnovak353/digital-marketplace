import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, hash] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const next = (await scryptAsync(password, Buffer.from(salt, "base64url"), 32)) as Buffer;
  const prev = Buffer.from(hash, "base64url");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createBox(secret: string) {
  const key = createHash("sha256").update(secret).digest();
  return {
    encrypt(plain: string) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return {
        ciphertext: ciphertext.toString("base64url"),
        iv: iv.toString("base64url"),
        tag: tag.toString("base64url"),
      };
    },
    decrypt(payload: { ciphertext: string; iv: string; tag: string }) {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64url"));
      decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },
  };
}

export type SecretBox = ReturnType<typeof createBox>;

/** Reject primary account numbers. Marketplace inventory must never store PAN data. */
export function containsPan(value: string) {
  const runs = value.replace(/[ -]/g, " ").match(/\d{13,19}/g) ?? [];
  return runs.some(isLuhn);
}

export function containsCvv(value: string) {
  return /\bcvv\b\s*[:=]?\s*\d{3,4}\b/i.test(value);
}

function isLuhn(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return num.length >= 13 && sum % 10 === 0;
}
