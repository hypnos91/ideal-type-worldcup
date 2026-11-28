import type { NextRequest } from "next/server";
import { checkAdminPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/server/auth";
import { body, fail, json } from "@/server/http";

export async function GET(req: NextRequest) {
  return json({ admin: isAdmin(req) });
}

export async function POST(req: NextRequest) {
  const { password } = ((await body(req)) ?? {}) as { password?: unknown };
  if (!checkAdminPassword(password)) return fail("비밀번호가 맞지 않아요", 401);
  const res = json({ admin: true });
  setAdminCookie(res);
  return res;
}

export async function DELETE() {
  const res = json({ admin: false });
  clearAdminCookie(res);
  return res;
}
