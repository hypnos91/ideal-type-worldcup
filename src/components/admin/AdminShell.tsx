"use client";

// 관리자 레이아웃 — 회색 셸(상단 바 + 좌측 사이드바) 위에 흰 본문 카드. 스크롤은 본문 카드 안에서만 생긴다.
// (그랜터 디자인 시스템 /design-system 레이아웃과 같은 구조, 2026-11-28 사용자 지시)
import { ArrowSquareOut, SignOut, Trophy } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/client-api";
import { Button, Field, Notice, inputClass, cn } from "./ui";

const NAV = [
  {
    title: "후보",
    items: [
      { href: "/admin", label: "후보 목록" },
      { href: "/admin/upload", label: "후보 올리기" },
    ],
  },
  {
    title: "설정",
    items: [{ href: "/admin/settings", label: "비밀번호 변경" }],
  },
];

const AdminContext = createContext<{ onApiError: (e: unknown) => string }>({ onApiError: () => "" });

/** API 오류를 화면 문구로 바꾼다. 관리자 세션이 끝났으면 로그인 화면으로 돌린다. */
export function useAdminApiError() {
  return useContext(AdminContext).onApiError;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ admin: boolean }>("/api/admin/session")
      .then((r) => setAuthed(r.admin))
      .catch(() => setAuthed(false));
  }, []);

  const onApiError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) setAuthed(false);
    return e instanceof Error ? e.message : "처리하지 못했어요";
  }, []);

  const logout = async () => {
    await api("/api/admin/session", { method: "DELETE" }).catch(() => null);
    setAuthed(false);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 pr-3 pl-4 md:pl-6">
        <Link href="/admin" className="flex items-center gap-2">
          <Trophy weight="fill" className="size-5" />
          <span className="font-semibold whitespace-nowrap">이상형 월드컵</span>
          <span className="hidden text-sm text-neutral-500 sm:inline">관리자</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            aria-label="사용자 화면"
            title="사용자 화면"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ArrowSquareOut className="size-4" />
            <span className="hidden sm:inline">사용자 화면</span>
          </Link>
          {authed && (
            <button
              onClick={() => void logout()}
              aria-label="로그아웃"
              title="로그아웃"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              <SignOut className="size-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 pr-3 pb-3 pl-4 md:pl-6">
        <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto md:flex">
          <nav className="flex flex-col gap-1 pr-2 pb-6">
            {NAV.map((group) => (
              <div key={group.title} className="flex flex-col">
                <span className="px-2 py-2 text-sm text-neutral-500">{group.title}</span>
                <ul className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-neutral-200 py-0.5 pl-2 dark:border-neutral-800">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href} className="relative">
                        {active && <span aria-hidden className="absolute top-1 bottom-1 -left-[9px] w-px bg-neutral-900 dark:bg-neutral-50" />}
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-white font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                              : "text-neutral-500 hover:bg-white/60 hover:text-neutral-900 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-50",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {/* 모바일: 카드 상단 가로 메뉴 */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-200 p-2 md:hidden dark:border-neutral-800">
            {NAV.flatMap((g) => g.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                  pathname === item.href ? "bg-neutral-100 dark:bg-neutral-800" : "text-neutral-500",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
              {authed === null ? (
                <p className="text-sm text-neutral-500">확인 중…</p>
              ) : authed ? (
                <AdminContext.Provider value={{ onApiError }}>{children}</AdminContext.Provider>
              ) : (
                <Login onDone={() => setAuthed(true)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-4 py-16"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/admin/session", { method: "POST", body: { password } });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "로그인하지 못했어요");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-2xl font-semibold">관리자 로그인</h1>
      <Field label="비밀번호">
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={busy || !password}>
        들어가기
      </Button>
    </form>
  );
}
