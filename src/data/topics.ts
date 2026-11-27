// 월드컵 주제와 후보. 사진을 쓰려면 public/ 에 넣고 image 에 경로를 적는다(초상권·저작권 확인 필수).
export interface Candidate {
  id: string;
  name: string;
  emoji: string;
  image?: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  emoji: string;
  candidates: Candidate[];
}

const c = (id: string, emoji: string, name: string): Candidate => ({ id, emoji, name });

export const TOPICS: Topic[] = [
  {
    id: "food",
    title: "음식 월드컵",
    description: "평생 하나만 먹어야 한다면?",
    emoji: "🍽️",
    candidates: [
      c("pizza", "🍕", "피자"),
      c("burger", "🍔", "햄버거"),
      c("sushi", "🍣", "초밥"),
      c("ramen", "🍜", "라멘"),
      c("chicken", "🍗", "치킨"),
      c("tteokbokki", "🌶️", "떡볶이"),
      c("bibimbap", "🍚", "비빔밥"),
      c("samgyeopsal", "🥓", "삼겹살"),
      c("pasta", "🍝", "파스타"),
      c("taco", "🌮", "타코"),
      c("curry", "🍛", "카레"),
      c("dumpling", "🥟", "만두"),
      c("steak", "🥩", "스테이크"),
      c("salad", "🥗", "샐러드"),
      c("kimbap", "🍙", "김밥"),
      c("hotpot", "🍲", "전골"),
      c("sandwich", "🥪", "샌드위치"),
      c("friedrice", "🥘", "볶음밥"),
      c("hotdog", "🌭", "핫도그"),
      c("udon", "🍥", "우동"),
    ],
  },
  {
    id: "dessert",
    title: "디저트 월드컵",
    description: "식후에 딱 하나 고른다면?",
    emoji: "🍰",
    candidates: [
      c("cake", "🍰", "케이크"),
      c("icecream", "🍦", "아이스크림"),
      c("donut", "🍩", "도넛"),
      c("cookie", "🍪", "쿠키"),
      c("chocolate", "🍫", "초콜릿"),
      c("cupcake", "🧁", "컵케이크"),
      c("pudding", "🍮", "푸딩"),
      c("bingsu", "🍧", "빙수"),
      c("croissant", "🥐", "크루아상"),
      c("waffle", "🧇", "와플"),
      c("pancake", "🥞", "팬케이크"),
      c("candy", "🍬", "사탕"),
      c("strawberry", "🍓", "딸기"),
      c("mango", "🥭", "망고"),
      c("bungeoppang", "🐟", "붕어빵"),
      c("tteok", "🍡", "떡"),
    ],
  },
  {
    id: "animal",
    title: "동물 월드컵",
    description: "같이 살고 싶은 동물은?",
    emoji: "🐾",
    candidates: [
      c("dog", "🐶", "강아지"),
      c("cat", "🐱", "고양이"),
      c("rabbit", "🐰", "토끼"),
      c("hamster", "🐹", "햄스터"),
      c("fox", "🦊", "여우"),
      c("panda", "🐼", "판다"),
      c("koala", "🐨", "코알라"),
      c("penguin", "🐧", "펭귄"),
      c("otter", "🦦", "수달"),
      c("sloth", "🦥", "나무늘보"),
      c("hedgehog", "🦔", "고슴도치"),
      c("owl", "🦉", "부엉이"),
      c("dolphin", "🐬", "돌고래"),
      c("turtle", "🐢", "거북이"),
      c("capybara", "🦫", "카피바라"),
      c("lion", "🦁", "사자"),
    ],
  },
];

export function findTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
