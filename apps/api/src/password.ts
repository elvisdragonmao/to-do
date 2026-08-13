import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const derived = (await scryptAsync(password, salt, 64)) as Buffer;
	return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
	const [algorithm, saltHex, expectedHex] = encoded.split(":");
	if (algorithm !== "scrypt" || !saltHex || !expectedHex) return false;

	const expected = Buffer.from(expectedHex, "hex");
	const actual = (await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}
