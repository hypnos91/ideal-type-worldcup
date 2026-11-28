import sharp, { type Metadata, type Sharp } from "sharp";
import decodeHeic from "heic-decode";

// 후보 사진은 항상 WebP 로 저장한다(2026-11-28 사용자 지시: "사진은 항상 webP 규격으로 압축").
// 브라우저가 WebP 를 못 만들어도(구형 Safari 등) 서버가 여기서 다시 변환하므로 저장소에는 WebP 만 들어간다.
export const MAX_SIDE = 1200;
export const WEBP_QUALITY = 82;
export const MAX_INPUT_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 본문 한도(4.5MB) 아래
const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);
// 아이폰 사진(HEIC)의 HEVC 압축은 sharp 기본 빌드가 풀지 못해(라이선스 문제로 libde265 없음) heic-decode(wasm)로 먼저 푼다
const HEVC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

export function isHevcHeif(input: Buffer): boolean {
  return input.length > 12 && input.toString("ascii", 4, 8) === "ftyp" && HEVC_BRANDS.has(input.toString("ascii", 8, 12));
}

/** 사진을 읽어 방향을 바로 세운 sharp 파이프라인. 읽을 수 없으면 오류 문구. */
async function open(input: Buffer): Promise<Sharp | string> {
  if (isHevcHeif(input)) {
    try {
      const { width, height, data } = await decodeHeic({ buffer: new Uint8Array(input) });
      return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } });
    } catch {
      return "HEIC 사진을 읽지 못했어요";
    }
  }
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return "사진 파일을 읽지 못했어요";
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) return "jpg·png·webp·heic 사진만 올릴 수 있어요";
  return sharp(input, { animated: false }).rotate(); // EXIF 방향대로 세운다
}

export type ToWebpResult = { ok: true; data: Buffer; width: number; height: number } | { ok: false; error: string };

export async function toWebp(input: Buffer): Promise<ToWebpResult> {
  const image = await open(input);
  if (typeof image === "string") return { ok: false, error: image };
  const { data, info } = await image
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { ok: true, data, width: info.width, height: info.height };
}
