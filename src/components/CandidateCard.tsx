import type { PublicCandidate } from "@/lib/api-types";
import { faceCrop } from "@/lib/face";

/** 후보 정보 한 줄: 키 · 국적 · 타이틀 · 나이 (2026-11-28 사용자 지시 순서, 이름과 소속 그룹은 그 위에) */
export function candidateFacts(c: PublicCandidate): string {
  return [`${c.heightCm}cm`, c.nationality, c.title, `${c.age}세`].join(" · ");
}

export function CandidateInfo({
  c,
  size = "md",
  onPhoto = false,
}: {
  c: PublicCandidate;
  size?: "sm" | "md" | "lg" | "xl";
  /** 사진 위(어두운 그라데이션)에 얹을 때 */
  onPhoto?: boolean;
}) {
  const nameClass = { sm: "text-sm", md: "text-base sm:text-xl", lg: "text-2xl sm:text-3xl", xl: "text-xl sm:text-4xl" }[size];
  const factClass = { sm: "text-[11px]", md: "text-xs sm:text-sm", lg: "text-sm sm:text-base", xl: "text-xs sm:text-lg" }[size];
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
      <span className={`${nameClass} max-w-full truncate font-black`}>{c.name}</span>
      {c.groupName && (
        <span className={`${factClass} max-w-full truncate font-semibold ${onPhoto ? "text-pink-200" : "text-accent"}`}>{c.groupName}</span>
      )}
      <span className={`${factClass} ${onPhoto ? "text-white/85" : "text-muted"}`}>{candidateFacts(c)}</span>
    </div>
  );
}

export function CandidatePhoto({ c, className = "" }: { c: PublicCandidate; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 업로드 단계에서 이미 줄인 사진이라 그대로 쓴다
    <img src={c.imageUrl} alt={c.name} draggable={false} className={`bg-line object-cover ${className}`} />
  );
}

/** 얼굴만 잘라 보여 주는 동그란 아바타(서버가 찾은 얼굴 위치 기준, 못 찾았으면 위쪽 가운데) */
export function FaceAvatar({ c, size = 32 }: { c: PublicCandidate; size?: number }) {
  return (
    <span
      role="img"
      aria-label={c.name}
      className="inline-block shrink-0 rounded-full bg-line bg-no-repeat ring-1 ring-white/15"
      style={{ width: size, height: size, backgroundImage: `url("${c.imageUrl}")`, ...faceCrop(c.face) }}
    />
  );
}
