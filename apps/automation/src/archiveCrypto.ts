import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Archive data is committed to a public repo (see job-archive.yml), so it's
// encrypted at rest with a key that only lives in .env locally and as a
// GitHub Actions secret — never committed. AES-256-GCM: authenticated
// encryption, so tampering/corruption is detected on decrypt rather than
// silently producing garbage JSON.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

function getKey(): Buffer {
  const raw = process.env.ARCHIVE_ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing ARCHIVE_ENCRYPTION_KEY in .env");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ARCHIVE_ENCRYPTION_KEY must decode to 32 bytes (base64 of crypto.randomBytes(32))");
  return key;
}

// Envelope is a single JSON object so the encrypted file is still
// inspectable as JSON (iv/authTag visible, ciphertext opaque) rather than a
// raw binary blob.
interface EncryptedEnvelope {
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

export function encryptArchive(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope, null, 2) + "\n";
}

export function decryptArchive(fileContents: string): string {
  const envelope = JSON.parse(fileContents) as EncryptedEnvelope;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
  return plaintext.toString("utf-8");
}
