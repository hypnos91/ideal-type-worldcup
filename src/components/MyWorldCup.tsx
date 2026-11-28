"use client";

import { X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { GameView, MeResponse } from "@/lib/api-types";
import { ApiError, api } from "@/lib/client-api";
import { SIZES, replay, roundLabel } from "@/lib/tournament";
import { CandidateInfo, CandidatePhoto } from "./CandidateCard";
import Game from "./Game";

export default function MyWorldCup() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<GameView | null>(null);
  const [busy, setBusy] = useState(false);

  const onLoadError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) router.replace("/");
      else setError(e instanceof Error ? e.message : "불러오지 못했어요");
    },
    [router],
  );

  const load = useCallback(async () => {
    try {
      setMe(await api<MeResponse>("/api/me"));
      setError(null);
    } catch (e) {
      onLoadError(e);
    }
  }, [onLoadError]);

  // 첫 불러오기. 화면을 떠난 뒤 도착한 응답은 버린다.
  useEffect(() => {
    let alive = true;
    api<MeResponse>("/api/me").then(
      (data) => alive && setMe(data),
      (e) => alive && onLoadError(e),
    );
    return () => {
      alive = false;
    };
  }, [onLoadError]);

  const start = async (size: number) => {
    if (me?.playing && !window.confirm("진행 중인 월드컵은 사라지고 새로 시작해요. 계속할까요?")) return;
    setBusy(true);
    try {
      setPlaying(await api<GameView>("/api/games", { method: "POST", body: { size } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "시작하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("본 후보 기록을 비우고 처음부터 다시 볼까요? 우승 기록은 남아요.")) return;
    setBusy(true);
    try {
      await api("/api/reset", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const [removing, setRemoving] = useState<string | null>(null);
  /** '나의 최종 1인' 기록 지우기. 그 판에 나온 후보도 다시 볼 수 있게 되므로 남은 후보 수를 다시 불러온다 */
  const removeHistory = async (gameId: string, name: string, size: number) => {
    if (!window.confirm(`${name} 기록을 지울까요? 이 ${size}강에 나온 후보들이 다시 나와요.`)) return;
    setRemoving(gameId);
    try {
      await api("/api/history", { method: "DELETE", body: { gameId } });
      setMe((m) => (m ? { ...m, history: m.history.filter((h) => h.gameId !== gameId) } : m));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "지우지 못했어요");
    } finally {
      setRemoving(null);
    }
  };

  const logout = async () => {
    await api("/api/session", { method: "DELETE" }).catch(() => null);
    router.replace("/");
  };

  if (playing) {
    return (
      <Game
        key={playing.id}
        game={playing}
        onDone={() => {
          // 방금 끝낸 판이 반영된 숫자만 보이도록, 새로 불러올 때까지 이전 화면 데이터를 지운다
          setMe(null);
          setPlaying(null);
          void load();
        }}
      />
    );
  }

  if (!me) {
    return (
      <Shell>
        <p className="py-20 text-center text-muted" role="status">
          {error ?? "불러오는 중…"}
        </p>
        {error && (
          <button onClick={() => void load()} className="mx-auto rounded-full bg-white/[.06] px-5 py-2 font-semibold">
            다시 시도
          </button>
        )}
      </Shell>
    );
  }

  const ongoing = me.playing ? replay({ entrants: me.playing.entrants, picks: me.playing.picks }).current : null;

  return (
    <Shell>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{me.player.name}님의 이상형 월드컵</h1>
          <p className="mt-1 text-sm text-muted">{me.player.email}</p>
        </div>
        <button
          onClick={logout}
          aria-label="나가기"
          title="나가기"
          className="-mt-1 -mr-1 shrink-0 rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-fg"
        >
          <X className="size-5" weight="bold" />
        </button>
      </header>

      {error && (
        <p className="rounded-xl bg-accent/10 px-4 py-2 text-sm" role="alert">
          {error}
        </p>
      )}

      {me.playing && ongoing && (
        <button
          onClick={() => setPlaying(me.playing)}
          className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-left transition hover:bg-accent/15"
        >
          <span>
            <span className="block text-sm text-muted">진행 중인 월드컵</span>
            <span className="font-bold">
              {me.playing.size}강 · {roundLabel(ongoing.roundSize)} {ongoing.matchNo}/{ongoing.totalMatches}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">이어하기</span>
        </button>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">새 월드컵</h2>
          <span className="text-sm text-muted">아직 안 본 후보 {me.remaining}명</span>
        </div>
        {me.sizes.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => {
              const ok = me.sizes.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => void start(s)}
                  disabled={!ok || busy}
                  className="rounded-2xl bg-white/[.06] py-4 font-black shadow-sm transition hover:bg-accent hover:text-white disabled:opacity-40 disabled:hover:bg-white/[.06] disabled:hover:text-fg"
                >
                  {s}강
                  {!ok && <span className="block text-[11px] font-normal">후보 부족</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[.06] p-5 text-center">
            <p className="font-bold">모든 후보를 다 봤어요 👀</p>
            <button
              onClick={() => void reset()}
              disabled={busy}
              className="mt-4 rounded-full bg-accent px-5 py-2 font-bold text-white disabled:opacity-50"
            >
              처음부터 다시 하기
            </button>
          </div>
        )}
      </section>

      {/* 끝까지 마친 월드컵이 없으면 이 칸은 아예 보이지 않는다(2026-11-28 사용자 지시) */}
      {me.history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">나의 최종 1인</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {me.history.map((h) => (
              <li key={h.gameId} className={`relative overflow-hidden rounded-2xl bg-white/[.06] shadow-sm transition ${removing === h.gameId ? "opacity-40" : ""}`}>
                <button
                  onClick={() => void removeHistory(h.gameId, h.champion.name, h.size)}
                  disabled={removing === h.gameId}
                  aria-label={`${h.champion.name} 기록 지우기`}
                  title="기록 지우기"
                  className="absolute top-2 right-2 z-10 rounded-full bg-black/55 p-1.5 text-white/90 backdrop-blur transition hover:bg-black/75 hover:text-white"
                >
                  <X className="size-3.5" weight="bold" />
                </button>
                <CandidatePhoto c={h.champion} className="aspect-[3/4] w-full" />
                <div className="flex flex-col gap-1 px-2 py-3">
                  <CandidateInfo c={h.champion} size="sm" />
                  <span className="text-center text-[11px] text-muted">
                    {h.size}강 · {new Date(h.finishedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

/** 사진 배경 위의 카드 패널 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 sm:py-10">
      <div className="animate-pop flex flex-col gap-6 rounded-3xl border border-white/10 bg-card/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
        {children}
      </div>
    </main>
  );
}
