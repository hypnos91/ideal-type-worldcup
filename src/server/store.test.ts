import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { replay } from "@/lib/tournament";
import type { Db } from "./db-types";
import { applySchema } from "./schema";
import {
  addCandidate,
  candidatesWithoutFaceCheck,
  countWithoutFaceCheck,
  findOrCreatePlayer,
  getPlayingGame,
  listFinishedGames,
  playableCandidateIds,
  resetSeen,
  hideFinishedGame,
  savePicks,
  setFace,
  startGame,
  updateCandidate,
} from "./store";

let db: Db;

const base = { groupName: null, title: "배우", heightCm: 170, nationality: "대한민국", age: 25 };

async function seed(n: number) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push((await addCandidate(db, { ...base, name: `후보${i}` }, `https://img/${i}.jpg`)).id);
  return ids;
}

async function player() {
  const r = await findOrCreatePlayer(db, { email: "a@b.com", name: "홍길동", age: 30 });
  if (!r.ok) throw new Error("player");
  return r.player;
}

/** 매번 왼쪽을 골라 끝까지 진행 */
async function finish(playerId: string, gameId: string, entrants: string[]) {
  let picks: string[] = [];
  for (;;) {
    const { current } = replay({ entrants, picks });
    if (!current) break;
    picks = [...picks, current.a];
  }
  return savePicks(db, playerId, gameId, picks);
}

beforeEach(async () => {
  const pg = new PGlite();
  db = { query: async (t, p) => (await pg.query(t, p)).rows as never };
  await applySchema(db);
  await applySchema(db); // 두 번 실행해도 안전해야 한다
});

describe("사용자", () => {
  it("같은 정보면 같은 사용자, 이메일 대소문자 정규화는 호출 전 처리", async () => {
    const a = await findOrCreatePlayer(db, { email: "a@b.com", name: "홍길동", age: 30 });
    const b = await findOrCreatePlayer(db, { email: "a@b.com", name: "홍길동", age: 30 });
    expect(a.ok && b.ok && a.player.id === b.player.id).toBe(true);
    expect(a.ok && a.created).toBe(true);
    expect(b.ok && b.created).toBe(false);
  });

  it("이메일이 같은데 이름이나 나이가 다르면 거절", async () => {
    await player();
    expect(await findOrCreatePlayer(db, { email: "a@b.com", name: "김철수", age: 30 })).toEqual({ ok: false, reason: "mismatch" });
    expect(await findOrCreatePlayer(db, { email: "a@b.com", name: "홍길동", age: 31 })).toEqual({ ok: false, reason: "mismatch" });
  });
});

describe("월드컵 판", () => {
  it("후보가 모자라면 시작할 수 없고, 허용되지 않은 강수도 거절", async () => {
    await seed(31);
    const p = await player();
    expect(await startGame(db, p.id, 32)).toEqual({ ok: false, reason: "not_enough" });
    expect(await startGame(db, p.id, 16)).toEqual({ ok: false, reason: "bad_size" });
  });

  it("끝까지 마친 판의 후보는 다음 판에서 빠지고, 우승자가 기록된다", async () => {
    await seed(70);
    const p = await player();
    const s = await startGame(db, p.id, 32);
    if (!s.ok) throw new Error();
    const done = await finish(p.id, s.game.id, s.game.entrants);
    expect(done.ok && done.game.status).toBe("finished");
    expect(done.ok && done.game.championId).toBeTruthy();

    const pool = await playableCandidateIds(db, p.id);
    expect(pool).toHaveLength(38);
    expect(pool.some((id) => s.game.entrants.includes(id))).toBe(false);
    expect((await startGame(db, p.id, 64)).ok).toBe(false); // 38명이라 64강 불가

    const history = await listFinishedGames(db, p.id);
    expect(history).toHaveLength(1);
  });

  it("중간에 그만둔 판은 제외 목록에 들어가지 않고, 새로 시작하면 버린 판이 된다", async () => {
    await seed(40);
    const p = await player();
    const first = await startGame(db, p.id, 32);
    if (!first.ok) throw new Error();
    const { current } = replay({ entrants: first.game.entrants, picks: [] });
    await savePicks(db, p.id, first.game.id, [current!.a]);
    expect((await getPlayingGame(db, p.id))?.picks).toEqual([current!.a]);

    expect(await playableCandidateIds(db, p.id)).toHaveLength(40);
    const second = await startGame(db, p.id, 32);
    expect(second.ok).toBe(true);
    expect((await getPlayingGame(db, p.id))?.id).toBe(second.ok && second.game.id);
    // 버린 판에는 더 저장할 수 없다
    expect((await savePicks(db, p.id, first.game.id, [])).ok).toBe(false);
  });

  it("잘못된 선택 기록과 남의 판은 거절", async () => {
    await seed(32);
    const p = await player();
    const other = await findOrCreatePlayer(db, { email: "x@y.com", name: "남", age: 20 });
    const s = await startGame(db, p.id, 32);
    if (!s.ok || !other.ok) throw new Error();
    expect(await savePicks(db, p.id, s.game.id, ["없는id"])).toEqual({ ok: false, reason: "invalid" });
    expect(await savePicks(db, other.player.id, s.game.id, [])).toEqual({ ok: false, reason: "not_found" });
  });

  it("숨긴 후보는 나오지 않고, 다시 하기는 제외 목록만 비운다", async () => {
    const ids = await seed(33);
    const p = await player();
    await updateCandidate(db, ids[0], { ...base, name: "숨김" }, false);
    expect(await playableCandidateIds(db, p.id)).toHaveLength(32);
    const s = await startGame(db, p.id, 32);
    if (!s.ok) throw new Error();
    expect(s.game.entrants).not.toContain(ids[0]);
    await finish(p.id, s.game.id, s.game.entrants);
    expect(await playableCandidateIds(db, p.id)).toHaveLength(0);
    await resetSeen(db, p.id);
    expect(await playableCandidateIds(db, p.id)).toHaveLength(32);
    expect(await listFinishedGames(db, p.id)).toHaveLength(1);
  });
});

describe("나의 최종 1인 지우기", () => {
  it("지우면 목록에서 빠지고 그 판 후보가 다시 나온다, 남의 기록은 못 지운다", async () => {
    await seed(40);
    const p = await player();
    const other = await findOrCreatePlayer(db, { email: "x@y.com", name: "남", age: 20 });
    const s = await startGame(db, p.id, 32);
    if (!s.ok || !other.ok) throw new Error();
    await finish(p.id, s.game.id, s.game.entrants);
    expect(await hideFinishedGame(db, other.player.id, s.game.id)).toBe(false);
    expect(await listFinishedGames(db, p.id)).toHaveLength(1);
    expect(await hideFinishedGame(db, p.id, s.game.id)).toBe(true);
    expect(await listFinishedGames(db, p.id)).toHaveLength(0);
    expect(await playableCandidateIds(db, p.id)).toHaveLength(40); // 본 32명이 다시 후보로
  });
});

describe("나의 최종 1인 지우기(여러 판)", () => {
  it("다른 판에서도 본 후보는 계속 제외된다", async () => {
    await seed(40);
    const p = await player();
    const first = await startGame(db, p.id, 32);
    if (!first.ok) throw new Error();
    await finish(p.id, first.game.id, first.game.entrants);
    await resetSeen(db, p.id); // 두 번째 판이 첫 판 후보와 겹칠 수 있게
    const second = await startGame(db, p.id, 32);
    if (!second.ok) throw new Error();
    await finish(p.id, second.game.id, second.game.entrants);
    const overlap = second.game.entrants.filter((id) => first.game.entrants.includes(id)).length;
    // 첫 판은 이미 counted=false 라 두 번째 판만 제외에 쓰인다. 두 번째 판을 지우면 모두 돌아온다
    expect(await playableCandidateIds(db, p.id)).toHaveLength(8);
    expect(overlap).toBeGreaterThan(0);
    await hideFinishedGame(db, p.id, second.game.id);
    expect(await playableCandidateIds(db, p.id)).toHaveLength(40);
  });
});

describe("후보 수정", () => {
  it("사진을 바꾸면 예전 주소를 돌려주고, 안 바꾸면 null", async () => {
    const [id] = await seed(1);
    await db.query(`update candidates set photo_pending = true where id = $1`, [id]);
    const same = await updateCandidate(db, id, { ...base, name: "새이름" }, true);
    expect(same?.candidate.photoPending).toBe(true); // 정보만 고치면 그대로
    expect(same?.candidate.name).toBe("새이름");
    expect(same?.replacedImageUrl).toBeNull();
    const swapped = await updateCandidate(db, id, { ...base, name: "새이름" }, true, { imageUrl: "https://img/new.webp", face: [0.3, 0.2, 0.4, 0.3, 0.75] });
    expect(swapped?.candidate.imageUrl).toBe("https://img/new.webp");
    expect(swapped?.candidate.face).toEqual([0.3, 0.2, 0.4, 0.3, 0.75]);
    expect(swapped?.candidate.photoPending).toBe(false);
    expect(swapped?.replacedImageUrl).toBe("https://img/0.jpg");
    expect(await updateCandidate(db, "없음", base as never, true)).toBeNull();
  });
});

describe("얼굴 위치", () => {
  it("새로 올린 후보는 확인 완료, 예전 후보만 채우기 대상이고 사진이 바뀌었으면 덮어쓰지 않는다", async () => {
    const withFace = await addCandidate(db, { ...base, name: "새" }, "https://img/a.webp", [0.1, 0.1, 0.2, 0.2, 0.75]);
    expect(withFace.face).toEqual([0.1, 0.1, 0.2, 0.2, 0.75]);
    await db.query(`insert into candidates (id, name, title, height_cm, nationality, age, image_url) values ('old', '옛', '배우', 180, '대한민국', 30, 'https://img/old.webp')`);
    expect(await countWithoutFaceCheck(db)).toBe(1);
    const [todo] = await candidatesWithoutFaceCheck(db, 10);
    expect(todo).toEqual({ id: "old", imageUrl: "https://img/old.webp" });
    await setFace(db, "old", "https://img/other.webp", [0.5, 0.5, 0.1, 0.1, 1]);
    expect(await countWithoutFaceCheck(db)).toBe(1);
    await setFace(db, "old", "https://img/old.webp", null);
    expect(await countWithoutFaceCheck(db)).toBe(0);
  });
});
