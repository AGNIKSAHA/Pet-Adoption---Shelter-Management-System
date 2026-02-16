import crypto from "crypto";
import { env } from "../config/env";

const algorithm = "aes-256-cbc";
// Hash the key to ensure it's exactly 32 bytes for aes-256-cbc
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(env.ENCRYPTION_KEY)
  .digest();
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (text: string): string => {
  if (!text) return text;
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error);
    return text; // Return original if decryption fails (e.g. not encrypted yet)
  }
};
