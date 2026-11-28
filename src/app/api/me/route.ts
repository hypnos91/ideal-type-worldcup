import type { NextRequest } from "next/server";
import { playerIdFrom } from "@/server/auth";
import { getDb } from "@/server/db";
import { fail, guarded, json } from "@/server/http";
import { getPlayer } from "@/server/store";
import { meView } from "@/server/views";

export async function GET(req: NextRequest) {
  return guarded(async () => {
    const id = playerIdFrom(req);
    const db = await getDb();
    const player = id ? await getPlayer(db, id) : null;
    if (!player) return fail("로그인이 필요해요", 401);
    return json(await meView(db, player));
  });
}
