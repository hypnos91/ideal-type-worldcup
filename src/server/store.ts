// DB 읽기·쓰기. 모든 함수는 Db 를 인자로 받아 테스트에서 PGlite 로 그대로 검증한다.
import type { Db } from "./db-types";
import type { CandidateInput, PlayerInput } from "@/lib/validation";
import { isFaceBox, type FaceBox } from "@/lib/face";
import { createTournament, isAllowedSize, tryReplay, type Rng } from "@/lib/tournament";

export interface Candidate extends CandidateInput {
  id: string;
  imageUrl: string;
  face: FaceBox | null;
  /** 실제 사진이 아직 없음(자리표시 사진) */
  photoPending: boolean;
  active: boolean;
  createdAt: string;
}

export interface Player {
  id: string;
  email: string;
  name: string;
  age: number;
}

export interface Game {
  id: string;
  size: number;
  entrants: string[];
  picks: string[];
  status: "playing" | "finished" | "abandoned";
  championId: string | null;
  createdAt: string;
  finishedAt: string | null;
}

type Row = Record<string, unknown>;

const CANDIDATE_COLS = "id, name, group_name, title, height_cm, nationality, age, image_url, face, photo_pending, active, created_at";
const GAME_COLS = "id, size, entrants, picks, status, champion_id, created_at, finished_at";

function toCandidate(r: Row): Candidate {
  return {
    id: r.id as string,
    name: r.name as string,
    groupName: (r.group_name as string | null) ?? null,
    title: r.title as string,
    heightCm: Number(r.height_cm),
    nationality: r.nationality as string,
    age: Number(r.age),
    imageUrl: r.image_url as string,
    face: toFace(r.face),
    photoPending: Boolean(r.photo_pending),
    active: Boolean(r.active),
    createdAt: iso(r.created_at)!,
  };
}

function toFace(v: unknown): FaceBox | null {
  const nums = Array.isArray(v) ? v.map(Number) : null;
  return nums && isFaceBox(nums) ? nums : null;
}

function iso(v: unknown): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
}

function toGame(r: Row): Game {
  return {
    id: r.id as string,
    size: Number(r.size),
    entrants: r.entrants as string[],
    picks: r.picks as string[],
    status: r.status as Game["status"],
    championId: (r.champion_id as string | null) ?? null,
    createdAt: iso(r.created_at)!,
    finishedAt: iso(r.finished_at),
  };
}

function toPlayer(r: Row): Player {
  return { id: r.id as string, email: r.email as string, name: r.name as string, age: Number(r.age) };
}

/* ───────── 사용자 ───────── */

export type PlayerLookup = { ok: true; player: Player; created: boolean } | { ok: false; reason: "mismatch" };

/**
 * 이메일로 사용자를 찾고, 없으면 만든다.
 * 같은 이메일인데 이름·나이가 다르면 다른 사람의 기록을 보지 못하도록 거절한다
 * (2026-11-28 사용자 지시: "동일한 정보를 입력하면" 이전 기록을 이어간다).
 */
export async function findOrCreatePlayer(db: Db, input: PlayerInput): Promise<PlayerLookup> {
  const inserted = await db.query(
    `insert into players (id, email, name, age) values ($1, $2, $3, $4)
     on conflict (email) do nothing returning id, email, name, age`,
    [crypto.randomUUID(), input.email, input.name, input.age],
  );
  if (inserted[0]) return { ok: true, player: toPlayer(inserted[0]), created: true };
  const [row] = await db.query(`select id, email, name, age from players where email = $1`, [input.email]);
  const player = toPlayer(row);
  if (player.name !== input.name || player.age !== input.age) return { ok: false, reason: "mismatch" };
  return { ok: true, player, created: false };
}

export async function getPlayer(db: Db, id: string): Promise<Player | null> {
  const [row] = await db.query(`select id, email, name, age from players where id = $1`, [id]);
  return row ? toPlayer(row) : null;
}

/* ───────── 후보 ───────── */

export async function listCandidates(db: Db): Promise<Candidate[]> {
  const rows = await db.query(`select ${CANDIDATE_COLS} from candidates order by created_at desc, id`);
  return rows.map(toCandidate);
}

export async function getCandidates(db: Db, ids: string[]): Promise<Candidate[]> {
  if (ids.length === 0) return [];
  const rows = await db.query(`select ${CANDIDATE_COLS} from candidates where id = any($1::text[])`, [ids]);
  return rows.map(toCandidate);
}

export async function addCandidate(db: Db, input: CandidateInput, imageUrl: string, face: FaceBox | null = null): Promise<Candidate> {
  const [row] = await db.query(
    `insert into candidates (id, name, group_name, title, height_cm, nationality, age, image_url, face, face_checked_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::real[], now()) returning ${CANDIDATE_COLS}`,
    [crypto.randomUUID(), input.name, input.groupName, input.title, input.heightCm, input.nationality, input.age, imageUrl, face],
  );
  return toCandidate(row);
}

export type UpdateCandidateResult = { candidate: Candidate; replacedImageUrl: string | null } | null;

/**
 * 후보 정보 수정. photo 를 주면 사진(과 얼굴 위치)도 바꾸고, 바뀌기 전 사진 주소를 돌려준다(저장소에서 지우는 건 호출한 쪽).
 */
export async function updateCandidate(
  db: Db,
  id: string,
  input: CandidateInput,
  active: boolean,
  photo?: { imageUrl: string; face: FaceBox | null },
): Promise<UpdateCandidateResult> {
  const [row] = await db.query<Row & { old_image_url: string }>(
    `update candidates c set name = $2, group_name = $3, title = $4, height_cm = $5, nationality = $6, age = $7, active = $8,
       image_url = coalesce($9, c.image_url),
       face = case when $9::text is null then c.face else $10::real[] end,
       face_checked_at = case when $9::text is null then c.face_checked_at else now() end,
       photo_pending = case when $9::text is null then c.photo_pending else false end
     from (select id, image_url as old_image_url from candidates where id = $1) old
     where c.id = old.id
     returning c.id, c.name, c.group_name, c.title, c.height_cm, c.nationality, c.age, c.image_url, c.face, c.photo_pending, c.active, c.created_at, old.old_image_url`,
    [id, input.name, input.groupName, input.title, input.heightCm, input.nationality, input.age, active, photo?.imageUrl ?? null, photo?.face ?? null],
  );
  if (!row) return null;
  const candidate = toCandidate(row);
  return { candidate, replacedImageUrl: row.old_image_url !== candidate.imageUrl ? row.old_image_url : null };
}

/* ───────── 월드컵 판 ───────── */

/** 지금 새 판에 넣을 수 있는 후보: 숨기지 않았고, 끝까지 마친(제외 계산에 쓰는) 판에 등장한 적 없는 후보. */
export async function playableCandidateIds(db: Db, playerId: string): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `select c.id from candidates c
     where c.active and not exists (
       select 1 from games g
       where g.player_id = $1 and g.status = 'finished' and g.counted and c.id = any(g.entrants)
     )`,
    [playerId],
  );
  return rows.map((r) => r.id);
}

export async function getPlayingGame(db: Db, playerId: string): Promise<Game | null> {
  const [row] = await db.query(`select ${GAME_COLS} from games where player_id = $1 and status = 'playing'`, [playerId]);
  return row ? toGame(row) : null;
}

export async function listFinishedGames(db: Db, playerId: string): Promise<Game[]> {
  const rows = await db.query(
    `select ${GAME_COLS} from games where player_id = $1 and status = 'finished' order by finished_at desc`,
    [playerId],
  );
  return rows.map(toGame);
}

export type StartResult = { ok: true; game: Game } | { ok: false; reason: "bad_size" | "not_enough" };

/** 새 판을 시작한다. 진행 중이던 판은 버린 판(abandoned)으로 돌려 제외 목록에 들어가지 않게 한다. */
export async function startGame(db: Db, playerId: string, size: number, rng?: Rng): Promise<StartResult> {
  if (!isAllowedSize(size)) return { ok: false, reason: "bad_size" };
  const pool = await playableCandidateIds(db, playerId);
  if (pool.length < size) return { ok: false, reason: "not_enough" };
  const { entrants } = createTournament(pool, size, rng);
  await db.query(`update games set status = 'abandoned' where player_id = $1 and status = 'playing'`, [playerId]);
  const [row] = await db.query(
    `insert into games (id, player_id, size, entrants, status) values ($1, $2, $3, $4, 'playing') returning ${GAME_COLS}`,
    [crypto.randomUUID(), playerId, size, entrants],
  );
  return { ok: true, game: toGame(row) };
}

export type SaveResult = { ok: true; game: Game } | { ok: false; reason: "not_found" | "invalid" };

/** 선택 기록 전체를 받아 처음부터 재생해 검증한 뒤 저장한다. 우승자가 나오면 판을 끝낸다. */
export async function savePicks(db: Db, playerId: string, gameId: string, picks: string[]): Promise<SaveResult> {
  const [row] = await db.query(
    `select ${GAME_COLS} from games where id = $1 and player_id = $2 and status = 'playing'`,
    [gameId, playerId],
  );
  if (!row) return { ok: false, reason: "not_found" };
  const game = toGame(row);
  const progress = tryReplay({ entrants: game.entrants, picks });
  if (!progress) return { ok: false, reason: "invalid" };
  const champion = progress.champion;
  const [saved] = await db.query(
    `update games set picks = $3, status = $4, champion_id = $5, finished_at = case when $4 = 'finished' then now() end
     where id = $1 and player_id = $2 and status = 'playing' returning ${GAME_COLS}`,
    [gameId, playerId, picks, champion ? "finished" : "playing", champion],
  );
  return saved ? { ok: true, game: toGame(saved) } : { ok: false, reason: "not_found" };
}

/** 모든 후보를 다 봤을 때 '처음부터 다시 하기'. 우승 기록은 남기고 제외 목록만 비운다. */
export async function resetSeen(db: Db, playerId: string): Promise<void> {
  await db.query(`update games set counted = false where player_id = $1 and status = 'finished'`, [playerId]);
}

/* ───────── 설정 ───────── */

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const [row] = await db.query<{ value: string }>(`select value from settings where key = $1`, [key]);
  return row?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.query(
    `insert into settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, value],
  );
}

/* ───────── 얼굴 위치 채우기 ───────── */

/** 아직 얼굴을 찾아보지 않은 후보(사진 주소) 몇 개 */
export async function candidatesWithoutFaceCheck(db: Db, limit: number): Promise<{ id: string; imageUrl: string }[]> {
  const rows = await db.query<{ id: string; image_url: string }>(
    `select id, image_url from candidates where face_checked_at is null order by created_at limit $1`,
    [limit],
  );
  return rows.map((r) => ({ id: r.id, imageUrl: r.image_url }));
}

export async function setFace(db: Db, id: string, imageUrl: string, face: FaceBox | null): Promise<void> {
  // 그사이 사진이 바뀌었으면 덮어쓰지 않는다
  await db.query(`update candidates set face = $3::real[], face_checked_at = now() where id = $1 and image_url = $2`, [id, imageUrl, face]);
}

export async function countWithoutFaceCheck(db: Db): Promise<number> {
  const [r] = await db.query<{ n: string }>(`select count(*) n from candidates where face_checked_at is null`);
  return Number(r.n);
}
