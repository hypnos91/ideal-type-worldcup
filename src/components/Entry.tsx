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
        className="rounded-xl border border-line bg-bg/70 px-4 py-3 outline-none focus:border-accent"
      />
    </label>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="animate-pop flex flex-col gap-7 rounded-3xl border border-white/10 bg-card/80 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
        <h1 className="text-center text-3xl font-black sm:text-4xl">이상형 월드컵</h1>
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
        </form>
      </div>
    </main>
  );
}
