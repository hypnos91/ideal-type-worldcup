import { describe, expect, it } from "vitest";
import { bulkTemplateCsv, fileKey, parseBulk, rowsToBulk } from "./bulk";

describe("fileKey", () => {
  it("확장자·대소문자·NFD 차이를 무시한다", () => {
    expect(fileKey("김민지.JPG")).toBe("김민지");
    expect(fileKey("김민지.jpg".normalize("NFD"))).toBe(fileKey("김민지.png"));
    expect(fileKey(" Photo01.webp ")).toBe("photo01");
  });
});

describe("parseBulk", () => {
  it("시트에서 복사한 탭 구분 표(머리글 포함)", () => {
    const rows = parseBulk("파일명\t이름\t소속그룹\t타이틀\t키\t국적\t나이\na.jpg\t에이\t\t배우\t170cm\t대한민국\t25세\nb\t비\t그룹B\t가수\t165\t일본\t22");
    expect(rows.get("a")).toEqual({ name: "에이", groupName: "", title: "배우", heightCm: "170", nationality: "대한민국", age: "25" });
    expect(rows.get("b")?.groupName).toBe("그룹B");
    expect(rows.size).toBe(2);
  });
  it("CSV, 따옴표 칸, BOM", () => {
    const rows = parseBulk('﻿c.png,씨,"그룹, 쉼표",모델,180,미국,30\r\n');
    expect(rows.get("c")?.groupName).toBe("그룹, 쉼표");
  });
  it("양식 CSV 를 다시 읽을 수 있다", () => {
    const rows = parseBulk(bulkTemplateCsv(["x.jpg", 'y,"z".jpg']));
    expect([...rows.keys()]).toEqual(["x", 'y,"z"']);
  });
});

describe("rowsToBulk (엑셀 파일)", () => {
  it("머리글 이름으로 열을 찾고, 숫자 칸·빈 칸·열 순서 차이를 처리한다", () => {
    const rows = rowsToBulk([
      ["이름", "파일명", "키(cm)", "소속 그룹", "직업", "국적", "나이"],
      ["이진욱", "01-이진욱.png", 184, null, "배우", "대한민국", 45],
      [null, null, null, null, null, null, null],
      ["뷔", "10-뷔.png", 179.4, "BTS", "가수", "대한민국", "30세"],
    ]);
    expect(rows.get("01-이진욱")).toEqual({ name: "이진욱", groupName: "", title: "배우", heightCm: "184", nationality: "대한민국", age: "45" });
    expect(rows.get("10-뷔")).toMatchObject({ groupName: "BTS", heightCm: "179", age: "30" });
    expect(rows.size).toBe(2);
  });
  it("머리글이 없으면 기본 열 순서", () => {
    expect(rowsToBulk([["a.png", "에이", "", "배우", 170, "일본", 20]]).get("a")?.nationality).toBe("일본");
  });
});
