import { describe, expect, it } from "vitest";
import {
  availableSizes,
  createTournament,
  pick,
  replay,
  restore,
  roundLabel,
  shuffle,
  summary,
  undo,
} from "./tournament";

// 결정적인 난수(테스트 재현용)
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);

/** 매번 왼쪽(a)을 고르며 끝까지 진행 */
function playLeft(size: number) {
  let state = createTournament(ids, size, seeded(1));
  for (;;) {
    const { current } = replay(state);
    if (!current) return state;
    state = pick(state, current.a);
  }
}

describe("shuffle", () => {
  it("원소를 잃거나 바꾸지 않고 원본도 건드리지 않는다", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, seeded(7));
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("createTournament", () => {
  it("size 명을 중복 없이 뽑는다", () => {
    const t = createTournament(ids, 16, seeded(3));
    expect(t.entrants).toHaveLength(16);
    expect(new Set(t.entrants).size).toBe(16);
    expect(t.picks).toEqual([]);
  });

  it("2의 거듭제곱이 아니거나 후보가 모자라면 거절한다", () => {
    expect(() => createTournament(ids, 12)).toThrow();
    expect(() => createTournament(ids, 32)).toThrow();
    expect(() => createTournament(["a", "a"], 2)).toThrow();
  });
});

describe("replay / pick", () => {
  it("128강은 127번 고르면 우승자가 나온다", () => {
    const many = Array.from({ length: 150 }, (_, i) => `p${i}`);
    let state = createTournament(many, 128, seeded(11));
    for (;;) {
      const { current } = replay(state);
      if (!current) break;
      state = pick(state, current.b);
    }
    expect(state.picks).toHaveLength(127);
    expect(replay(state).matches.map((m) => m.roundSize).filter((v, i, a) => a.indexOf(v) === i)).toEqual([
      128, 64, 32, 16, 8, 4, 2,
    ]);
  });

  it("16강은 15번 고르면 우승자가 나온다", () => {
    const state = playLeft(16);
    expect(state.picks).toHaveLength(15);
    const p = replay(state);
    expect(p.current).toBeNull();
    expect(p.champion).toBe(state.picks[14]);
  });

  it("라운드와 대결 번호를 계산한다", () => {
    let s = createTournament(ids, 8, seeded(5));
    expect(replay(s).current).toMatchObject({ roundSize: 8, matchNo: 1, totalMatches: 4 });
    expect(replay(s).current!.next).toEqual([s.entrants[2], s.entrants[3]]);
    for (let i = 0; i < 4; i++) s = pick(s, replay(s).current!.b);
    expect(replay(s).current).toMatchObject({ roundSize: 4, matchNo: 1, totalMatches: 2 });
    // 다음 라운드는 이긴 순서대로 짝을 짓는다
    expect(replay(s).current!.a).toBe(s.picks[0]);
    expect(replay(s).current!.b).toBe(s.picks[1]);
  });

  it("대결에 없는 후보는 고를 수 없다", () => {
    const s = createTournament(ids, 4, seeded(9));
    const outsider = s.entrants[3];
    expect(() => pick(s, outsider)).toThrow();
  });

  it("되돌리기는 마지막 선택만 취소한다", () => {
    const s = createTournament(ids, 4, seeded(2));
    const a = replay(s).current!.a;
    const s1 = pick(s, a);
    expect(undo(s1)).toEqual(s);
    expect(undo(s)).toEqual(s);
  });
});

describe("restore", () => {
  it("유효한 저장값만 복원한다", () => {
    const fresh = createTournament(ids, 4, seeded(4));
    const s = pick(fresh, replay(fresh).current!.a);
    expect(restore(JSON.parse(JSON.stringify(s)), ids)).toEqual(s);
    expect(restore(null, ids)).toBeNull();
    expect(restore({ entrants: ["c0", "c1", "c2"], picks: [] }, ids)).toBeNull();
    expect(restore({ entrants: ["c0", "zz"], picks: [] }, ids)).toBeNull();
    expect(restore({ entrants: ["c0", "c1"], picks: ["c5"] }, ids)).toBeNull();
  });
});

describe("summary / roundLabel", () => {
  it("우승 경로와 결승 상대를 돌려준다", () => {
    const state = playLeft(8);
    const p = replay(state);
    const { path, runnerUp } = summary(p);
    expect(path).toHaveLength(3);
    expect(path.every((m) => m.winner === p.champion)).toBe(true);
    expect(runnerUp).not.toBe(p.champion);
    expect(p.matches.at(-1)!.roundSize).toBe(2);
  });

  it("라운드 이름", () => {
    expect(roundLabel(2)).toBe("결승");
    expect(roundLabel(4)).toBe("준결승 (4강)");
    expect(roundLabel(128)).toBe("128강");
    expect(roundLabel(16)).toBe("16강");
  });

  it("강수 목록", () => {
    expect(availableSizes(200)).toEqual([32, 64, 128]);
    expect(availableSizes(100)).toEqual([32, 64]);
    expect(availableSizes(31)).toEqual([]);
  });
});
