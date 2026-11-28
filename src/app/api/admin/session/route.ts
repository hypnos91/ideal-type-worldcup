import type { NextRequest } from "next/server";
import { checkAdminPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";

export async function GET(req: NextRequest) {
  return guarded(async () => json({ admin: await isAdmin(req, await getDb()) }));
}

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    const { password } = ((await body(req)) ?? {}) as { password?: unknown };
    if (!(await checkAdminPassword(db, password))) return fail("비밀번호가 맞지 않아요", 401);
    const res = json({ admin: true });
    await setAdminCookie(res, db);
    return res;
  });
}

export async function DELETE() {
  const res = json({ admin: false });
  clearAdminCookie(res);
  return res;
}
