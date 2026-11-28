// DB 접근 인터페이스. 운영은 Neon(HTTP, src/server/db.ts), 테스트는 PGlite 가 구현한다.
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
