"use client";

import { ImageSquare } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useState } from "react";
import { imageFromClipboard } from "@/lib/image";

/** 화면이 열려 있는 동안 Ctrl/⌘+V 로 붙여넣은 이미지를 받는다(글자 붙여넣기는 그대로 둔다). */
export function usePastedImage(onImage: (file: File) => void, enabled = true) {
  const handle = useEffectEvent((e: ClipboardEvent) => {
    const file = imageFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    onImage(file);
  });
  useEffect(() => {
    if (!enabled) return;
    const h = (e: ClipboardEvent) => handle(e);
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  }, [enabled]);
}

/** 고른 사진 미리보기. 브라우저가 못 여는 형식(크롬의 HEIC 등)은 글자로 대신한다 — 올리면 서버가 WebP 로 바꾼다. */
export function LocalPreview({ src, name, className = "" }: { src: string; name?: string; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (broken === src)
    return (
      <span className={`flex flex-col items-center justify-center gap-1 bg-neutral-100 p-2 text-center text-xs text-neutral-500 dark:bg-neutral-800 ${className}`}>
        <ImageSquare className="size-6" />
        미리보기 없음
        {name && <span className="max-w-full truncate">{name}</span>}
      </span>
    );
  // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기
  return <img src={src} alt="" onError={() => setBroken(src)} className={`object-cover ${className}`} />;
}
