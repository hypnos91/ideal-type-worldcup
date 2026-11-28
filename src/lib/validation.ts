// 입력값 정규화·검증. 화면과 서버가 같은 규칙을 쓴다.

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface PlayerInput {
  email: string;
  name: string;
  age: number;
}

export interface CandidateInput {
  name: string;
  groupName: string | null;
  title: string;
  heightCm: number;
  nationality: string;
  age: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

function int(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : NaN;
}

export function parsePlayer(raw: unknown): Result<PlayerInput> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const email = text(r.email).toLowerCase();
  const name = text(r.name);
  const age = int(r.age);
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: "이메일 형식을 확인해 주세요" };
  if (!name || name.length > 30) return { ok: false, error: "이름을 1~30자로 입력해 주세요" };
  if (!(age >= 1 && age <= 120)) return { ok: false, error: "나이를 숫자로 입력해 주세요" };
  return { ok: true, value: { email, name, age } };
}

export function parseCandidate(raw: unknown): Result<CandidateInput> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = text(r.name);
  const groupName = text(r.groupName) || null;
  const title = text(r.title);
  const nationality = text(r.nationality);
  const heightCm = int(r.heightCm);
  const age = int(r.age);
  if (!name || name.length > 40) return { ok: false, error: "이름을 1~40자로 입력해 주세요" };
  if (groupName && groupName.length > 40) return { ok: false, error: "소속 그룹은 40자 이내로 입력해 주세요" };
  if (!title || title.length > 40) return { ok: false, error: "타이틀을 1~40자로 입력해 주세요" };
  if (!(heightCm >= 100 && heightCm <= 250)) return { ok: false, error: "키를 cm 단위 숫자(100~250)로 입력해 주세요" };
  if (!nationality || nationality.length > 30) return { ok: false, error: "국적을 1~30자로 입력해 주세요" };
  if (!(age >= 1 && age <= 120)) return { ok: false, error: "나이를 숫자로 입력해 주세요" };
  return { ok: true, value: { name, groupName, title, heightCm, nationality, age } };
}
