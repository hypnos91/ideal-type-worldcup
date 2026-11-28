import "server-only";
import type { GameView, PublicCandidate } from "@/lib/api-types";
import { availableSizes } from "@/lib/tournament";
import type { Db } from "./db-types";
import { getCandidates, getPlayingGame, listFinishedGames, playableCandidateIds, type Candidate, type Game } from "./store";

export function publicCandidate(c: Candidate): PublicCandidate {
  return {
    id: c.id,
    name: c.name,
    groupName: c.groupName,
    title: c.title,
    heightCm: c.heightCm,
    nationality: c.nationality,
    age: c.age,
    imageUrl: c.imageUrl,
    face: c.face,
  };
}

export async function gameView(db: Db, game: Game): Promise<GameView> {
  const candidates = await getCandidates(db, game.entrants);
  return {
    id: game.id,
    size: game.size,
    entrants: game.entrants,
    picks: game.picks,
    status: game.status === "finished" ? "finished" : "playing",
    candidates: Object.fromEntries(candidates.map((c) => [c.id, publicCandidate(c)])),
  };
}

export async function meView(db: Db, player: { id: string; name: string; email: string; age: number }) {
  const [playing, finished, pool] = await Promise.all([
    getPlayingGame(db, player.id),
    listFinishedGames(db, player.id),
    playableCandidateIds(db, player.id),
  ]);
  const champions = new Map(
    (await getCandidates(db, finished.map((g) => g.championId!).filter(Boolean))).map((c) => [c.id, c]),
  );
  return {
    player: { name: player.name, email: player.email, age: player.age },
    playing: playing ? await gameView(db, playing) : null,
    history: finished
      .filter((g) => g.championId && champions.has(g.championId))
      .map((g) => ({
        gameId: g.id,
        size: g.size,
        finishedAt: g.finishedAt!,
        champion: publicCandidate(champions.get(g.championId!)!),
      })),
    remaining: pool.length,
    sizes: availableSizes(pool.length),
  };
}
