"use client";

import { useEffect, useState } from "react";

const ROWS = 4;
const MIN_PER_ROW = 14; // 넓은 화면에서도 한 줄이 비지 않도록 반복해서 채운다

/**
 * 후보 사진을 화면 전체에 여러 줄로 깔고, 줄마다 좌우 번갈아 천천히 흘려보낸다(2026-11-28 사용자 지시).
 * 한 줄은 같은 목록을 두 번 이어 붙여 -50% 만큼 움직이면 끊김 없이 반복된다.
 * 동작 줄이기 설정을 켠 기기에서는 멈춘다.
 */
export default function PhotoBackdrop() {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/showcase")
      .then((r) => (r.ok ? r.json() : { urls: [] }))
      .then((d: { urls?: string[] }) => alive && setUrls(d.urls ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const rows = Array.from({ length: ROWS }, (_, r) => {
    if (urls.length === 0) return [];
    const own = urls.filter((_, i) => i % ROWS === r);
    const base = own.length >= 4 ? own : urls.slice(r).concat(urls.slice(0, r));
    const filled: string[] = [];
    while (filled.length < MIN_PER_ROW) filled.push(...base);
    return filled;
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {urls.length > 0 && (
        <div className="animate-fade-in flex h-full -rotate-3 scale-110 flex-col gap-2">
          {rows.map((row, r) => (
            <div key={r} className="min-h-0 flex-1 overflow-hidden">
              <div
                className={`flex h-full w-max gap-2 motion-reduce:animate-none ${r % 2 ? "animate-marquee-right" : "animate-marquee-left"}`}
                style={{ animationDuration: `${140 + r * 25}s` }}
              >
                {[...row, ...row].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- 배경 장식용 사진
                  <img key={i} src={src} alt="" loading="lazy" decoding="async" className="aspect-[3/4] h-full rounded-xl object-cover" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 글자가 읽히도록 어둡게 덮는다 */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/75 via-bg/60 to-bg/85" />
    </div>
  );
}
