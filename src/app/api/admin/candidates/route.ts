import type { NextRequest } from "next/server";
import { parseCandidate } from "@/lib/validation";
import { isAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { addCandidate, listCandidates, updateCandidate } from "@/server/store";

/** 우리 Blob 저장소에 올라간 사진 주소만 받는다 */
function isBlobUrl(v: unknown): v is string {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
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
    if (!isBlobUrl(raw?.imageUrl)) return fail("사진 주소가 올바르지 않아요", 400);
    const parsed = parseCandidate(raw);
    if (!parsed.ok) return fail(parsed.error, 400);
    return json(await addCandidate(db, parsed.value, raw!.imageUrl as string), 201);
  });
}

/** 후보 수정 { id, active, ...정보 } */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    const raw = (await body(req)) as Record<string, unknown> | null;
    if (typeof raw?.id !== "string" || typeof raw.active !== "boolean") return fail("요청 형식이 올바르지 않아요", 400);
    const parsed = parseCandidate(raw);
    if (!parsed.ok) return fail(parsed.error, 400);
    const updated = await updateCandidate(db, raw.id, parsed.value, raw.active);
    return updated ? json(updated) : fail("후보를 찾을 수 없어요", 404);
  });
}
