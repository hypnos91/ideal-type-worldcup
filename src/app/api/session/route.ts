import type { NextRequest } from "next/server";
import { parsePlayer } from "@/lib/validation";
import { clearPlayerCookie, setPlayerCookie } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { findOrCreatePlayer } from "@/server/store";

/** 이메일·이름·나이로 들어오기. 처음이면 새로 만들고, 같은 정보면 이전 기록으로 이어간다. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const parsed = parsePlayer(await body(req));
    if (!parsed.ok) return fail(parsed.error, 400);
    const result = await findOrCreatePlayer(await getDb(), parsed.value);
    if (!result.ok) return fail("이 이메일로 저장된 이름이나 나이가 달라요. 처음 입력한 정보 그대로 입력해 주세요.", 409);
    const res = json({ created: result.created });
    setPlayerCookie(res, result.player.id);
    return res;
  });
}

export async function DELETE() {
  const res = json({ ok: true });
  clearPlayerCookie(res);
  return res;
}
