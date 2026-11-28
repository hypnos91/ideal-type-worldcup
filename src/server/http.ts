import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(error: string, status: number) {
  return json({ error }, status);
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** 예상하지 못한 오류는 기록만 하고 사용자에게는 일반 문구를 준다. */
export async function guarded(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e); // 사전 렌더 중단 같은 Next 내부 신호는 그대로 넘긴다
    console.error(e);
    return fail("잠시 후 다시 시도해 주세요", 500);
  }
}
