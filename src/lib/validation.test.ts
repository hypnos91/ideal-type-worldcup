import { describe, expect, it } from "vitest";
import { parseCandidate, parsePlayer } from "./validation";

describe("parsePlayer", () => {
  it("이메일은 소문자·공백 정리, 나이는 숫자 문자열도 허용", () => {
    expect(parsePlayer({ email: " A@B.com ", name: " 홍  길동 ", age: "30" })).toEqual({
      ok: true,
      value: { email: "a@b.com", name: "홍 길동", age: 30 },
    });
  });
  it("잘못된 값 거절", () => {
    expect(parsePlayer({ email: "ab.com", name: "a", age: 3 }).ok).toBe(false);
    expect(parsePlayer({ email: "a@b.com", name: "", age: 3 }).ok).toBe(false);
    expect(parsePlayer({ email: "a@b.com", name: "a", age: "3.5" }).ok).toBe(false);
  });
});

describe("parseCandidate", () => {
  const ok = { name: "이름", groupName: "", title: "가수", heightCm: "168", nationality: "대한민국", age: 24 };
  it("소속 그룹은 비우면 null", () => {
    const r = parseCandidate(ok);
    expect(r.ok && r.value).toEqual({ name: "이름", groupName: null, title: "가수", heightCm: 168, nationality: "대한민국", age: 24 });
  });
  it("필수 항목이 비면 거절", () => {
    for (const k of ["name", "title", "heightCm", "nationality", "age"]) {
      expect(parseCandidate({ ...ok, [k]: "" }).ok).toBe(false);
    }
  });
});
