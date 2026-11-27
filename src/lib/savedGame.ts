"use client";

// 진행 중인 게임 하나를 담는 저장소. 정본은 메모리 값이고, localStorage 에는 가능할 때만 따라 쓴다
// (새로고침 후 이어하기용 편의 기능). 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 게임은 진행된다.
import { useSyncExternalStore } from "react";
import { findTopic } from "@/data/topics";
import { restore, type TournamentState } from "./tournament";

const KEY = "ideal-type-worldcup:game:v1";

export interface SavedGame {
  topicId: string;
  state: TournamentState;
}

const listeners = new Set<() => void>();
let loaded = false;
let current: SavedGame | null = null;

function parse(raw: string | null): SavedGame | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { topicId?: unknown; state?: unknown };
    const topic = typeof data.topicId === "string" ? findTopic(data.topicId) : undefined;
    if (!topic) return null;
    const state = restore(data.state, topic.candidates.map((c) => c.id));
    return state ? { topicId: topic.id, state } : null;
  } catch {
    return null;
  }
}

function getSnapshot(): SavedGame | null {
  if (!loaded) {
    loaded = true;
    try {
      current = parse(window.localStorage.getItem(KEY));
    } catch {
      current = null;
    }
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 서버 렌더와 첫 하이드레이션에서는 null, 그 뒤 저장된 게임을 돌려준다. */
export function useSavedGame(): SavedGame | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function setGame(game: SavedGame | null) {
  loaded = true;
  current = game;
  try {
    if (game) window.localStorage.setItem(KEY, JSON.stringify(game));
    else window.localStorage.removeItem(KEY);
  } catch {
    // 저장 실패는 게임 진행에 영향이 없다
  }
  listeners.forEach((l) => l());
}
