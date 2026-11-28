"use client";

import { useState } from "react";
import { api } from "@/lib/client-api";
import { useAdminApiError } from "./AdminShell";
import { Button, Field, Notice, PageHeader, inputClass } from "./ui";

const MIN = 8;

export default function PasswordSettings() {
  const onApiError = useAdminApiError();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (form.next.length < MIN) return setError(`새 비밀번호는 ${MIN}자 이상으로 정해 주세요`);
    if (form.next !== form.confirm) return setError("새 비밀번호 확인이 일치하지 않아요");
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/password", { method: "PUT", body: { current: form.current, next: form.next } });
      setForm({ current: "", next: "", confirm: "" });
      setDone(true);
    } catch (err) {
      setError(onApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const input = (key: keyof typeof form, label: string, autoComplete: string) => (
    <Field label={label}>
      <input
        type="password"
        value={form[key]}
        autoComplete={autoComplete}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputClass}
      />
    </Field>
  );

  return (
    <>
      <PageHeader title="비밀번호 변경" description="바꾸면 다른 기기의 관리자 로그인은 모두 끊기고, 지금 기기는 그대로 유지돼요." />
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4">
        {input("current", "지금 비밀번호", "current-password")}
        {input("next", `새 비밀번호 (${MIN}자 이상)`, "new-password")}
        {input("confirm", "새 비밀번호 확인", "new-password")}
        {error && <Notice tone="error">{error}</Notice>}
        {done && <Notice>비밀번호를 바꿨어요.</Notice>}
        <Button type="submit" disabled={busy || !form.current || !form.next}>
          바꾸기
        </Button>
      </form>
    </>
  );
}
