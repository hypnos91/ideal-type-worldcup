// 대량 등록: 엑셀·구글 시트에서 복사한 표(탭 구분) 또는 CSV(쉼표 구분)를 읽어 파일 이름별 후보 정보로 바꾼다.
// 열 순서: 파일명, 이름, 소속그룹, 타이틀, 키, 국적, 나이 (첫 줄이 '파일명'으로 시작하면 머리글로 보고 건너뜀)

export const BULK_COLUMNS = ["파일명", "이름", "소속그룹", "타이틀", "키", "국적", "나이"] as const;

export interface BulkRow {
  name: string;
  groupName: string;
  title: string;
  heightCm: string;
  nationality: string;
  age: string;
}

/** 파일 이름 비교용 키: 확장자 제거, 유니코드 NFC(맥의 한글 파일명은 NFD), 소문자, 앞뒤 공백 제거 */
export function fileKey(fileName: string): string {
  return fileName.normalize("NFC").trim().replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

/** 따옴표로 감싼 칸("a, b")을 지원하는 한 줄 나누기 */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === "") quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseBulk(text: string): Map<string, BulkRow> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const result = new Map<string, BulkRow>();
  if (lines.length === 0) return result;
  const sep = lines[0].includes("\t") ? "\t" : ",";
  for (const [i, line] of lines.entries()) {
    const cells = splitLine(line, sep);
    if (i === 0 && cells[0]?.replace(/\s/g, "") === "파일명") continue;
    const [file, name = "", groupName = "", title = "", heightCm = "", nationality = "", age = ""] = cells;
    if (!file) continue;
    result.set(fileKey(file), {
      name,
      groupName,
      title,
      heightCm: heightCm.replace(/cm$/i, "").trim(),
      nationality,
      age: age.replace(/세$/, "").trim(),
    });
  }
  return result;
}

/** 빈 양식 CSV (엑셀에서 열 수 있게 BOM 포함) */
export function bulkTemplateCsv(fileNames: string[]): string {
  const rows = [BULK_COLUMNS.join(","), ...fileNames.map((f) => `${/[",]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f},,,,,,`)];
  return "﻿" + rows.join("\r\n") + "\r\n";
}
