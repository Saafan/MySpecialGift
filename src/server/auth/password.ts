import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;

/**
 * scrypt with a per-user random salt, stored as "salt:hash" (hex).
 * V1's crypto was already sound — the one defect was using scryptSync, which
 * blocked the event loop for tens of milliseconds per login and doubled as a
 * DoS vector (SEC-07). This version is fully async.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, "hex");
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    // A malformed stored hash must read as "wrong password", not a 500.
    return false;
  }
}
