"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { parsePlayer } from "@/lib/validation";

export default function Entry() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", age: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parsePlayer(form);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError(null);
    try {
      await api("/api/session", { method: "POST", body: parsed.value });
      router.push("/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "들어가지 못했어요");
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required
        className="rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
      />
    </label>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <p className="text-sm font-semibold tracking-widest text-accent">IDEAL TYPE WORLD CUP</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">이상형 월드컵</h1>
        <p className="mt-3 text-muted">
          둘 중 한 명만 고르세요.
          <br />
          마지막까지 남는 한 명이 당신의 이상형입니다.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {field("email", "이메일", { type: "email", autoComplete: "email", inputMode: "email", placeholder: "you@example.com" })}
        {field("name", "이름", { autoComplete: "name", maxLength: 30, placeholder: "홍길동" })}
        {field("age", "나이", { inputMode: "numeric", pattern: "[0-9]*", maxLength: 3, placeholder: "25" })}
        {error && (
          <p className="text-sm font-semibold text-accent" role="alert">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="mt-2 rounded-2xl bg-accent py-4 text-lg font-black text-white shadow-lg shadow-accent/30 transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "들어가는 중…" : "내 월드컵 시작"}
        </button>
        <p className="text-center text-xs text-muted">
          다음에 같은 이메일·이름·나이로 들어오면 이전 기록이 이어지고, 이미 본 후보는 빠져요.
        </p>
      </form>
    </main>
  );
}
