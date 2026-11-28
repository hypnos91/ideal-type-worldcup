import type { NextRequest } from "next/server";
import { ADMIN_PASSWORD_KEY, checkAdminPassword, isAdmin, setAdminCookie } from "@/server/auth";
import { getDb } from "@/server/db";
import { body, fail, guarded, json } from "@/server/http";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@/server/password";
import { setSetting } from "@/server/store";

/** 관리자 비밀번호 변경 { current, next }. 바꾸면 다른 기기의 관리자 로그인은 끊기고, 지금 기기는 새 쿠키로 유지된다. */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    const { current, next } = ((await body(req)) ?? {}) as { current?: unknown; next?: unknown };
    if (!(await checkAdminPassword(db, current))) return fail("지금 비밀번호가 맞지 않아요", 400);
    if (typeof next !== "string" || next.length < MIN_PASSWORD_LENGTH || next.length > 200) {
      return fail(`새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요`, 400);
    }
    await setSetting(db, ADMIN_PASSWORD_KEY, hashPassword(next));
    const res = json({ ok: true });
    await setAdminCookie(res, db);
    return res;
  });
}
