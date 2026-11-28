"use client";

import { DownloadSimple, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bulkTemplateCsv, fileKey, parseBulk, BULK_COLUMNS } from "@/lib/bulk";
import { parseCandidate } from "@/lib/validation";
import { useAdminApiError } from "./AdminShell";
import { CandidateFieldsForm, EMPTY_FIELDS, FIELD_DEFS, createCandidate, type CandidateFields } from "./candidateFields";
import { Badge, Button, Notice, PageHeader, buttonClass, cn, inputClass } from "./ui";

const ACCEPT = "image/jpeg,image/png,image/webp";
const PARALLEL = 3;

export default function CandidateUpload() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  return (
    <>
      <PageHeader title="후보 올리기" description="사진과 정보를 함께 등록해요. 사진은 올릴 때 자동으로 가볍게 줄여요." />
      {/* 탭: 아래 선 하나 + 선택 탭 밑줄 */}
      <div role="tablist" className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            ["single", "하나씩 올리기"],
            ["bulk", "대량으로 올리기"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
              mode === key ? "border-neutral-900 text-neutral-900 dark:border-neutral-50 dark:text-neutral-50" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "single" ? <SingleUpload /> : <BulkUpload />}
    </>
  );
}

/* ───────── 하나씩 ───────── */

function SingleUpload() {
  const onApiError = useAdminApiError();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fields, setFields] = useState<CandidateFields>(EMPTY_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDone(null);
  };

  const submit = async () => {
    if (!file) return setError("사진을 골라 주세요");
    const parsed = parseCandidate(fields);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError(null);
    try {
      const c = await createCandidate(file, fields);
      setDone(`${c.name} 등록 완료`);
      setFile(null);
      setPreview(null);
      setFields(EMPTY_FIELDS);
    } catch (e) {
      setError(onApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        className="flex aspect-[3/4] w-full shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 hover:bg-neutral-100 md:w-56 dark:border-neutral-700 dark:bg-neutral-800/40"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <>
            <ImageSquare className="size-8" />
            사진 선택 또는 끌어다 놓기
          </>
        )}
      </button>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <CandidateFieldsForm value={fields} onChange={setFields} />
        {error && <Notice tone="error">{error}</Notice>}
        {done && (
          <Notice>
            {done} · <Link href="/admin" className="font-medium underline">목록 보기</Link>
          </Notice>
        )}
        <div className="flex justify-end">
          <Button onClick={() => void submit()} disabled={busy}>
            <UploadSimple weight="bold" />
            {busy ? "올리는 중…" : "등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────── 대량 ───────── */

type Row = {
  key: string;
  file: File;
  preview: string;
  fields: CandidateFields;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

function BulkUpload() {
  const onApiError = useAdminApiError();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [paste, setPaste] = useState("");
  const [pasteResult, setPasteResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // 페이지를 떠날 때 미리보기 주소 정리
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const addFiles = (files: FileList | File[]) => {
    const added: Row[] = Array.from(files)
      .filter((f) => ACCEPT.split(",").includes(f.type))
      .map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        fields: { ...EMPTY_FIELDS, name: file.name.normalize("NFC").replace(/\.[^.]+$/, "").slice(0, 40) },
        status: "ready",
      }));
    setRows((r) => [...r, ...added]);
  };

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: string) =>
    setRows((rs) => {
      const gone = rs.find((r) => r.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return rs.filter((r) => r.key !== key);
    });

  const applyPaste = () => {
    const data = parseBulk(paste);
    let matched = 0;
    const next = rows.map((r) => {
      const info = data.get(fileKey(r.file.name));
      if (!info || r.status === "done" || r.status === "uploading") return r;
      matched++;
      return { ...r, fields: { ...info }, status: "ready" as const, error: undefined };
    });
    setRows(next);
    setPasteResult(`${data.size}줄 중 ${matched}개 사진에 정보를 채웠어요.${data.size > matched ? " 파일명이 맞지 않는 줄은 건너뛰었어요." : ""}`);
  };

  const downloadTemplate = () => {
    const csv = bulkTemplateCsv(rows.map((r) => r.file.name.normalize("NFC")));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "후보-정보-양식.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadAll = async () => {
    // 먼저 입력을 모두 검사해 틀린 줄을 표시하고, 맞는 줄만 올린다
    const queue: Row[] = [];
    for (const r of rowsRef.current) {
      if (r.status === "done" || r.status === "uploading") continue;
      const parsed = parseCandidate(r.fields);
      if (parsed.ok) queue.push(r);
      else patch(r.key, { status: "error", error: parsed.error });
    }
    setRunning(true);
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        patch(r.key, { status: "uploading", error: undefined });
        try {
          await createCandidate(r.file, r.fields);
          patch(r.key, { status: "done" });
        } catch (e) {
          patch(r.key, { status: "error", error: onApiError(e) });
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setRunning(false);
  };

  const clearDone = () =>
    setRows((rs) => {
      rs.filter((r) => r.status === "done").forEach((r) => URL.revokeObjectURL(r.preview));
      return rs.filter((r) => r.status !== "done");
    });

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  const pending = rows.length - count("done");

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        <li>1. 사진을 여러 장 고르거나 끌어다 놓아요. 파일 이름이 이름 칸에 먼저 들어가요.</li>
        <li>2. 정보는 표에서 바로 고치거나, 엑셀·구글 시트에서 표를 복사해 붙여넣으면 파일명이 같은 줄에 채워져요.</li>
        <li>3. ‘모두 등록’을 누르면 맞게 입력된 줄부터 올라가요. 틀린 줄은 빨간 문구로 알려 줘요.</li>
      </ol>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-800/40"
      >
        <ImageSquare className="size-8 text-neutral-400" />
        <p className="text-sm text-neutral-500">사진을 여기로 끌어다 놓거나</p>
        <Button variant="outlined" size="sm" onClick={() => input.current?.click()}>
          사진 여러 장 선택
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <details className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <summary className="cursor-pointer text-sm font-medium">엑셀·시트에서 붙여넣기</summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-xs text-neutral-500">
                열 순서: {BULK_COLUMNS.join(" · ")} (첫 줄 머리글은 있어도 되고 없어도 돼요). 소속 그룹이 없으면 칸을 비워 두세요.
              </p>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={5}
                placeholder={"파일명\t이름\t소속그룹\t타이틀\t키\t국적\t나이\nphoto01.jpg\t홍길동\t\t배우\t180\t대한민국\t28"}
                className={cn(inputClass, "h-auto py-2 font-mono text-xs")}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={downloadTemplate} className={buttonClass("ghost", "sm")}>
                  <DownloadSimple />
                  선택한 사진으로 양식 내려받기 (CSV)
                </button>
                <Button size="sm" variant="tonal" onClick={applyPaste} disabled={!paste.trim()}>
                  표에 채우기
                </Button>
              </div>
              {pasteResult && <Notice>{pasteResult}</Notice>}
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-neutral-500">
              {rows.length}장 · 완료 {count("done")} · 오류 {count("error")}
              {running && ` · 올리는 중 ${count("uploading")}`}
            </p>
            <div className="flex gap-2">
              {count("done") > 0 && (
                <Button variant="ghost" size="sm" onClick={clearDone} disabled={running}>
                  완료된 줄 정리
                </Button>
              )}
              <Button size="sm" onClick={() => void uploadAll()} disabled={running || pending === 0}>
                <UploadSimple weight="bold" />
                {running ? "올리는 중…" : `${pending}명 모두 등록`}
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto border-y border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="h-10 pr-3 text-xs font-medium text-neutral-500">사진</th>
                  {FIELD_DEFS.map((f) => (
                    <th key={f.key} className="h-10 px-2 text-xs font-medium whitespace-nowrap text-neutral-500">
                      {f.label}
                      {f.optional && " (선택)"}
                    </th>
                  ))}
                  <th className="h-10 px-2 text-xs font-medium text-neutral-500">상태</th>
                  <th className="h-10 pl-2" />
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-neutral-200 align-top dark:border-neutral-800">
                    <td className="py-2 pr-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 */}
                      <img src={r.preview} alt="" className="h-12 w-9 rounded-md object-cover" />
                      <span className="mt-1 block max-w-[72px] truncate text-[11px] text-neutral-500" title={r.file.name}>
                        {r.file.name}
                      </span>
                    </td>
                    {FIELD_DEFS.map((f) => (
                      <td key={f.key} className="px-2 py-2">
                        <input
                          value={r.fields[f.key]}
                          disabled={r.status === "done" || r.status === "uploading"}
                          inputMode={f.numeric ? "numeric" : undefined}
                          placeholder={f.optional ? "없음" : f.placeholder}
                          onChange={(e) => patch(r.key, { fields: { ...r.fields, [f.key]: e.target.value }, status: r.status === "error" ? "ready" : r.status })}
                          className={cn(inputClass, "h-8", f.numeric ? "w-16" : "w-28")}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      {r.status === "done" ? (
                        <Badge tone="brand">완료</Badge>
                      ) : r.status === "uploading" ? (
                        <Badge tone="neutral">올리는 중</Badge>
                      ) : r.status === "error" ? (
                        <span className="block max-w-[160px] text-xs text-red-600 dark:text-red-400">{r.error}</span>
                      ) : (
                        <Badge tone="neutral">대기</Badge>
                      )}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <button
                        onClick={() => remove(r.key)}
                        disabled={r.status === "uploading"}
                        aria-label="이 줄 빼기"
                        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
                      >
                        <Trash className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
