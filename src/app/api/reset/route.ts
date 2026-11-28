import type { NextRequest } from "next/server";
import { playerIdFrom } from "@/server/auth";
import { getDb } from "@/server/db";
import { fail, guarded, json } from "@/server/http";
import { resetSeen } from "@/server/store";

/** 본 후보 목록 비우기(우승 기록은 유지) */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const id = playerIdFrom(req);
    if (!id) return fail("로그인이 필요해요", 401);
    await resetSeen(await getDb(), id);
    return json({ ok: true });
  });
}
