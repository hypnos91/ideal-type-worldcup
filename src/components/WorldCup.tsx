"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { TOPICS, findTopic, type Candidate, type Topic } from "@/data/topics";
import { setGame, useSavedGame, type SavedGame } from "@/lib/savedGame";
import {
  availableSizes,
  createTournament,
  pick,
  replay,
  roundLabel,
  summary,
  undo,
  type CurrentMatch,
} from "@/lib/tournament";

const PICK_DELAY_MS = 380;

export default function WorldCup() {
  const game = useSavedGame();
  // 저장된 게임이 있어도 바로 들어가지 않고 시작 화면에서 '이어하기'를 고르게 한다
  const [playing, setPlaying] = useState(false);
  const topic = game ? findTopic(game.topicId) : undefined;

  if (playing && game && topic) {
    return <Game game={game} topic={topic} onExit={() => setPlaying(false)} />;
  }
  return (
    <Home
      saved={game && topic ? { game, topic } : null}
      onResume={() => setPlaying(true)}
      onStart={(t, size) => {
        setGame({ topicId: t.id, state: createTournament(t.candidates.map((c) => c.id), size) });
        setPlaying(true);
      }}
    />
  );
}

/* ───────────── 시작 화면 ───────────── */

function Home({
  saved,
  onResume,
  onStart,
}: {
  saved: { game: SavedGame; topic: Topic } | null;
  onResume: () => void;
  onStart: (topic: Topic, size: number) => void;
}) {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const topic = findTopic(topicId) ?? TOPICS[0];
  const sizes = availableSizes(topic.candidates.length);
  const [size, setSize] = useState(16);
  const chosenSize = sizes.includes(size) ? size : sizes[sizes.length - 1];
  const savedProgress = saved ? replay(saved.game.state) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="text-center">
        <p className="text-sm font-semibold tracking-widest text-accent">IDEAL TYPE WORLD CUP</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">이상형 월드컵</h1>
        <p className="mt-2 text-muted">둘 중 하나만 고르세요. 마지막까지 남는 하나가 당신의 이상형입니다.</p>
      </header>

      {saved && savedProgress && (
        <button
          onClick={onResume}
          className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-left transition hover:bg-accent/15"
        >
          <span>
            <span className="block text-sm text-muted">진행 중인 게임</span>
            <span className="font-bold">
              {saved.topic.emoji} {saved.topic.title} ·{" "}
              {savedProgress.champion
                ? "결과 보기"
                : `${roundLabel(savedProgress.current!.roundSize)} ${savedProgress.current!.matchNo}/${savedProgress.current!.totalMatches}`}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">이어하기</span>
        </button>
      )}

      <section>
        <h2 className="mb-3 font-bold">주제</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TOPICS.map((t) => {
            const selected = t.id === topic.id;
            return (
              <button
                key={t.id}
                onClick={() => setTopicId(t.id)}
                aria-pressed={selected}
                className={`rounded-2xl border-2 bg-card p-4 text-left transition ${
                  selected ? "border-accent shadow-lg shadow-accent/10" : "border-transparent hover:border-line"
                }`}
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="mt-2 block font-bold">{t.title}</span>
                <span className="block text-sm text-muted">{t.description}</span>
                <span className="mt-1 block text-xs text-muted">후보 {t.candidates.length}개</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">강수</h2>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              aria-pressed={s === chosenSize}
              className={`rounded-full px-5 py-2 font-semibold transition ${
                s === chosenSize ? "bg-fg text-bg" : "bg-card hover:bg-line"
              }`}
            >
              {s}강
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => onStart(topic, chosenSize)}
        className="rounded-2xl bg-accent py-4 text-lg font-black text-white shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-[0.99]"
      >
        {topic.title} {chosenSize}강 시작
      </button>
      {saved && <p className="-mt-5 text-center text-xs text-muted">새로 시작하면 진행 중인 게임은 사라집니다.</p>}
    </main>
  );
}

/* ───────────── 대결·결과 화면 ───────────── */

function Game({ game, topic, onExit }: { game: SavedGame; topic: Topic; onExit: () => void }) {
  const byId = useMemo(() => new Map(topic.candidates.map((c) => [c.id, c])), [topic]);
  const progress = replay(game.state);
  const [chosen, setChosen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const choose = (id: string) => {
    if (chosen) return;
    setChosen(id);
    timer.current = setTimeout(() => {
      setGame({ ...game, state: pick(game.state, id) });
      setChosen(null);
    }, PICK_DELAY_MS);
  };
  const back = () => {
    if (chosen || game.state.picks.length === 0) return;
    setGame({ ...game, state: undo(game.state) });
  };

  // 키보드: ← 왼쪽, → 오른쪽, Backspace 되돌리기
  const current = progress.current;
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Backspace") back();
    if (!current) return;
    if (e.key === "ArrowLeft") choose(current.a);
    if (e.key === "ArrowRight") choose(current.b);
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = game.state.entrants.length - 1;
  const done = game.state.picks.length;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onExit} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-card">
          ← 처음으로
        </button>
        <span className="truncate font-bold">
          {topic.emoji} {topic.title}
        </span>
        <button
          onClick={back}
          disabled={done === 0 || !!chosen}
          className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-card disabled:opacity-30"
        >
          ↶ 되돌리기
        </button>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      {current ? (
        <Match current={current} byId={byId} chosen={chosen} onChoose={choose} />
      ) : (
        <Result game={game} topic={topic} byId={byId} onExit={onExit} />
      )}
    </main>
  );
}

function Match({
  current,
  byId,
  chosen,
  onChoose,
}: {
  current: CurrentMatch;
  byId: Map<string, Candidate>;
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
        {[current.a, current.b].map((id) => (
          <CandidateCard
            key={`${current.roundSize}-${current.matchNo}-${id}`}
            candidate={byId.get(id)!}
            state={chosen === null ? "idle" : chosen === id ? "chosen" : "lost"}
            onClick={() => onChoose(id)}
          />
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg px-3 py-2 text-sm font-black text-bg shadow-lg sm:px-4 sm:py-3 sm:text-lg">
          VS
        </span>
      </div>
      <p className="hidden text-center text-xs text-muted sm:block">키보드 ← → 로 고르고 Backspace 로 되돌릴 수 있어요</p>
    </>
  );
}

function CandidateCard({
  candidate,
  state,
  onClick,
}: {
  candidate: Candidate;
  state: "idle" | "chosen" | "lost";
  onClick: () => void;
}) {
  const look = {
    idle: "hover:-translate-y-1 hover:shadow-xl",
    chosen: "scale-105 ring-4 ring-accent shadow-xl",
    lost: "scale-95 opacity-30",
  }[state];
  return (
    <button
      onClick={onClick}
      disabled={state !== "idle"}
      className={`animate-pop flex aspect-[3/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-card p-3 shadow-md transition duration-300 ${look}`}
    >
      {candidate.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 후보 사진은 크기가 제각각이라 img 로 그대로 쓴다
        <img src={candidate.image} alt="" className="h-3/4 w-full rounded-2xl object-cover" />
      ) : (
        <span className="text-7xl sm:text-9xl" aria-hidden>
          {candidate.emoji}
        </span>
      )}
      <span className="text-lg font-bold sm:text-2xl">{candidate.name}</span>
    </button>
  );
}

function Result({
  game,
  topic,
  byId,
  onExit,
}: {
  game: SavedGame;
  topic: Topic;
  byId: Map<string, Candidate>;
  onExit: () => void;
}) {
  const progress = replay(game.state);
  const { path, runnerUp } = summary(progress);
  const champion = byId.get(progress.champion!)!;
  const second = runnerUp ? byId.get(runnerUp) : undefined;
  const [notice, setNotice] = useState<string | null>(null);

  const restart = () =>
    setGame({ topicId: topic.id, state: createTournament(topic.candidates.map((c) => c.id), game.state.entrants.length) });

  const share = async () => {
    const text = `나의 ${topic.title} ${game.state.entrants.length}강 우승: ${champion.emoji} ${champion.name}`;
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "이상형 월드컵", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice("결과를 복사했어요");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNotice("공유하지 못했어요");
    }
  };

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <div>
        <p className="font-semibold text-accent">🏆 우승</p>
        <div className="animate-pop mt-3 flex flex-col items-center gap-2 rounded-3xl bg-card px-12 py-8 shadow-xl ring-4 ring-accent">
          <span className="text-8xl sm:text-9xl" aria-hidden>
            {champion.emoji}
          </span>
          <h1 className="text-3xl font-black">{champion.name}</h1>
        </div>
        {second && (
          <p className="mt-3 text-muted">
            결승 상대: {second.emoji} {second.name}
          </p>
        )}
      </div>

      <div className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-bold text-muted">우승까지의 길</h2>
        <ol className="flex flex-col gap-2">
          {path.map((m) => {
            const loser = byId.get(m.a === m.winner ? m.b : m.a)!;
            return (
              <li key={m.roundSize} className="flex items-center justify-between rounded-xl bg-card px-4 py-2 text-sm">
                <span className="font-semibold">{roundLabel(m.roundSize)}</span>
                <span className="text-muted">
                  vs {loser.emoji} {loser.name}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <button onClick={share} className="flex-1 rounded-2xl bg-accent py-3 font-bold text-white hover:brightness-110">
          결과 공유
        </button>
        <button onClick={restart} className="flex-1 rounded-2xl bg-card py-3 font-bold hover:bg-line">
          다시 하기
        </button>
        <button
          onClick={() => {
            setGame(null);
            onExit();
          }}
          className="flex-1 rounded-2xl bg-card py-3 font-bold hover:bg-line"
        >
          다른 주제
        </button>
      </div>
      <p className="h-5 text-sm text-muted" role="status">
        {notice}
      </p>
    </section>
  );
}
