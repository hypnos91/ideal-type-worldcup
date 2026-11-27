// 이상형 월드컵 대진 로직. 화면과 분리된 순수 함수만 둔다.
// 저장하는 상태는 "처음 대진표(entrants) + 지금까지 고른 순서(picks)" 뿐이고,
// 현재 라운드·대결·우승자는 매번 replay 로 다시 계산한다. 그래서 되돌리기는 picks 에서 하나 빼면 끝난다.

export type Rng = () => number;

export const SIZES = [4, 8, 16, 32] as const;

export interface TournamentState {
  entrants: string[];
  picks: string[];
}

export interface MatchRecord {
  roundSize: number;
  a: string;
  b: string;
  winner: string;
}

export interface CurrentMatch {
  roundSize: number;
  matchNo: number; // 1부터
  totalMatches: number;
  a: string;
  b: string;
}

export interface Progress {
  matches: MatchRecord[];
  current: CurrentMatch | null;
  champion: string | null;
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/** 후보 수로 고를 수 있는 강수 목록. */
export function availableSizes(candidateCount: number): number[] {
  return SIZES.filter((s) => s <= candidateCount);
}

/** 후보 중 size 명을 무작위로 뽑아 섞은 첫 대진표를 만든다. */
export function createTournament(
  candidateIds: readonly string[],
  size: number,
  rng: Rng = Math.random,
): TournamentState {
  if (!isPowerOfTwo(size)) throw new Error(`강수는 2의 거듭제곱이어야 합니다: ${size}`);
  if (new Set(candidateIds).size !== candidateIds.length) throw new Error("후보 id 가 중복됩니다");
  if (candidateIds.length < size) throw new Error(`후보가 ${size}명보다 적습니다`);
  return { entrants: shuffle(candidateIds, rng).slice(0, size), picks: [] };
}

/** entrants 와 picks 를 처음부터 재생해 진행 상황을 계산한다. 잘못된 pick 이 있으면 예외. */
export function replay(state: TournamentState): Progress {
  const matches: MatchRecord[] = [];
  let round = state.entrants;
  let next: string[] = [];
  let i = 0;

  for (const pick of state.picks) {
    if (round.length < 2) throw new Error("이미 우승자가 정해졌습니다");
    const a = round[2 * i];
    const b = round[2 * i + 1];
    if (pick !== a && pick !== b) throw new Error(`대결 후보가 아닙니다: ${pick}`);
    matches.push({ roundSize: round.length, a, b, winner: pick });
    next.push(pick);
    i++;
    if (2 * i === round.length) {
      round = next;
      next = [];
      i = 0;
    }
  }

  if (round.length === 1) return { matches, current: null, champion: round[0] };
  return {
    matches,
    champion: null,
    current: {
      roundSize: round.length,
      matchNo: i + 1,
      totalMatches: round.length / 2,
      a: round[2 * i],
      b: round[2 * i + 1],
    },
  };
}

export function pick(state: TournamentState, winnerId: string): TournamentState {
  const next = { ...state, picks: [...state.picks, winnerId] };
  replay(next); // 잘못된 선택이면 여기서 예외
  return next;
}

export function undo(state: TournamentState): TournamentState {
  return { ...state, picks: state.picks.slice(0, -1) };
}

/** 저장된 값이 지금 후보 목록으로 재생 가능한지 확인한다. 아니면 null. */
export function restore(raw: unknown, candidateIds: readonly string[]): TournamentState | null {
  if (!raw || typeof raw !== "object") return null;
  const { entrants, picks } = raw as Record<string, unknown>;
  if (!Array.isArray(entrants) || !Array.isArray(picks)) return null;
  if (!entrants.every((e) => typeof e === "string") || !picks.every((p) => typeof p === "string")) return null;
  const known = new Set(candidateIds);
  if (!isPowerOfTwo(entrants.length) || !entrants.every((e) => known.has(e))) return null;
  if (new Set(entrants).size !== entrants.length) return null;
  const state = { entrants: entrants as string[], picks: picks as string[] };
  try {
    replay(state);
    return state;
  } catch {
    return null;
  }
}

export function roundLabel(roundSize: number): string {
  if (roundSize === 2) return "결승";
  if (roundSize === 4) return "준결승";
  return `${roundSize}강`;
}

/** 우승자가 이긴 대결들(우승까지의 경로)과 결승 상대. */
export function summary(progress: Progress): { path: MatchRecord[]; runnerUp: string | null } {
  const { champion, matches } = progress;
  if (!champion) return { path: [], runnerUp: null };
  const path = matches.filter((m) => m.winner === champion);
  const final = matches[matches.length - 1];
  return { path, runnerUp: final.a === champion ? final.b : final.a };
}
