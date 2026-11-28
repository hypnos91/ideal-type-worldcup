import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// 관리자 비밀번호 해시. 형식: scrypt$<salt base64url>$<hash base64url>
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, KEYLEN).toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** 평문끼리 비교(길이가 달라도 시간 차이가 나지 않게 해시끼리 비교) */
export function equalsPlain(input: string, expected: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(input), h(expected));
}

/** 비밀번호가 바뀌면 달라지는 짧은 값. 관리자 쿠키에 넣어, 바뀌면 예전 로그인을 끊는다. */
export function passwordVersion(source: string): string {
  return createHash("sha256").update(source).digest("base64url").slice(0, 16);
}

export const MIN_PASSWORD_LENGTH = 8;
