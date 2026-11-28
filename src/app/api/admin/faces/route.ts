import type { NextRequest } from "next/server";
import { isAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { detectFace } from "@/server/face";
import { fail, guarded, json } from "@/server/http";
import { candidatesWithoutFaceCheck, countWithoutFaceCheck, setFace } from "@/server/store";

// 얼굴 위치를 아직 찾지 않은 예전 후보를 채운다. 함수 시간 제한 안에 끝나도록 한 번에 BATCH 명씩.
const BATCH = 8;

export async function GET(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    return json({ remaining: await countWithoutFaceCheck(db) });
  });
}

export async function POST(req: NextRequest) {
  return guarded(async () => {
    const db = await getDb();
    if (!(await isAdmin(req, db))) return fail("관리자 로그인이 필요해요", 401);
    const todo = await candidatesWithoutFaceCheck(db, BATCH);
    let found = 0;
    for (const c of todo) {
      const res = await fetch(c.imageUrl);
      const face = res.ok ? await detectFace(Buffer.from(await res.arrayBuffer())) : null;
      if (face) found++;
      await setFace(db, c.id, c.imageUrl, face);
    }
    return json({ checked: todo.length, found, remaining: await countWithoutFaceCheck(db) });
  });
}
