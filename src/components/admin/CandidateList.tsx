"use client";

import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminCandidate } from "@/lib/api-types";
import { api } from "@/lib/client-api";
import { parseCandidate } from "@/lib/validation";
import { useAdminApiError } from "./AdminShell";
import { CandidateFieldsForm, toFields, type CandidateFields } from "./candidateFields";
import { Badge, Button, Dialog, Notice, PageHeader, buttonClass, cn } from "./ui";

type Filter = "all" | "active" | "hidden";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "active", label: "표시 중" },
  { key: "hidden", label: "숨김" },
];

export default function CandidateList() {
  const onApiError = useAdminApiError();
  const [list, setList] = useState<AdminCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<AdminCandidate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<AdminCandidate[]>("/api/admin/candidates").then(
      (data) => alive && setList(data),
      (e) => alive && setError(onApiError(e)),
    );
    return () => {
      alive = false;
    };
  }, [onApiError]);

  const replace = (c: AdminCandidate) => setList((l) => l?.map((x) => (x.id === c.id ? c : x)) ?? null);

  const toggle = async (c: AdminCandidate) => {
    const parsed = parseCandidate(toFields(c));
    if (!parsed.ok) return setError(parsed.error);
    setBusyId(c.id);
    try {
      replace(await api<AdminCandidate>("/api/admin/candidates", { method: "PUT", body: { id: c.id, active: !c.active, ...parsed.value } }));
    } catch (e) {
      setError(onApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const all = list ?? [];
  const activeCount = all.filter((c) => c.active).length;
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (c) =>
      (filter === "all" || (filter === "active") === c.active) &&
      (!q || [c.name, c.groupName ?? "", c.title, c.nationality].some((v) => v.toLowerCase().includes(q))),
  );

  return (
    <>
      <PageHeader
        title="후보 목록"
        description={`표시 중 ${activeCount}명 · 전체 ${all.length}명 — 32강은 32명, 64강은 64명, 128강은 128명이 필요해요.`}
        actions={
          <Link href="/admin/upload" className={buttonClass()}>
            <Plus weight="bold" />
            후보 올리기
          </Link>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {/* 툴바: 검색(filled) → 상태 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-8 w-full items-center gap-1.5 rounded-lg bg-neutral-100/70 px-2.5 sm:w-[300px] dark:bg-neutral-800/70">
          <MagnifyingGlass className="size-4 shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 소속 그룹, 타이틀, 국적 검색"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </label>
        <div className="flex gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                filter === f.key ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 표: 모서리 0 · 좌우 테두리 없음 · 가로선만, 머리글은 아래 선 하나 */}
      <div className="w-full overflow-x-auto border-y border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              {["사진", "이름", "소속 그룹", "키", "국적", "타이틀", "나이", "상태", "등록일", ""].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "h-10 px-3 align-middle text-xs font-medium whitespace-nowrap text-neutral-500 first:pl-0 last:pr-0",
                    (h === "키" || h === "나이") && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {list === null ? (
              <EmptyRow>불러오는 중…</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow>{all.length === 0 ? "아직 등록된 후보가 없어요. ‘후보 올리기’에서 추가해 주세요." : "조건에 맞는 후보가 없어요."}</EmptyRow>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className={cn("border-b border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40", !c.active && "text-neutral-400")}>
                  <td className="py-2 pr-3 align-middle">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 단계에서 줄인 사진 */}
                    <img src={c.imageUrl} alt="" className={cn("h-12 w-9 rounded-md object-cover", !c.active && "opacity-50")} />
                  </td>
                  <td className="px-3 align-middle font-medium whitespace-nowrap">{c.name}</td>
                  <td className="px-3 align-middle whitespace-nowrap">{c.groupName ?? <span className="text-neutral-400">—</span>}</td>
                  <td className="px-3 text-right align-middle tabular-nums">{c.heightCm}cm</td>
                  <td className="px-3 align-middle whitespace-nowrap">{c.nationality}</td>
                  <td className="px-3 align-middle whitespace-nowrap">{c.title}</td>
                  <td className="px-3 text-right align-middle tabular-nums">{c.age}세</td>
                  <td className="px-3 align-middle">{c.active ? <Badge tone="brand">표시 중</Badge> : <Badge tone="neutral">숨김</Badge>}</td>
                  <td className="px-3 align-middle whitespace-nowrap text-neutral-500 tabular-nums">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</td>
                  <td className="py-2 pl-3 text-right align-middle whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === c.id} onClick={() => void toggle(c)}>
                        {c.active ? "숨기기" : "다시 표시"}
                      </Button>
                      <Button variant="tonal" size="sm" onClick={() => setEditing(c)}>
                        수정
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">숨긴 후보는 새 월드컵에 나오지 않지만, 이미 끝난 월드컵 기록에는 그대로 남아요.</p>

      {editing && (
        <EditDialog
          candidate={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            replace(c);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={10} className="py-10 text-center text-sm text-neutral-500">
        {children}
      </td>
    </tr>
  );
}

function EditDialog({ candidate, onClose, onSaved }: { candidate: AdminCandidate; onClose: () => void; onSaved: (c: AdminCandidate) => void }) {
  const onApiError = useAdminApiError();
  const [fields, setFields] = useState<CandidateFields>(() => toFields(candidate));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const parsed = parseCandidate(fields);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    try {
      onSaved(await api<AdminCandidate>("/api/admin/candidates", { method: "PUT", body: { id: candidate.id, active: candidate.active, ...parsed.value } }));
    } catch (e) {
      setError(onApiError(e));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="후보 수정"
      onClose={onClose}
      footer={
        <>
          <Button variant="tonal" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기 */}
        <img src={candidate.imageUrl} alt="" className="h-40 w-30 self-center rounded-xl object-cover" />
        <CandidateFieldsForm value={fields} onChange={setFields} />
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Dialog>
  );
}
