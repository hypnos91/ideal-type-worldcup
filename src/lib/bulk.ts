// 대량 등록: 엑셀 파일(.xlsx), 엑셀·구글 시트에서 복사한 표(탭 구분), CSV(쉼표 구분)를 읽어 파일 이름별 후보 정보로 바꾼다.
// 기본 열 순서: 파일명, 이름, 소속그룹, 타이틀, 키, 국적, 나이
// 첫 줄이 머리글(파일명·이름 …)이면 머리글 이름으로 열을 찾으므로 열 순서가 달라도 된다.

export const BULK_COLUMNS = ["파일명", "이름", "소속그룹", "타이틀", "키", "국적", "나이"] as const;

export interface BulkRow {
  name: string;
  groupName: string;
  title: string;
  heightCm: string;
  nationality: string;
  age: string;
}

type Field = "file" | keyof BulkRow;

/** 머리글 이름 → 필드. 공백·괄호 속 단위는 지우고 비교한다(예: "키(cm)", "소속 그룹"). */
const HEADER_ALIASES: Record<string, Field> = {
  파일명: "file",
  파일: "file",
  사진: "file",
  이름: "name",
  소속그룹: "groupName",
  그룹: "groupName",
  소속: "groupName",
  타이틀: "title",
  직업: "title",
  키: "heightCm",
  국적: "nationality",
  나이: "age",
};

const POSITIONAL: Field[] = ["file", "name", "groupName", "title", "heightCm", "nationality", "age"];

function headerKey(cell: string): string {
  return cell.normalize("NFC").replace(/\(.*?\)/g, "").replace(/\s/g, "");
}

/** 파일 이름 비교용 키: 확장자 제거, 유니코드 NFC(맥의 한글 파일명은 NFD), 소문자, 앞뒤 공백 제거 */
export function fileKey(fileName: string): string {
  return fileName.normalize("NFC").trim().replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v));
  return String(v).normalize("NFC").trim();
}

/** 표(행 × 칸)를 파일 이름별 후보 정보로 바꾼다. 엑셀 파일·붙여넣기·CSV 가 모두 이 함수를 거친다. */
export function rowsToBulk(rows: unknown[][]): Map<string, BulkRow> {
  const result = new Map<string, BulkRow>();
  const nonEmpty = rows.map((r) => r.map(cellText)).filter((r) => r.some((c) => c !== ""));
  if (nonEmpty.length === 0) return result;

  let columns = POSITIONAL;
  let body = nonEmpty;
  const head = nonEmpty[0].map(headerKey);
  if (head.includes("파일명") || head.includes("이름")) {
    columns = head.map((h) => HEADER_ALIASES[h] ?? ("" as Field));
    body = nonEmpty.slice(1);
  }

  for (const cells of body) {
    const get = (f: Field) => cells[columns.indexOf(f)] ?? "";
    const file = get("file");
    if (!file) continue;
    result.set(fileKey(file), {
      name: get("name"),
      groupName: get("groupName"),
      title: get("title"),
      heightCm: get("heightCm").replace(/\s*cm$/i, ""),
      nationality: get("nationality"),
      age: get("age").replace(/\s*세$/, ""),
    });
  }
  return result;
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
  return out;
}

/** 붙여넣은 표(탭 구분) 또는 CSV 텍스트 */
export function parseBulk(text: string): Map<string, BulkRow> {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return new Map();
  const sep = lines[0].includes("\t") ? "\t" : ",";
  return rowsToBulk(lines.map((l) => splitLine(l, sep)));
}

/** 빈 양식 CSV (엑셀에서 열 수 있게 BOM 포함) */
export function bulkTemplateCsv(fileNames: string[]): string {
  const rows = [BULK_COLUMNS.join(","), ...fileNames.map((f) => `${/[",]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f},,,,,,`)];
  return "﻿" + rows.join("\r\n") + "\r\n";
}
