"use client";

import type { AdminCandidate } from "@/lib/api-types";
import type { FaceBox } from "@/lib/face";
import { ApiError, api } from "@/lib/client-api";
import { shrinkImage } from "@/lib/image";
import { parseCandidate } from "@/lib/validation";
import { Field, inputClass } from "./ui";

/** 화면 입력 상태(문자열). 저장할 때 parseCandidate 로 검증·변환한다. */
export interface CandidateFields {
  name: string;
  groupName: string;
  title: string;
  heightCm: string;
  nationality: string;
  age: string;
}

export const EMPTY_FIELDS: CandidateFields = { name: "", groupName: "", title: "", heightCm: "", nationality: "", age: "" };

/** 입력 순서 = 화면 표시 순서: 이름 → 소속 그룹(선택) → 키 → 국적 → 타이틀 → 나이 (2026-11-28 사용자 지시) */
export const FIELD_DEFS: { key: keyof CandidateFields; label: string; placeholder: string; numeric?: boolean; optional?: boolean }[] = [
  { key: "name", label: "이름", placeholder: "이름" },
  { key: "groupName", label: "소속 그룹", placeholder: "없으면 비워 두세요", optional: true },
  { key: "heightCm", label: "키(cm)", placeholder: "170", numeric: true },
  { key: "nationality", label: "국적", placeholder: "대한민국" },
  { key: "title", label: "타이틀", placeholder: "배우, 가수, 모델 등" },
  { key: "age", label: "나이", placeholder: "25", numeric: true },
];

export function toFields(c: AdminCandidate): CandidateFields {
  return {
    name: c.name,
    groupName: c.groupName ?? "",
    title: c.title,
    heightCm: String(c.heightCm),
    nationality: c.nationality,
    age: String(c.age),
  };
}

export function CandidateFieldsForm({
  value,
  onChange,
  columns = 2,
}: {
  value: CandidateFields;
  onChange: (v: CandidateFields) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={columns === 3 ? "grid grid-cols-1 gap-4 sm:grid-cols-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
      {FIELD_DEFS.map((f) => (
        <Field key={f.key} label={f.label} optional={f.optional}>
          <input
            value={value[f.key]}
            inputMode={f.numeric ? "numeric" : undefined}
            placeholder={f.placeholder}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            className={inputClass}
          />
        </Field>
      ))}
    </div>
  );
}

/**
 * 사진 올리기. 브라우저에서 먼저 줄여 전송량을 줄이고, 서버가 항상 WebP 로 다시 변환해 저장한다.
 * 돌려받는 주소는 언제나 .webp 이고, 서버가 찾은 얼굴 위치(없으면 null)를 함께 준다.
 */
export async function uploadPhoto(file: File): Promise<{ url: string; face: FaceBox | null }> {
  const small = await shrinkImage(file);
  const form = new FormData();
  form.append("file", small);
  let res: Response;
  try {
    res = await fetch("/api/admin/photos", { method: "POST", body: form });
  } catch {
    throw new ApiError("네트워크 연결을 확인해 주세요", 0);
  }
  const data = (await res.json().catch(() => null)) as { url?: string; face?: FaceBox | null; error?: string } | null;
  if (!res.ok || !data?.url) throw new ApiError(data?.error ?? "사진을 올리지 못했어요", res.status);
  return { url: data.url, face: data.face ?? null };
}

/** 사진을 올리고 후보로 등록한다. 입력이 틀리면 업로드 전에 거절한다. */
export async function createCandidate(file: File, fields: CandidateFields): Promise<AdminCandidate> {
  const parsed = parseCandidate(fields);
  if (!parsed.ok) throw new Error(parsed.error);
  const photo = await uploadPhoto(file);
  return api<AdminCandidate>("/api/admin/candidates", { method: "POST", body: { ...parsed.value, imageUrl: photo.url, face: photo.face } });
}
