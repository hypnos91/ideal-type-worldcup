import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/server/auth";
import { fail, json } from "@/server/http";

// 관리자 화면이 사진을 Blob 에 직접 올릴 수 있게 짧은 업로드 토큰을 내준다.
// 후보 등록은 업로드가 끝난 뒤 화면이 /api/admin/candidates 로 따로 요청한다.
export async function POST(req: NextRequest) {
  const payload = (await req.json()) as HandleUploadBody;
  // 토큰 발급 요청만 관리자 확인. 업로드 완료 알림(Blob 서버가 보냄)은 handleUpload 가 서명을 검증한다.
  if (payload.type === "blob.generate-client-token" && !isAdmin(req)) return fail("관리자 로그인이 필요해요", 401);
  try {
    const result = await handleUpload({
      request: req,
      body: payload,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return json(result);
  } catch (e) {
    return fail((e as Error).message, 400);
  }
}
