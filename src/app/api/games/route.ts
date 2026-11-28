import type { NextRequest } from "next/server";
import { playerIdFrom } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { getPlayer, savePicks, startGame } from "@/server/store";
import { gameView } from "@/server/views";

/** 새 판 시작 { size } */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const id = playerIdFrom(req);
    const db = await getDb();
    if (!id || !(await getPlayer(db, id))) return fail("로그인이 필요해요", 401);
    const { size } = ((await body(req)) ?? {}) as { size?: unknown };
    const result = await startGame(db, id, Number(size));
    if (!result.ok) {
      return fail(result.reason === "bad_size" ? "32·64·128강 중에서 골라 주세요" : "남은 후보가 부족해요", 400);
    }
    return json(await gameView(db, result.game));
  });
}

/** 선택 기록 저장 { gameId, picks } — 서버가 처음부터 재생해 검증한다 */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const id = playerIdFrom(req);
    if (!id) return fail("로그인이 필요해요", 401);
    const { gameId, picks } = ((await body(req)) ?? {}) as { gameId?: unknown; picks?: unknown };
    if (typeof gameId !== "string" || !Array.isArray(picks) || !picks.every((p) => typeof p === "string")) {
      return fail("요청 형식이 올바르지 않아요", 400);
    }
    const result = await savePicks(await getDb(), id, gameId, picks);
    if (!result.ok) {
      return fail(result.reason === "invalid" ? "선택 기록이 올바르지 않아요" : "진행 중인 게임을 찾을 수 없어요", result.reason === "invalid" ? 400 : 404);
    }
    return json({ status: result.game.status, championId: result.game.championId });
  });
}
