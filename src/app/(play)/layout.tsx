import PhotoBackdrop from "@/components/PhotoBackdrop";

// 사용자 화면(입장·내 월드컵·결과) 공통 배경. 레이아웃은 화면을 옮겨도 다시 그려지지 않으므로
// 입장 화면의 사진 배경이 그대로 이어서 흐른다(2026-11-28 사용자 지시).
export default function PlayLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PhotoBackdrop />
      {children}
    </>
  );
}
