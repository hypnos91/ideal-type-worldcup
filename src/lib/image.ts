"use client";

/** 사진 고르기에서 받는 형식: 모든 이미지 + 아이폰 HEIC(브라우저가 MIME 을 비워 보내기도 해서 확장자도 적는다) */
export const PHOTO_ACCEPT = "image/*,.heic,.heif";
const SERVER_MAX_BYTES = 4 * 1024 * 1024; // src/server/photo.ts MAX_INPUT_BYTES 와 같음

export function isPhotoFile(f: File): boolean {
  return f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
}

/** 붙여넣기(클립보드)에 이미지가 있으면 파일로 꺼낸다 */
export function imageFromClipboard(e: ClipboardEvent): File | null {
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) return new File([f], f.name && f.name !== "image.png" ? f.name : `붙여넣은 사진.${f.type.split("/")[1] || "png"}`, { type: f.type });
    }
  }
  return null;
}

export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
}

/**
 * 업로드 전에 긴 변을 1200px 로 줄여 전송량을 줄인다(WebP, 브라우저가 못 만들면 JPEG).
 * 최종 저장 형식은 서버가 정한다 — 서버(src/server/photo.ts)가 항상 WebP 로 다시 변환한다.
 * 브라우저가 열지 못하는 사진(크롬의 HEIC 등)은 그대로 보내 서버가 변환하게 한다.
 */
export async function shrinkImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= SERVER_MAX_BYTES) return file;
    throw new Error("이 브라우저에서 열 수 없는 4MB 넘는 사진이에요. JPG 로 저장해서 올려 주세요.");
  }
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("사진을 변환하지 못했어요");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `candidate.${ext}`, { type: blob.type });
}
