import { describe, expect, it } from "vitest";
import { equalsPlain, hashPassword, passwordVersion, verifyPassword } from "./password";

describe("password", () => {
  it("해시·검증", () => {
    const h = hashPassword("correct horse");
    expect(h).toMatch(/^scrypt\$/);
    expect(verifyPassword("correct horse", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(hashPassword("correct horse")).not.toBe(h); // salt 가 매번 다름
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
  it("평문 비교·버전", () => {
    expect(equalsPlain("a", "a")).toBe(true);
    expect(equalsPlain("a", "ab")).toBe(false);
    expect(passwordVersion("a")).not.toBe(passwordVersion("b"));
  });
});
