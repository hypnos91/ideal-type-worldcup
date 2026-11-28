import type { NextRequest } from "next/server";
import { playerIdFrom } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { hideFinishedGame } from "@/server/store";

/** '나의 최종 1인' 기록 지우기 { gameId } — 목록에서 빠지고 그 판 후보도 다시 볼 수 있게 된다 */
export async function DELETE(req: NextRequest) {
  return guarded(async () => {
    const id = playerIdFrom(req);
    if (!id) return fail("로그인이 필요해요", 401);
    const { gameId } = ((await body(req)) ?? {}) as { gameId?: unknown };
    if (typeof gameId !== "string") return fail("요청 형식이 올바르지 않아요", 400);
    const ok = await hideFinishedGame(await getDb(), id, gameId);
    return ok ? json({ ok: true }) : fail("기록을 찾을 수 없어요", 404);
  });
}
