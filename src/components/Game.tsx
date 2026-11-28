"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { GameView, PublicCandidate } from "@/lib/api-types";
import { ApiError, api } from "@/lib/client-api";
import { replay, roundLabel, summary, type CurrentMatch } from "@/lib/tournament";
import { CandidateInfo, CandidatePhoto, FaceAvatar } from "./CandidateCard";
import EmojiBurst from "./EmojiBurst";

const PICK_DELAY_MS = 380;

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string };

/**
 * 대결 진행 화면. 고를 때마다 화면을 먼저 넘기고, 선택 기록 전체를 서버에 저장한다.
 * 저장은 순서대로 한 번에 하나씩 하며, 실패하면 다음 저장(또는 재시도)이 최신 기록으로 덮어쓴다.
 */
export default function Game({ game, onDone }: { game: GameView; onDone: () => void }) {
  const [picks, setPicks] = useState(game.picks);
  const [chosen, setChosen] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const latest = useRef(game.picks);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = replay({ entrants: game.entrants, picks });
  const current = progress.current;
  const byId = game.candidates;

  const flush = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSave({ kind: "saving" });
    try {
      for (;;) {
        const sending = latest.current;
        await api("/api/games", { method: "PUT", body: { gameId: game.id, picks: sending } });
        if (latest.current === sending) break; // 그사이 새 선택이 없으면 끝
      }
      setSave({ kind: "idle" });
    } catch (e) {
      setSave({ kind: "error", message: e instanceof ApiError ? e.message : "저장하지 못했어요" });
    } finally {
      inFlight.current = false;
    }
  };

  const commit = (next: string[]) => {
    latest.current = next;
    setPicks(next);
    void flush();
  };

  const choose = (id: string) => {
    if (chosen || !current) return;
    setChosen(id);
    timer.current = setTimeout(() => {
      setChosen(null);
      commit([...latest.current, id]);
    }, PICK_DELAY_MS);
  };

  const back = () => {
    if (chosen || latest.current.length === 0 || !current) return;
    commit(latest.current.slice(0, -1));
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // 키보드: ← 왼쪽, → 오른쪽, Backspace 되돌리기
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "Backspace") back();
    if (!current) return;
    if (e.key === "ArrowLeft") choose(current.a);
    if (e.key === "ArrowRight") choose(current.b);
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // 다음 대결 사진을 미리 받아 둔다
  useEffect(() => {
    for (const id of current?.next ?? []) {
      const url = byId[id]?.imageUrl;
      if (url) new Image().src = url;
    }
  }, [current?.next, byId]);

  const total = game.entrants.length - 1;
  const saveError =
    save.kind === "error" ? (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/90 px-4 py-2 text-sm text-white shadow-lg" role="alert">
        <span>{save.message}. 진행은 계속되고, 다음 선택 때 다시 저장해요.</span>
        <button onClick={() => void flush()} className="shrink-0 font-bold underline">
          지금 다시 저장
        </button>
      </div>
    ) : null;

  if (current) {
    return (
      <FullscreenMatch
        current={current}
        byId={byId}
        chosen={chosen}
        onChoose={choose}
        progress={picks.length / total}
        canUndo={picks.length > 0 && !chosen}
        onUndo={back}
        onExit={onDone}
        notice={saveError}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:py-10">
      <div className="animate-pop flex flex-col gap-5 rounded-3xl border border-white/10 bg-card/80 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
        {saveError}
        <Result game={game} picks={picks} saving={save.kind !== "idle"} onDone={onDone} />
      </div>
    </main>
  );
}

/**
 * 대결 화면: 화면 전체를 같은 비율로 나눠 두 후보 사진을 꽉 채운다(2026-11-28 사용자 지시).
 * 모바일(세로 화면)은 위아래, sm(640px) 이상은 좌우로 나눈다.
 * 사진은 칸을 덮도록 잘리고(object-cover), 정보는 아래쪽 그라데이션 위에 얹는다.
 */
function FullscreenMatch({
  current,
  byId,
  chosen,
  onChoose,
  progress,
  canUndo,
  onUndo,
  onExit,
  notice,
}: {
  current: CurrentMatch;
  byId: Record<string, PublicCandidate>;
  chosen: string | null;
  onChoose: (id: string) => void;
  progress: number;
  canUndo: boolean;
  onUndo: () => void;
  onExit: () => void;
  notice: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 grid grid-rows-2 gap-0.5 bg-black text-white select-none sm:grid-cols-2 sm:grid-rows-1">
      {[current.a, current.b].map((id) => {
        const c = byId[id];
        const state = chosen === null ? "idle" : chosen === id ? "chosen" : "lost";
        return (
          <button
            key={`${current.roundSize}-${current.matchNo}-${id}`}
            onClick={() => onChoose(id)}
            disabled={state !== "idle"}
            aria-label={`${c.name} 선택`}
            className="group relative h-full min-h-0 min-w-0 overflow-hidden"
          >
            <CandidatePhoto
              c={c}
              className={`animate-pop absolute inset-0 size-full transition duration-300 ${
                state === "lost" ? "scale-95 opacity-25 grayscale" : state === "chosen" ? "scale-105" : "group-hover:scale-[1.02]"
              }`}
            />
            {state === "chosen" && <span aria-hidden className="absolute inset-0 ring-8 ring-accent ring-inset" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pt-20 pb-4 sm:pt-32 sm:pb-10">
              <CandidateInfo c={c} size="xl" onPhoto />
            </div>
          </button>
        );
      })}

      {/* 위쪽: 진행 막대 · 나가기 · 라운드 · 되돌리기 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent pb-10">
        <div className="h-1 bg-white/20" aria-hidden>
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={onExit} className="pointer-events-auto justify-self-start rounded-full px-3 py-1.5 text-sm text-white/90 hover:bg-white/15">
            ← 나가기
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black drop-shadow sm:text-3xl">{roundLabel(current.roundSize)}</h1>
            {current.totalMatches > 1 && (
              <p className="text-xs text-white/80 sm:text-sm">
                {current.matchNo} / {current.totalMatches}
              </p>
            )}
          </div>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="pointer-events-auto justify-self-end rounded-full px-3 py-1.5 text-sm text-white/90 hover:bg-white/15 disabled:invisible"
          >
            ↶ 되돌리기
          </button>
        </div>
        {notice && <div className="pointer-events-auto mx-auto mt-2 w-fit max-w-[92%]">{notice}</div>}
      </div>

      <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-base font-black text-black shadow-xl sm:px-5 sm:py-4 sm:text-2xl">
        VS
      </span>
    </div>
  );
}

function Result({
  game,
  picks,
  saving,
  onDone,
}: {
  game: GameView;
  picks: string[];
  saving: boolean;
  onDone: () => void;
}) {
  const progress = replay({ entrants: game.entrants, picks });
  const { path, runnerUp } = summary(progress);
  const champion = game.candidates[progress.champion!];
  const second = runnerUp ? game.candidates[runnerUp] : undefined;

  return (
    // 우승 카드·결승 상대·우승까지의 길·버튼을 모두 같은 폭으로(2026-11-28 사용자 지시)
    <section className="flex w-full flex-col gap-5">
      <p className="text-center font-semibold text-accent">🏆 {game.size}강 최종 1인</p>
      <EmojiBurst>
        <div className="animate-pop w-full overflow-hidden rounded-3xl bg-white/[.06] shadow-xl ring-4 ring-accent">
          <CandidatePhoto c={champion} className="aspect-[4/5] w-full" />
          <div className="px-3 py-4">
            <CandidateInfo c={champion} size="lg" />
          </div>
        </div>
      </EmojiBurst>

      {second && (
        <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/[.06] px-4 py-2.5 text-sm">
          <span className="font-semibold">결승 상대</span>
          <span className="flex min-w-0 items-center gap-2">
            <FaceAvatar c={second} size={28} />
            <span className="truncate">{second.name}</span>
          </span>
        </div>
      )}

      <div className="w-full">
        <h2 className="mb-2 text-sm font-bold text-muted">우승까지의 길</h2>
        <ol className="flex flex-col gap-1.5">
          {path.map((m) => {
            const loser = game.candidates[m.a === m.winner ? m.b : m.a];
            return (
              <li key={m.roundSize} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.06] px-4 py-2 text-sm">
                <span className="shrink-0 font-semibold">{roundLabel(m.roundSize)}</span>
                <span className="flex min-w-0 items-center gap-2 text-muted">
                  <span className="shrink-0">vs</span>
                  <FaceAvatar c={loser} size={28} />
                  <span className="truncate text-fg">{loser.name}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        onClick={onDone}
        disabled={saving}
        className="w-full rounded-2xl bg-accent py-3 font-bold text-white hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "결과 저장 중…" : "내 월드컵으로"}
      </button>
    </section>
  );
}
