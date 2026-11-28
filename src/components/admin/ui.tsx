"use client";

// 관리자 화면 공용 부품. 그랜터 디자인 시스템(Tailwind neutral 팔레트, 버튼 filled/tonal/outlined/ghost,
// 크기 40·32px, 표는 가로선만, 브랜드 액센트 sky-500)의 규격을 그대로 따른다.
import { X } from "@phosphor-icons/react";
import { useEffect, useId } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "filled" | "tonal" | "outlined" | "ghost" | "destructive";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  filled: "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300",
  tonal: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-700",
  outlined:
    "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-50 dark:hover:bg-neutral-800",
  ghost: "text-neutral-900 hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800",
  destructive: "bg-red-600/10 text-red-600 hover:bg-red-600/15 dark:text-red-400",
};

const SIZES: Record<Size, string> = {
  md: "h-10 rounded-lg px-4 text-base",
  sm: "h-8 rounded-md px-3 text-sm",
};

/** 버튼 모양 클래스. 링크를 버튼처럼 보이게 할 때도 쓴다(a 안에 button 을 넣지 않기 위해). */
export function buttonClass(variant: Variant = "filled", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "filled",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" {...props} className={buttonClass(variant, size, className)} />;
}

export const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {label}
        {optional && <span className="ml-1 font-normal text-neutral-500">(선택)</span>}
      </span>
      {children}
    </label>
  );
}

/** 상태 칩 */
export function Badge({ tone, children }: { tone: "neutral" | "brand"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium",
        tone === "brand" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-black/[.06] text-neutral-600 dark:bg-white/15 dark:text-neutral-300",
      )}
    >
      {children}
    </span>
  );
}

/** 페이지 제목 줄 */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        tone === "error" ? "bg-red-600/10 text-red-700 dark:text-red-300" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      )}
    >
      {children}
    </div>
  );
}

/** 표준 모달: 제목과 닫기 X 는 같은 줄, 본문만 스크롤, 하단 버튼 고정 */
export function Dialog({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {title}
          </h2>
          <button onClick={onClose} aria-label="닫기" className="-mr-2 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 px-6 pt-3 pb-5">{footer}</div>
      </div>
    </div>
  );
}
