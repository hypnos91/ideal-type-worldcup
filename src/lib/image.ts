"use client";

/** 업로드 전에 긴 변을 1200px 로 줄이고 WebP(안 되면 JPEG)로 바꾼다. 128강 사진 로딩을 가볍게 하기 위해서다. */
export async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("사진을 변환하지 못했어요");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `candidate.${ext}`, { type: blob.type });
}
