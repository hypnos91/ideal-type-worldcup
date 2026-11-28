import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { fail, guarded, json } from "@/server/http";
import { detectFace } from "@/server/face";
import { MAX_INPUT_BYTES, toWebp } from "@/server/photo";

/** 후보 사진 올리기(multipart, 필드 이름 file). 서버에서 WebP 로 바꿔 Blob 에 저장하고, 얼굴 위치와 함께 주소를 돌려준다. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!(await isAdmin(req, await getDb()))) return fail("관리자 로그인이 필요해요", 401);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail("사진 파일이 없어요", 400);
    if (file.size > MAX_INPUT_BYTES) return fail("사진이 너무 커요(4MB 이하)", 413);
    const converted = await toWebp(Buffer.from(await file.arrayBuffer()));
    if (!converted.ok) return fail(converted.error, 400);
    const face = await detectFace(converted.data);
    const blob = await put(`candidates/${crypto.randomUUID()}.webp`, converted.data, {
      access: "public",
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 365, // 주소가 매번 새로 생기므로 오래 캐시해도 된다
    });
    return json(
      { url: blob.url, face, width: converted.width, height: converted.height, bytes: converted.data.length, inputBytes: file.size },
      201,
    );
  });
}
