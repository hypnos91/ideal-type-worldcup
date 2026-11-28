"use client";

import { Info } from "@phosphor-icons/react";

// 후보 사진 가이드(2026-11-28 사용자 요청: "얼굴이 어떻게 위치되어 있어야 모바일에서 안 잘리는지").
// 대결 화면은 모바일에서 화면을 위아래 반반으로 나눠 칸이 정사각형~가로로 긴 모양이 된다(390×330 안팎).
// 세로 사진(3:4)을 그 칸에 꽉 채우면 사진 높이의 약 60~65% 만 보이고, 아래 1/4 쯤은 이름·정보가 덮는다.
// 사진은 서버가 찾은 얼굴 위치를 기준으로 잘리므로, 얼굴이 크게 들어가 있지만 않으면 잘리지 않는다.

/** 세로 사진 위에 모바일에서 보이는 부분과 얼굴 자리를 그린 그림 */
function Diagram() {
  return (
    <svg viewBox="0 0 150 200" className="h-44 w-auto shrink-0" role="img" aria-label="세로 사진에서 모바일에 보이는 부분과 얼굴 자리">
      {/* 사진 전체(3:4) */}
      <rect x="1" y="1" width="148" height="198" rx="8" className="fill-neutral-100 stroke-neutral-300 dark:fill-neutral-800 dark:stroke-neutral-600" strokeWidth="1.5" />
      {/* 모바일에서 보이는 띠(높이 약 62%) — 얼굴 위치에 맞춰 위아래로 움직인다 */}
      <rect x="1" y="14" width="148" height="124" className="fill-sky-500/15 stroke-sky-500" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x="146" y="27" textAnchor="end" className="fill-sky-600 text-[9px] font-semibold dark:fill-sky-400">
        모바일에 보이는 부분
      </text>
      {/* 아래쪽 이름·정보가 덮는 자리 */}
      <rect x="1" y="108" width="148" height="30" className="fill-neutral-900/25 dark:fill-black/40" />
      <text x="75" y="127" textAnchor="middle" className="fill-neutral-700 text-[9px] dark:fill-neutral-300">
        이름·정보가 덮는 자리
      </text>
      {/* 머리·얼굴 자리 */}
      <ellipse cx="75" cy="62" rx="20" ry="26" className="fill-white stroke-neutral-500 dark:fill-neutral-200" strokeWidth="1.5" />
      <path d="M38 108 Q75 82 112 108" className="fill-none stroke-neutral-500" strokeWidth="1.5" />
      {/* 머리 위 여백 */}
      <line x1="22" y1="16" x2="22" y2="35" className="stroke-neutral-500" strokeWidth="1" markerEnd="url(#a)" markerStart="url(#a)" />
      <text x="26" y="28" className="fill-neutral-600 text-[8px] dark:fill-neutral-400">
        여백
      </text>
      <defs>
        <marker id="a" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L6 3L0 6z" className="fill-neutral-500" />
        </marker>
      </defs>
    </svg>
  );
}

export default function PhotoGuide() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-800">
      <Diagram />
      <div className="flex min-w-0 flex-col gap-2 text-sm">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Info className="size-4" />
          모바일에서 얼굴이 잘리지 않는 사진
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-neutral-600 dark:text-neutral-400">
          <li>
            <b className="font-medium text-neutral-900 dark:text-neutral-100">세로 사진(3:4)</b>, 가로 900px 이상, 한 사람만.
          </li>
          <li>
            모바일 대결 화면은 사진 높이의 <b className="font-medium text-neutral-900 dark:text-neutral-100">약 60%만</b> 보여요. 얼굴 위치를 찾아 그쪽으로
            맞춰 자르니, 얼굴(정수리~턱)이 <b className="font-medium text-neutral-900 dark:text-neutral-100">사진 높이의 1/3 이하</b>면 잘리지 않아요.
          </li>
          <li>머리 위에 여백을 조금 두고, 얼굴은 가로 가운데쯤. 얼굴만 꽉 차게 찍은 클로즈업은 이마·턱이 잘려요.</li>
          <li>사진 아래 1/4쯤은 이름·정보가 덮어요. 얼굴이 사진 아래쪽에 있으면 가려져요.</li>
          <li>옆모습·가린 얼굴·강한 컨셉 사진은 얼굴을 못 찾아 위쪽 가운데로 잘려요. 올린 뒤 후보 목록에서 사진을 눌러 잘린 모습을 확인하세요.</li>
        </ul>
      </div>
    </section>
  );
}
