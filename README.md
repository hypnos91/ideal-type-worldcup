# 이상형 월드컵

둘 중 하나를 고르며 토너먼트를 진행하고, 마지막까지 남은 하나를 보여 주는 웹 게임입니다.

- 주제 선택(음식·디저트·동물)과 강수 선택(4·8·16·32강, 후보 수 이내)
- 매 대결 좌우 카드 선택, 진행도 표시, 되돌리기
- 새로고침해도 이어하기(localStorage)
- 결과: 우승자, 결승 상대, 우승까지의 길, 공유(Web Share / 클립보드)
- 키보드: `←` `→` 선택, `Backspace` 되돌리기

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 대진 로직 단위 테스트 (vitest)
npm run typecheck
npm run lint
npm run build
```

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/lib/tournament.ts` | 대진 로직(순수 함수). 상태는 `처음 대진표 + 고른 순서`만 저장하고 나머지는 `replay`로 계산 |
| `src/lib/savedGame.ts` | 진행 중인 게임 저장소(메모리 정본 + localStorage 사본) |
| `src/data/topics.ts` | 주제·후보 데이터 |
| `src/components/WorldCup.tsx` | 시작·대결·결과 화면 |

## 주제 추가

`src/data/topics.ts`의 `TOPICS`에 항목을 추가합니다. 후보 id는 주제 안에서 겹치면 안 됩니다.
사진을 쓰려면 `public/`에 넣고 후보의 `image`에 경로(예: `/candidates/foo.jpg`)를 적습니다.
실존 인물 사진은 초상권, 그 밖의 이미지는 저작권을 확인하세요.

## 배포

Vercel에서 이 저장소를 Import하면 설정 없이 배포됩니다.
