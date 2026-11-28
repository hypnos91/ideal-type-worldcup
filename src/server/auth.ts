import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// 서명한 쿠키로 사용자·관리자를 구분한다. 값 = "<내용>.<HMAC>". SESSION_SECRET 이 바뀌면 모두 로그아웃된다.
const PLAYER_COOKIE = "itw_player";
const ADMIN_COOKIE = "itw_admin";
const PLAYER_MAX_AGE = 60 * 60 * 24 * 365;
const ADMIN_MAX_AGE = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET 환경 변수(32자 이상)가 없습니다");
  return s;
}

function sign(value: string): string {
  return `${value}.${createHmac("sha256", secret()).update(value).digest("base64url")}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const a = Buffer.from(signed);
  const b = Buffer.from(sign(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function playerIdFrom(req: NextRequest): string | null {
  return verify(req.cookies.get(PLAYER_COOKIE)?.value);
}

export function setPlayerCookie(res: NextResponse, playerId: string) {
  res.cookies.set(PLAYER_COOKIE, sign(playerId), { ...cookieBase, maxAge: PLAYER_MAX_AGE });
}

export function clearPlayerCookie(res: NextResponse) {
  res.cookies.set(PLAYER_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export function isAdmin(req: NextRequest): boolean {
  const value = verify(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!value) return false;
  const exp = Number(value.split(":")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export function setAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, sign(`admin:${Date.now() + ADMIN_MAX_AGE * 1000}`), {
    ...cookieBase,
    maxAge: ADMIN_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

/** 관리자 비밀번호 확인(길이가 달라도 시간 차이가 나지 않게 해시끼리 비교). */
export function checkAdminPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== "string") return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(input), h(expected));
}
