"use client";

import { useEffect, useState } from "react";

// 최종 1인 사진 주위로 터지는 이모지 컨페티(2026-11-28 사용자 지시). 라이브러리 없이 CSS 애니메이션으로만.
// 조각마다 사진 테두리의 한 점에서 출발해 바깥으로 튀어 나간 뒤 아래로 떨어지며 사라진다.
const EMOJIS = ["🎉", "✨", "💖", "🏆", "🎊", "⭐", "💘", "🌸", "🥳", "💐"];

interface Piece {
  id: number;
  emoji: string;
  left: number; // 출발점(%, 사진 영역 기준)
  top: number;
  dx: number; // 튀어 나가는 거리(px)
  dy: number;
  rot: number;
  size: number;
  delay: number; // ms
  duration: number;
}

function makePieces(count: number, seed: number, delayBase: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 70 + Math.random() * 120;
    return {
      id: seed * 1000 + i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      left: 50 + Math.cos(angle) * 50,
      top: 50 + Math.sin(angle) * 50,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 40,
      rot: (Math.random() - 0.5) * 720,
      size: 18 + Math.random() * 18,
      delay: delayBase + Math.random() * 180,
      duration: 1400 + Math.random() * 900,
    };
  });
}

/** 감싼 요소(사진 카드) 주위로 컨페티를 터뜨린다. 누르면 다시 터진다. */
export default function EmojiBurst({ children }: { children: React.ReactNode }) {
  const [round, setRound] = useState(1);
  const [pieces, setPieces] = useState<Piece[]>(() => [...makePieces(28, 1, 0), ...makePieces(14, 2, 550)]);

  // 다 떨어진 조각은 화면에서 치운다(가장 늦은 조각: 지연 550+180ms + 길이 최대 2300ms)
  useEffect(() => {
    if (pieces.length === 0) return;
    const t = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(t);
  }, [pieces]);

  const replay = () => {
    const next = round + 2;
    setRound(next);
    setPieces([...makePieces(28, next, 0), ...makePieces(14, next + 1, 550)]);
  };

  return (
    <div className="relative" onClick={replay}>
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="animate-confetti absolute leading-none opacity-0"
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                fontSize: p.size,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.duration}ms`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
              } as React.CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
