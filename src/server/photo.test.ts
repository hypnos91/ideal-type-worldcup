import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_SIDE, toWebp } from "./photo";

describe("toWebp", () => {
  it("PNG·JPEG 를 긴 변 1200px 이하 WebP 로 바꾼다", async () => {
    for (const format of ["png", "jpeg"] as const) {
      const src = await sharp({ create: { width: 1800, height: 2400, channels: 3, background: "#f0a" } })[format]().toBuffer();
      const r = await toWebp(src);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const meta = await sharp(r.data).metadata();
      expect(meta.format).toBe("webp");
      expect(Math.max(meta.width!, meta.height!)).toBe(MAX_SIDE);
      expect(r.data.length).toBeLessThan(src.length);
    }
  });
  it("작은 사진은 키우지 않는다", async () => {
    const src = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#0af" } }).png().toBuffer();
    const r = await toWebp(src);
    expect(r.ok && [r.width, r.height]).toEqual([300, 400]);
  });
  it("사진이 아니면 거절", async () => {
    expect((await toWebp(Buffer.from("not an image"))).ok).toBe(false);
  });
});
