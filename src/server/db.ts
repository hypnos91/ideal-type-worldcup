import "server-only";
import { neon } from "@neondatabase/serverless";

import { applySchema } from "./schema";
import type { Db } from "./db-types";

export type { Db };

let db: Db | null = null;
let ready: Promise<Db> | null = null;

/** 표가 준비된 DB. 인스턴스마다 처음 한 번만 표 생성 구문을 돌린다. */
export function getDb(): Promise<Db> {
  ready ??= (async () => {
    const d = connect();
    await applySchema(d);
    return d;
  })().catch((e) => {
    ready = null; // 다음 요청에서 다시 시도
    throw e;
  });
  return ready;
}

function connect(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경 변수가 없습니다");
  const sql = neon(url);
  db = {
    query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[],
  };
  return db;
}
