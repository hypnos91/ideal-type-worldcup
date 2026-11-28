import { describe, expect, it } from "vitest";
import { faceCrop, facePosition, isFaceBox } from "./face";

describe("isFaceBox", () => {
  it("범위 확인", () => {
    expect(isFaceBox([0.3, 0.2, 0.4, 0.3, 0.75])).toBe(true);
    expect(isFaceBox([0.8, 0.2, 0.4, 0.3, 0.75])).toBe(false);
    expect(isFaceBox([0.3, 0.2, 0.4, 0.3])).toBe(false);
    expect(isFaceBox("x")).toBe(false);
  });
});

describe("facePosition", () => {
  it("얼굴 중심(살짝 위) 비율을 그대로 쓴다", () => {
    expect(facePosition([0.3, 0.1, 0.4, 0.2, 0.75])).toBe("50.0% 18.0%");
  });
  it("얼굴이 없으면 위쪽 가운데", () => {
    expect(facePosition(null)).toBe("50% 25%");
  });
  it("0~100% 를 넘지 않는다", () => {
    expect(facePosition([0.9, 0.95, 0.1, 0.05, 1])).toBe("95.0% 97.0%");
  });
});

describe("faceCrop", () => {
  it("얼굴이 없으면 위쪽 가운데", () => {
    expect(faceCrop(null)).toEqual({ backgroundSize: "cover", backgroundPosition: "50% 18%" });
  });
  it("세로 사진 가운데 얼굴 → 가로 가운데, 확대", () => {
    const c = faceCrop([0.4, 0.2, 0.2, 0.15, 0.75]);
    expect(c.backgroundPosition.startsWith("50.0%")).toBe(true);
    expect(parseFloat(c.backgroundSize)).toBeGreaterThan(100);
  });
  it("가장자리 얼굴은 사진 밖으로 나가지 않게 0%/100% 로 붙는다", () => {
    expect(faceCrop([0, 0, 0.1, 0.1, 0.75]).backgroundPosition).toBe("0.0% 0.0%");
    expect(faceCrop([0.9, 0.9, 0.1, 0.1, 0.75]).backgroundPosition).toBe("100.0% 100.0%");
  });
  it("얼굴이 아주 크면 사진 전체 폭까지만", () => {
    expect(faceCrop([0, 0, 1, 1, 0.75]).backgroundSize).toBe("100% auto");
  });
});
