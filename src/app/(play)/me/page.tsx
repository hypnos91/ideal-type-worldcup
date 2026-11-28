import type { Metadata } from "next";
import MyWorldCup from "@/components/MyWorldCup";

export const metadata: Metadata = { title: "내 이상형 월드컵" };

export default function MePage() {
  return <MyWorldCup />;
}
