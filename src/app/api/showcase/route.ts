import { getDb } from "@/server/db";
import { guarded, json } from "@/server/http";
import { shuffle } from "@/lib/tournament";

// 배경에 깔 후보 사진 주소(표시 중인 후보만, 무작위 최대 48장). 로그인 없이 볼 수 있는 공개 정보다.
export async function GET() {
  return guarded(async () => {
    const db = await getDb();
    const rows = await db.query<{ image_url: string }>(`select image_url from candidates where active`);
    const urls = shuffle(rows.map((r) => r.image_url)).slice(0, 48);
    const res = json({ urls });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res;
  });
}
