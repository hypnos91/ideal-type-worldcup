// 얼굴 위치: [x, y, w, h, aspect] — x·y·w·h 는 사진 크기에 대한 비율(0~1), aspect 는 사진 가로/세로.
export type FaceBox = [number, number, number, number, number];

export function isFaceBox(v: unknown): v is FaceBox {
  if (!Array.isArray(v) || v.length !== 5 || !v.every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  const [x, y, w, h, aspect] = v as number[];
  return x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.0001 && y + h <= 1.0001 && aspect > 0.1 && aspect < 10;
}

/**
 * 얼굴이 가운데 오도록 정사각형으로 자르는 CSS 배경 값. 얼굴 크기의 PADDING 배만큼 여유를 둔다.
 * 얼굴을 못 찾은 사진은 위쪽 가운데(인물 사진에서 얼굴이 흔히 있는 자리)를 쓴다.
 */
const PADDING = 1.8;
export function faceCrop(face: FaceBox | null): { backgroundSize: string; backgroundPosition: string } {
  if (!face) return { backgroundSize: "cover", backgroundPosition: "50% 18%" };
  const [x, y, w, h, aspect] = face;
  // 사진 세로 = 1, 가로 = aspect 인 좌표계
  const side = Math.min(Math.max(w * aspect, h) * PADDING, aspect, 1);
  const cx = (x + w / 2) * aspect;
  const cy = y + h / 2;
  const left = Math.min(Math.max(cx - side / 2, 0), aspect - side);
  const top = Math.min(Math.max(cy - side / 2, 0), 1 - side);
  const pct = (offset: number, room: number) => (room <= 1e-6 ? 50 : (offset / room) * 100);
  return {
    backgroundSize: `${(aspect / side) * 100}% auto`,
    backgroundPosition: `${pct(left, aspect - side).toFixed(1)}% ${pct(top, 1 - side).toFixed(1)}%`,
  };
}
