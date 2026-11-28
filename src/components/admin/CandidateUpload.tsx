"use client";

import { DownloadSimple, FileXls, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bulkTemplateCsv, fileKey, parseBulk, rowsToBulk, BULK_COLUMNS, type BulkRow } from "@/lib/bulk";
import { PHOTO_ACCEPT, formatBytes, isPhotoFile } from "@/lib/image";
import { parseCandidate } from "@/lib/validation";
import { useAdminApiError } from "./AdminShell";
import { CandidateFieldsForm, EMPTY_FIELDS, FIELD_DEFS, createCandidate, type CandidateFields } from "./candidateFields";
import { LocalPreview, usePastedImage } from "./photoInput";
import { Badge, Button, Notice, PageHeader, buttonClass, cn, inputClass } from "./ui";

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

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!isPhotoFile(f)) return setError("이미지 파일만 쓸 수 있어요");
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDone(null);
  };

  usePastedImage(pick, !busy);

  const submit = async () => {
    if (!file) return setError("사진을 골라 주세요");
    const parsed = parseCandidate(fields);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError(null);
    try {
      const { candidate: c, bytes } = await createCandidate(file, fields);
      setDone(`${c.name} 등록 완료 · 원본 ${formatBytes(file.size)} → WebP ${formatBytes(bytes)}`);
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
          <LocalPreview src={preview} name={file?.name} className="size-full" />
        ) : (
          <>
            <ImageSquare className="size-8" />
            사진 선택 · 끌어다 놓기 · 붙여넣기
          </>
        )}
      </button>
      <input ref={input} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

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
  /** 저장된 WebP 크기 */
  bytes?: number;
};

function BulkUpload() {
  const onApiError = useAdminApiError();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const sheetInput = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  // 불러온 정보(엑셀 파일·붙여넣기). 사진을 나중에 추가해도 파일명이 맞으면 자동으로 채운다.
  const [sheet, setSheet] = useState<{ label: string; data: Map<string, BulkRow> } | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // 페이지를 떠날 때 미리보기 주소 정리
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const addFiles = (files: FileList | File[]) => {
    const added: Row[] = Array.from(files)
      .filter(isPhotoFile)
      .map((file) => {
        const info = sheet?.data.get(fileKey(file.name));
        return {
          key: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          fields: info ? { ...info } : { ...EMPTY_FIELDS, name: file.name.normalize("NFC").replace(/\.[^.]+$/, "").slice(0, 40) },
          status: "ready",
        };
      });
    setRows((r) => [...r, ...added]);
  };

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const remove = (key: string) =>
    setRows((rs) => {
      const gone = rs.find((r) => r.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return rs.filter((r) => r.key !== key);
    });

  /** 불러온 정보를 지금 있는 사진 줄에 채우고, 나중에 추가할 사진을 위해 기억해 둔다 */
  const applySheet = (label: string, data: Map<string, BulkRow>) => {
    setSheet({ label, data });
    setSheetError(null);
    setRows((rs) =>
      rs.map((r) => {
        const info = data.get(fileKey(r.file.name));
        if (!info || r.status === "done" || r.status === "uploading") return r;
        return { ...r, fields: { ...info }, status: "ready" as const, error: undefined };
      }),
    );
  };

  const loadSheetFile = async (file: File) => {
    try {
      let data: Map<string, BulkRow>;
      if (/\.csv$/i.test(file.name)) data = parseBulk(await file.text());
      else {
        const { readSheet } = await import("read-excel-file/browser");
        data = rowsToBulk(await readSheet(file));
      }
      if (data.size === 0) throw new Error("읽을 수 있는 줄이 없어요. 첫 시트에 파일명 열이 있는지 확인해 주세요.");
      applySheet(file.name, data);
    } catch (e) {
      setSheet(null);
      setSheetError(e instanceof Error && e.message.includes("줄이 없어요") ? e.message : "엑셀 파일을 읽지 못했어요. .xlsx 또는 .csv 파일인지 확인해 주세요.");
    }
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
          const { bytes } = await createCandidate(r.file, r.fields);
          patch(r.key, { status: "done", bytes });
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
  const rowKeys = new Set(rows.map((r) => fileKey(r.file.name)));
  const sheetMatched = sheet ? [...sheet.data.keys()].filter((k) => rowKeys.has(k)).length : 0;
  const pending = rows.length - count("done");

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        <li>1. 엑셀 양식에 파일명·이름·소속그룹·타이틀·키·국적·나이를 채워 불러와요(엑셀·시트 표를 붙여넣어도 돼요).</li>
        <li>2. 사진을 여러 장 고르거나 끌어다 놓아요. 파일명이 같은 줄의 정보가 자동으로 채워져요. 순서는 바뀌어도 돼요.</li>
        <li>3. 표에서 확인·수정한 뒤 ‘모두 등록’을 누르면 맞게 입력된 줄부터 올라가요. 사진은 서버에서 WebP 로 바꿔 저장해요.</li>
      </ol>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">후보 정보 파일</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/candidate-template.xlsx" download className={buttonClass("ghost", "sm")}>
              <DownloadSimple />
              엑셀 양식 내려받기
            </a>
            {rows.length > 0 && (
              <button onClick={downloadTemplate} className={buttonClass("ghost", "sm")}>
                <DownloadSimple />
                선택한 사진으로 양식 만들기 (CSV)
              </button>
            )}
            <Button variant="outlined" size="sm" onClick={() => sheetInput.current?.click()}>
              <FileXls />
              엑셀 파일 불러오기
            </Button>
            <input
              ref={sheetInput}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadSheetFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          열: {BULK_COLUMNS.join(" · ")} — 첫 줄은 머리글, 열 순서는 달라도 돼요. 소속 그룹이 없으면 비워 두고, 키는 cm 숫자, 나이는 숫자만.
        </p>
        {sheet && (
          <Notice>
            <span className="font-medium">{sheet.label}</span>: {sheet.data.size}명 정보를 읽었어요. 사진 {rows.length}장 중 {sheetMatched}장과 파일명이
            맞아요.
            {sheet.data.size > sheetMatched && ` 사진이 아직 없는 정보 ${sheet.data.size - sheetMatched}줄은 사진을 추가하면 채워져요.`}
          </Notice>
        )}
        {sheetError && <Notice tone="error">{sheetError}</Notice>}
        <details>
          <summary className="cursor-pointer text-sm text-neutral-600 dark:text-neutral-400">엑셀·시트에서 표를 복사해 붙여넣기</summary>
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder={"파일명\t이름\t소속그룹\t타이틀\t키\t국적\t나이\nphoto01.jpg\t홍길동\t\t배우\t180\t대한민국\t28"}
              className={cn(inputClass, "h-auto py-2 font-mono text-xs")}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="tonal" onClick={() => applySheet("붙여넣은 표", parseBulk(paste))} disabled={!paste.trim()}>
                표에 채우기
              </Button>
            </div>
          </div>
        </details>
      </section>

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
          accept={PHOTO_ACCEPT}
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
                      <LocalPreview src={r.preview} className="h-12 w-9 rounded-md" />
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
                        <Badge tone="brand">완료 · WebP {formatBytes(r.bytes ?? 0)}</Badge>
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
