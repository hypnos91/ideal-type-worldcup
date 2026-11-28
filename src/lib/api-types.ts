// 화면과 API 가 주고받는 모양.
import type { FaceBox } from "./face";

export interface PublicCandidate {
  id: string;
  name: string;
  groupName: string | null;
  title: string;
  heightCm: number;
  nationality: string;
  age: number;
  imageUrl: string;
  face: FaceBox | null;
}

export interface AdminCandidate extends PublicCandidate {
  active: boolean;
  createdAt: string;
}

export interface GameView {
  id: string;
  size: number;
  entrants: string[];
  picks: string[];
  status: "playing" | "finished";
  candidates: Record<string, PublicCandidate>;
}

export interface HistoryItem {
  gameId: string;
  size: number;
  finishedAt: string;
  champion: PublicCandidate;
}

export interface MeResponse {
  player: { name: string; email: string; age: number };
  playing: GameView | null;
  history: HistoryItem[];
  /** 아직 안 본(새 판에 넣을 수 있는) 후보 수 */
  remaining: number;
  /** 지금 고를 수 있는 강수 */
  sizes: number[];
}
