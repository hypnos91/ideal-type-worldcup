import sharp, { type Metadata } from "sharp";

// 후보 사진은 항상 WebP 로 저장한다(2026-11-28 사용자 지시: "사진은 항상 webP 규격으로 압축").
// 브라우저가 WebP 를 못 만들어도(구형 Safari 등) 서버가 여기서 다시 변환하므로 저장소에는 WebP 만 들어간다.
export const MAX_SIDE = 1200;
export const WEBP_QUALITY = 82;
export const MAX_INPUT_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 본문 한도(4.5MB) 아래
const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);

export type ToWebpResult = { ok: true; data: Buffer; width: number; height: number } | { ok: false; error: string };

export async function toWebp(input: Buffer): Promise<ToWebpResult> {
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return { ok: false, error: "사진 파일을 읽지 못했어요" };
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) return { ok: false, error: "jpg·png·webp 사진만 올릴 수 있어요" };
  const { data, info } = await sharp(input, { animated: false })
    .rotate() // EXIF 방향대로 세운 뒤
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { ok: true, data, width: info.width, height: info.height };
}
