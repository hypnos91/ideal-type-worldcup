import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Db } from "./db-types";
import { equalsPlain, passwordVersion, verifyPassword } from "./password";
import { getSetting } from "./store";

// 서명한 쿠키로 사용자·관리자를 구분한다. 값 = "<내용>.<HMAC>". SESSION_SECRET 이 바뀌면 모두 로그아웃된다.
const PLAYER_COOKIE = "itw_player";
const ADMIN_COOKIE = "itw_admin";
const PLAYER_MAX_AGE = 60 * 60 * 24 * 365;
const ADMIN_MAX_AGE = 60 * 60 * 24 * 7;
export const ADMIN_PASSWORD_KEY = "admin_password_hash";

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

/* ───────── 사용자 ───────── */

export function playerIdFrom(req: NextRequest): string | null {
  return verify(req.cookies.get(PLAYER_COOKIE)?.value);
}

export function setPlayerCookie(res: NextResponse, playerId: string) {
  res.cookies.set(PLAYER_COOKIE, sign(playerId), { ...cookieBase, maxAge: PLAYER_MAX_AGE });
}

export function clearPlayerCookie(res: NextResponse) {
  res.cookies.set(PLAYER_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

/* ───────── 관리자 ───────── */

/**
 * 지금 유효한 관리자 비밀번호. 관리자 화면에서 바꾼 적이 있으면 DB 의 해시가, 없으면 ADMIN_PASSWORD 환경 변수가 정본이다
 * (2026-11-28 사용자 지시: 처음엔 무작위로 만들고 관리자가 직접 바꿀 수 있게).
 */
async function adminSecret(db: Db): Promise<{ kind: "hash" | "plain"; value: string } | null> {
  const hash = await getSetting(db, ADMIN_PASSWORD_KEY);
  if (hash) return { kind: "hash", value: hash };
  const plain = process.env.ADMIN_PASSWORD;
  return plain ? { kind: "plain", value: plain } : null;
}

export async function checkAdminPassword(db: Db, input: unknown): Promise<boolean> {
  const s = await adminSecret(db);
  if (!s || typeof input !== "string" || input === "") return false;
  return s.kind === "hash" ? verifyPassword(input, s.value) : equalsPlain(input, s.value);
}

async function currentVersion(db: Db): Promise<string | null> {
  const s = await adminSecret(db);
  return s ? passwordVersion(s.value) : null;
}

/** 관리자 쿠키 = admin:<만료 ms>:<비밀번호 버전>. 비밀번호가 바뀌면 버전이 달라져 예전 로그인은 끊긴다. */
export async function isAdmin(req: NextRequest, db: Db): Promise<boolean> {
  const value = verify(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!value) return false;
  const [tag, exp, ver] = value.split(":");
  if (tag !== "admin" || !(Number(exp) > Date.now())) return false;
  return ver === (await currentVersion(db));
}

export async function setAdminCookie(res: NextResponse, db: Db) {
  const ver = await currentVersion(db);
  res.cookies.set(ADMIN_COOKIE, sign(`admin:${Date.now() + ADMIN_MAX_AGE * 1000}:${ver}`), {
    ...cookieBase,
    maxAge: ADMIN_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieBase, maxAge: 0 });
}
