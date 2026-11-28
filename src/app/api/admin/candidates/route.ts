import { del } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { isFaceBox } from "@/lib/face";
import { parseCandidate } from "@/lib/validation";
import { isAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { addCandidate, listCandidates, updateCandidate } from "@/server/store";

/** /api/admin/photos 가 Blob 에 올린 WebP 사진 주소만 받는다(사진은 항상 WebP, 2026-11-28 사용자 지시) */
function isPhotoUrl(v: unknown): v is string {
  try {
    const u = new URL(String(v));
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith("/candidates/") &&
      u.pathname.endsWith(".webp")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    return json(await listCandidates(db));
  });
}

/** 후보 등록 { imageUrl, name, groupName?, title, heightCm, nationality, age } */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    const raw = (await body(req)) as Record<string, unknown> | null;
    if (!isPhotoUrl(raw?.imageUrl)) return fail("사진 주소가 올바르지 않아요", 400);
    const parsed = parseCandidate(raw);
    if (!parsed.ok) return fail(parsed.error, 400);
    const face = isFaceBox(raw!.face) ? raw!.face : null;
    return json(await addCandidate(db, parsed.value, raw!.imageUrl as string, face), 201);
  });
}

/** 후보 수정 { id, active, imageUrl?, ...정보 }. 사진을 바꾸면 예전 사진은 저장소에서 지운다. */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    const raw = (await body(req)) as Record<string, unknown> | null;
    if (typeof raw?.id !== "string" || typeof raw.active !== "boolean") return fail("요청 형식이 올바르지 않아요", 400);
    const parsed = parseCandidate(raw);
    if (!parsed.ok) return fail(parsed.error, 400);
    if (raw.imageUrl !== undefined && !isPhotoUrl(raw.imageUrl)) return fail("사진 주소가 올바르지 않아요", 400);
    const photo =
      raw.imageUrl === undefined ? undefined : { imageUrl: raw.imageUrl as string, face: isFaceBox(raw.face) ? raw.face : null };
    const updated = await updateCandidate(db, raw.id, parsed.value, raw.active, photo);
    if (!updated) return fail("후보를 찾을 수 없어요", 404);
    if (updated.replacedImageUrl) {
      // 예전 사진 정리는 실패해도 수정 결과에는 영향이 없다
      await del(updated.replacedImageUrl).catch((e) => console.error("예전 사진 삭제 실패", e));
    }
    return json(updated.candidate);
  });
}
