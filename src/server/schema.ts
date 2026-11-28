import type { Db } from "./db-types";

// 표 정의. 앱이 처음 DB 를 쓸 때 한 번 실행한다(이미 있으면 건너뜀).
export const SCHEMA = [
  `create table if not exists candidates (
    id text primary key,
    name text not null,
    group_name text,
    title text not null,
    height_cm int not null,
    nationality text not null,
    age int not null,
    image_url text not null,
    active boolean not null default true,
    created_at timestamptz not null default now()
  )`,
  // email 은 소문자로 정규화해 저장한다. 나중에 간편로그인을 붙이면 같은 email 로 이 행에 연결한다.
  `create table if not exists players (
    id text primary key,
    email text not null unique,
    name text not null,
    age int not null,
    created_at timestamptz not null default now()
  )`,
  // status: playing(진행 중) / finished(끝까지 마침) / abandoned(새로 시작해서 버린 판)
  // counted: 제외 목록 계산에 쓰는지. '처음부터 다시 하기'를 하면 false 로 바꾼다(우승 기록은 남김).
  `create table if not exists games (
    id text primary key,
    player_id text not null references players(id),
    size int not null,
    entrants text[] not null,
    picks text[] not null default '{}',
    status text not null check (status in ('playing', 'finished', 'abandoned')),
    champion_id text references candidates(id),
    counted boolean not null default true,
    created_at timestamptz not null default now(),
    finished_at timestamptz
  )`,
  // 얼굴 위치(아바타 자르기용, src/lib/face.ts 의 FaceBox). face_checked_at 이 비면 아직 찾아보지 않은 사진
  `alter table candidates add column if not exists face real[]`,
  `alter table candidates add column if not exists face_checked_at timestamptz`,
  // 실제 사진 대신 자리표시(이름 카드)로 올라간 후보. 관리자에서 사진을 바꾸면 false 가 된다
  `alter table candidates add column if not exists photo_pending boolean not null default false`,
  // '나의 최종 1인' 목록에서 지운 판. 목록에서만 빠지고 제외 목록 계산(counted)에는 그대로 쓴다
  `alter table games add column if not exists history_hidden boolean not null default false`,
  // 앱 설정(관리자 비밀번호 해시 등)
  `create table if not exists settings (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now()
  )`,
  `create unique index if not exists games_one_playing on games (player_id) where status = 'playing'`,
  `create index if not exists games_player on games (player_id, status)`,
];

export async function applySchema(db: Db) {
  for (const stmt of SCHEMA) await db.query(stmt);
}
