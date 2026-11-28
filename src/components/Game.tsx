"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { GameView, PublicCandidate } from "@/lib/api-types";
import { ApiError, api } from "@/lib/client-api";
import { replay, roundLabel, summary, type CurrentMatch } from "@/lib/tournament";
import { CandidateInfo, CandidatePhoto } from "./CandidateCard";

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onDone} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-card">
          ← 내 월드컵
        </button>
        <span className="font-bold">{game.size}강 월드컵</span>
        <button
          onClick={back}
          disabled={!current || picks.length === 0 || !!chosen}
          className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-card disabled:invisible"
        >
          ↶ 되돌리기
        </button>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(picks.length / total) * 100}%` }} />
      </div>

      {save.kind === "error" && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/10 px-4 py-2 text-sm" role="alert">
          <span>{save.message}. 진행은 계속되고, 다음 선택 때 다시 저장해요.</span>
          <button onClick={() => void flush()} className="shrink-0 font-bold text-accent">
            지금 다시 저장
          </button>
        </div>
      )}

      {current ? (
        <Match current={current} byId={byId} chosen={chosen} onChoose={choose} />
      ) : (
        <Result game={game} picks={picks} saving={save.kind !== "idle"} onDone={onDone} />
      )}
    </div>
  );
}

function Match({
  current,
  byId,
  chosen,
  onChoose,
}: {
  current: CurrentMatch;
  byId: Record<string, PublicCandidate>;
  chosen: string | null;
  onChoose: (id: string) => void;
}) {
  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-black sm:text-4xl">{roundLabel(current.roundSize)}</h1>
        {current.totalMatches > 1 && (
          <p className="mt-1 text-muted">
            {current.matchNo} / {current.totalMatches}
          </p>
        )}
      </div>
      <div className="relative grid grid-cols-2 gap-3 sm:gap-6">
        {[current.a, current.b].map((id) => {
          const c = byId[id];
          const state = chosen === null ? "idle" : chosen === id ? "chosen" : "lost";
          const look = {
            idle: "hover:-translate-y-1 hover:shadow-xl",
            chosen: "scale-105 ring-4 ring-accent shadow-xl",
            lost: "scale-95 opacity-30",
          }[state];
          return (
            <button
              key={`${current.roundSize}-${current.matchNo}-${id}`}
              onClick={() => onChoose(id)}
              disabled={state !== "idle"}
              className={`animate-pop flex flex-col overflow-hidden rounded-3xl bg-card shadow-md transition duration-300 ${look}`}
            >
              <CandidatePhoto c={c} className="aspect-[3/4] w-full" />
              <div className="px-2 py-3">
                <CandidateInfo c={c} />
              </div>
            </button>
          );
        })}
        <span className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg px-3 py-2 text-sm font-black text-bg shadow-lg sm:px-4 sm:py-3 sm:text-lg">
          VS
        </span>
      </div>
      <p className="hidden text-center text-xs text-muted sm:block">키보드 ← → 로 고르고 Backspace 로 되돌릴 수 있어요</p>
    </>
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
    <section className="flex flex-col items-center gap-6 text-center">
      <div className="flex w-full flex-col items-center">
        <p className="font-semibold text-accent">🏆 {game.size}강 최종 1인</p>
        <div className="animate-pop mt-3 w-full max-w-xs overflow-hidden rounded-3xl bg-card shadow-xl ring-4 ring-accent">
          <CandidatePhoto c={champion} className="aspect-[3/4] w-full" />
          <div className="px-3 py-4">
            <CandidateInfo c={champion} size="lg" />
          </div>
        </div>
        {second && <p className="mt-3 text-sm text-muted">결승 상대: {second.name}</p>}
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-bold text-muted">우승까지의 길</h2>
        <ol className="flex flex-col gap-1.5">
          {path.map((m) => {
            const loser = game.candidates[m.a === m.winner ? m.b : m.a];
            return (
              <li key={m.roundSize} className="flex items-center justify-between rounded-xl bg-card px-4 py-2 text-sm">
                <span className="font-semibold">{roundLabel(m.roundSize)}</span>
                <span className="truncate text-muted">vs {loser.name}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <button
        onClick={onDone}
        disabled={saving}
        className="w-full max-w-md rounded-2xl bg-accent py-3 font-bold text-white hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "결과 저장 중…" : "내 월드컵으로"}
      </button>
    </section>
  );
}
