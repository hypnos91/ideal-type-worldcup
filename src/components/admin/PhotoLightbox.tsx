"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useState } from "react";
import type { AdminCandidate } from "@/lib/api-types";
import { candidateFacts } from "../CandidateCard";

/** 후보 사진을 원본 비율 그대로 크게 보는 모달(2026-11-28 사용자 지시). Esc·바깥 누르기·X 로 닫는다. */
export default function PhotoLightbox({ candidate, onClose }: { candidate: AdminCandidate; onClose: () => void }) {
  const [size, setSize] = useState<string | null>(null);
  const onKey = useEffectEvent((e: KeyboardEvent) => e.key === "Escape" && onClose());
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${candidate.name} 사진`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-3 right-3 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <X className="size-6" weight="bold" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- 저장된 원본(WebP)을 그대로 크게 본다 */}
      <img
        src={candidate.imageUrl}
        alt={candidate.name}
        onLoad={(e) => setSize(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)}
        className="max-h-[calc(100dvh-8rem)] max-w-full rounded-xl object-contain shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div className="text-center text-sm text-white" onMouseDown={(e) => e.stopPropagation()}>
        <p className="font-semibold">
          {candidate.name}
          {candidate.groupName && <span className="ml-1.5 font-normal text-white/70">{candidate.groupName}</span>}
        </p>
        <p className="text-xs text-white/60">
          {candidateFacts(candidate)}
          {size && ` · ${size}px`}
        </p>
      </div>
    </div>
  );
}
